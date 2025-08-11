// screens/OwnerDashboardScreen.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { navigationRef } from '../navigationRef';
import { scheduleBookingNotifications } from '../utils/notify';

const PROFILE_KEY = 'profile';
export const LISTINGS_KEY = 'owner_listings';
const BOOKINGS_KEY = 'bookings';

function sameDay(a, b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function dateKey(d){ return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function overlaps(aStart, aEnd, bStart, bEnd){ return aStart < bEnd && aEnd > bStart; }

export default function OwnerDashboardScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);

  // טווח נתונים לתרשים
  const [from, setFrom] = useState(() => { const d=new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d; });
  const [to, setTo] = useState(() => { const d=new Date(); d.setHours(23,59,59,999); return d; });
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const load = useCallback(async () => {
    const [rawP, rawL, rawB] = await Promise.all([
      AsyncStorage.getItem(PROFILE_KEY),
      AsyncStorage.getItem(LISTINGS_KEY),
      AsyncStorage.getItem(BOOKINGS_KEY),
    ]);
    setProfile(rawP ? JSON.parse(rawP) : null);

    const ls = rawL ? JSON.parse(rawL) : [];
    ls.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
    setListings(ls);

    const bs = rawB ? JSON.parse(rawB) : [];
    bs.sort((a, b) => new Date(b.start) - new Date(a.start));
    setBookings(bs);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        const data = response.notification.request.content.data;
        if (data?.bookingId) {
          navigationRef.current?.navigate('Booking', { bookingId: data.bookingId });
        } else {
          navigationRef.current?.navigate('Bookings');
        }
      } catch (e) {
        console.warn('Notification nav error', e);
      }
    });

    return () => {
      unsub();
      sub.remove();
    };
  }, [navigation, load]);

  const listingsMap = useMemo(() => {
    const m = {};
    listings.forEach(l => m[l.id] = l);
    return m;
  }, [listings]);

  const myBookingsAll = useMemo(() => {
    return bookings.filter(b => b.ownerListingId && listingsMap[b.ownerListingId]);
  }, [bookings, listingsMap]);

  // מאושרות להכנסות
  const myConfirmedInRange = useMemo(() => {
    return myBookingsAll.filter(b => {
      if (b.status !== 'confirmed') return false;
      const bs = new Date(b.start), be = new Date(b.end);
      return overlaps(bs, be, from, to);
    });
  }, [myBookingsAll, from, to]);

  const earnings = useMemo(() => {
    const now = new Date();
    let sum = 0;
    myConfirmedInRange.forEach(b => {
      if (new Date(b.end) <= now && b.status !== 'cancelled') {
        sum += (b.total || 0);
      }
    });
    return sum;
  }, [myConfirmedInRange]);

  // ======= אישורים בהמתנה =======
  const pending = useMemo(() => {
    return myBookingsAll.filter(b => b.status === 'pending');
  }, [myBookingsAll]);

  const approveBooking = useCallback(async (id) => {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex(b => b.id === id);
    if (i === -1) return;
    const updated = { ...list[i], status: 'confirmed', updatedAt: new Date().toISOString() };

    // תזמן התראות עכשיו
    try {
      const notifIds = await scheduleBookingNotifications(updated);
      updated.notificationIds = notifIds;
    } catch {}

    list[i] = updated;
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
    setBookings(list);
  }, []);

  const rejectBooking = useCallback(async (id) => {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex(b => b.id === id);
    if (i === -1) return;
    list[i] = { ...list[i], status: 'cancelled', updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
    setBookings(list);
  }, []);

  const toggleActive = async (id) => {
    const raw = await AsyncStorage.getItem(LISTINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex(x => x.id === id);
    if (i === -1) return;
    list[i] = { ...list[i], active: !list[i].active, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(list));
    setListings(list);
  };

  const removeListing = (id) => {
    Alert.alert('למחוק חניה?', undefined, [
      { text: 'בטל', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: async () => {
          const raw = await AsyncStorage.getItem(LISTINGS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const next = list.filter(x => x.id !== id);
          await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(next));
          setListings(next);
        }
      }
    ]);
  };

  // ======= תרשים פשוט לפי ימים =======
  const chartPoints = useMemo(() => {
    // סכום הכנסות לכל יום בטווח
    const map = {};
    const cursor = new Date(from);
    while (cursor <= to) {
      map[dateKey(cursor)] = 0;
      cursor.setDate(cursor.getDate()+1);
    }
    myConfirmedInRange.forEach(b => {
      const end = new Date(b.end);
      // משייכים להכנסה של יום הסיום (פשטות בדמו)
      const k = dateKey(end);
      if (map[k] != null) map[k] += (b.total || 0);
    });
    const arr = [];
    const c = new Date(from);
    while (c <= to) {
      const k = dateKey(c);
      arr.push({ label: `${c.getDate()}/${c.getMonth()+1}`, value: map[k] || 0 });
      c.setDate(c.getDate()+1);
    }
    return arr;
  }, [from, to, myConfirmedInRange]);

  const maxVal = Math.max(1, ...chartPoints.map(p => p.value));

  const renderListing = ({ item }) => {
    const thumb = Array.isArray(item.images) && item.images[0]?.uri;
    return (
      <View style={[styles.card, item.active ? styles.cardActive : null]}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={styles.title}>{item.title || 'חניה ללא שם'}</Text>
          <View style={{ flexDirection:'row', gap:10 }}>
            <TouchableOpacity onPress={() => navigation.navigate('OwnerListingForm', { id: item.id })}>
              <Ionicons name="create-outline" size={18} color="#0b6aa8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleActive(item.id)}>
              <Ionicons name={item.active ? 'toggle' : 'toggle-outline'} size={22} color={item.active ? '#0a7a3e' : '#999'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeListing(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#d33" />
            </TouchableOpacity>
          </View>
        </View>

        {!!thumb && <Image source={{ uri: thumb }} style={styles.thumb} />}

        {!!item.address && <Text style={styles.line}>כתובת: {item.address}</Text>}
        <Text style={styles.line}>מחיר לשעה: ₪{item.price || 0}</Text>
        {(item.latitude && item.longitude) && (
          <Text style={styles.line}>מיקום: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text>
        )}
        <Text style={[styles.badge, { backgroundColor: item.active ? '#e8fff2' : '#fff3f3', borderColor: item.active ? '#b9f5cf' : '#ffd1d1', color: item.active ? '#0a7a3e' : '#b33' }]}>
          {item.active ? 'פעיל' : 'כבוי'}
        </Text>

        {/* אם יש אישור ידני – תווית */}
        {item.approvalMode === 'manual' && (
          <Text style={[styles.badge, { backgroundColor:'#fff7e6', borderColor:'#ffd79a', color:'#7a4d00', marginTop:6 }]}>
            אישור ידני מופעל
          </Text>
        )}
      </View>
    );
  };

  const renderPending = ({ item }) => {
    const l = listingsMap[item.ownerListingId];
    const start = new Date(item.start);
    const end = new Date(item.end);
    const thumb = l?.images?.[0]?.uri;
    return (
      <View style={[styles.card, { borderColor:'#ffe1a8', backgroundColor:'#fffaf1' }]}>
        <View style={{ flexDirection:'row', gap:10 }}>
          {!!thumb && <Image source={{ uri: thumb }} style={styles.bookingThumb} />}
          <View style={{ flex:1 }}>
            <Text style={styles.title}>{l?.title || item.spot?.title || 'חניה'}</Text>
            {!!item.spot?.address && <Text style={styles.line}>כתובת: {item.spot.address}</Text>}
            <Text style={styles.line}>מס׳ רכב: {item.plate}{item.carDesc ? ` – ${item.carDesc}` : ''}</Text>
            <Text style={styles.line}>מ־{start.toLocaleString()} עד {end.toLocaleString()}</Text>
            <Text style={styles.line}>משך: {item.hours} שעות • סה״כ: ₪{item.total}</Text>

            <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => approveBooking(item.id)}>
                <Ionicons name="checkmark" size={16} color="#fff" style={{ marginEnd:6 }} />
                <Text style={styles.approveText}>אשר</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectBooking(item.id)}>
                <Ionicons name="close" size={16} color="#b33" style={{ marginEnd:6 }} />
                <Text style={styles.rejectText}>דחה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>לוח בקרה – בעלי חניה</Text>

      {/* טווח לנתונים */}
      <View style={styles.card}>
        <Text style={styles.title}>סטטיסטיקות</Text>
        <View style={{ flexDirection:'row', gap:8, alignItems:'center', marginTop:6 }}>
          <TouchableOpacity style={styles.rangeBtn} onPress={() => { const d=new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); setFrom(d); const e=new Date(); e.setHours(23,59,59,999); setTo(e); }}>
            <Text style={styles.rangeBtnText}>7 ימים</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rangeBtn} onPress={() => { const d=new Date(); d.setDate(d.getDate()-29); d.setHours(0,0,0,0); setFrom(d); const e=new Date(); e.setHours(23,59,59,999); setTo(e); }}>
            <Text style={styles.rangeBtnText}>30 ימים</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rangeBtn} onPress={() => { const d=new Date(); d.setMonth(d.getMonth()-3); d.setHours(0,0,0,0); setFrom(d); const e=new Date(); e.setHours(23,59,59,999); setTo(e); }}>
            <Text style={styles.rangeBtnText}>90 ימים</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection:'row', gap:10, marginTop:8 }}>
          <TouchableOpacity style={styles.datePick} onPress={() => setShowFrom(true)}>
            <Ionicons name="calendar" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
            <Text style={styles.datePickText}>מ־{from.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePick} onPress={() => setShowTo(true)}>
            <Ionicons name="calendar" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
            <Text style={styles.datePickText}>עד {to.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        {showFrom && (
          <DateTimePicker
            value={from}
            mode="date"
            onChange={(_, d) => { setShowFrom(false); if (d) { d.setHours(0,0,0,0); setFrom(d); } }}
          />
        )}
        {showTo && (
          <DateTimePicker
            value={to}
            mode="date"
            onChange={(_, d) => { setShowTo(false); if (d) { d.setHours(23,59,59,999); setTo(d); } }}
          />
        )}

        <Text style={[styles.line, { marginTop:6 }]}><Text style={{ fontWeight:'800' }}>סה״כ הכנסות בטווח:</Text> ₪{earnings}</Text>

        {/* תרשים עמודות קטן (ללא ספריות חיצוניות) */}
        <View style={styles.chartRow}>
          {chartPoints.map((p, i) => {
            const h = Math.round((p.value / maxVal) * 80); // 0..80px
            return (
              <View key={`${p.label}-${i}`} style={styles.barWrap}>
                <View style={[styles.bar, { height: Math.max(2, h) }]} />
                <Text style={styles.barLabel}>{p.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* אזור אישורים בהמתנה */}
      <Text style={styles.sectionHeader}>בקשות בהמתנה</Text>
      <FlatList
        data={pending}
        keyExtractor={i => i.id}
        renderItem={renderPending}
        ListEmptyComponent={<Text style={{ color:'#666', textAlign:'center', marginTop:8 }}>אין בקשות בהמתנה.</Text>}
        contentContainerStyle={{ paddingBottom:12 }}
      />

      <View style={{ flexDirection:'row', gap:10, marginBottom:10 }}>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('OwnerListingForm')}>
          <Ionicons name="add" size={18} color="#fff" style={{ marginEnd:6 }} />
          <Text style={styles.addBtnText}>הוסף חניה</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>החניות שלי</Text>
      <FlatList
        data={listings}
        keyExtractor={i => i.id}
        renderItem={renderListing}
        ListEmptyComponent={<Text style={{ color:'#666', textAlign:'center', marginTop:8 }}>אין עדיין חניות. לחץ "הוסף חניה".</Text>}
        contentContainerStyle={{ paddingBottom:24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#f6f9fc', padding:14 },
  header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:12 },
  sectionHeader:{ fontSize:16, fontWeight:'800', marginBottom:6, marginTop:4, color:'#0b6aa8' },

  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:'#ecf1f7' },
  cardActive:{ borderColor:'#b9f5cf', backgroundColor:'#f7fffb' },

  title:{ fontSize:16, fontWeight:'800', marginBottom:6 },
  line:{ fontSize:14, color:'#333', marginVertical:2 },

  addBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#00C6FF', paddingVertical:12, borderRadius:10, paddingHorizontal:14 },
  addBtnText:{ color:'#fff', fontWeight:'800' },

  badge:{ marginTop:8, alignSelf:'flex-start', borderWidth:1, borderRadius:8, paddingHorizontal:8, paddingVertical:4, fontWeight:'700' },

  thumb:{ width:'100%', height:160, borderRadius:10, marginBottom:8 },
  bookingThumb:{ width:84, height:84, borderRadius:10 },

  // אישורים
  approveBtn:{ backgroundColor:'#0a7a3e', paddingVertical:10, paddingHorizontal:12, borderRadius:10, flexDirection:'row', alignItems:'center' },
  approveText:{ color:'#fff', fontWeight:'800' },
  rejectBtn:{ backgroundColor:'#fff', paddingVertical:10, paddingHorizontal:12, borderRadius:10, borderWidth:1, borderColor:'#ffd1d1', flexDirection:'row', alignItems:'center' },
  rejectText:{ color:'#b33', fontWeight:'800' },

  // בוררי טווח
  rangeBtn:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:'#cfe3ff', backgroundColor:'#eaf4ff' },
  rangeBtnText:{ color:'#0b6aa8', fontWeight:'800' },
  datePick:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fff', flexDirection:'row', alignItems:'center' },
  datePickText:{ color:'#0b6aa8', fontWeight:'700' },

  // תרשים קטן
  chartRow:{ flexDirection:'row', gap:6, alignItems:'flex-end', marginTop:10, paddingTop:6, borderTopWidth:1, borderTopColor:'#f1f4f8' },
  barWrap:{ alignItems:'center', width:24 },
  bar:{ width:16, backgroundColor:'#00C6FF', borderRadius:6 },
  barLabel:{ fontSize:10, color:'#555', marginTop:4 },
});

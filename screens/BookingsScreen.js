// screens/BookingsScreen.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { scheduleBookingNotifications, cancelBookingNotifications } from '../utils/notify';

const BOOKINGS_KEY = 'bookings';
const VEHICLES_KEY = 'vehicles';

function paymentLabel(key) {
  switch (key) {
    case 'paypal': return 'PayPal';
    case 'applepay': return 'Apple Pay';
    case 'card':
    default: return 'כרטיס אשראי';
  }
}
function msToHhMmSs(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

export default function BookingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [vehiclesMap, setVehiclesMap] = useState({});
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rawB, rawV] = await Promise.all([
        AsyncStorage.getItem(BOOKINGS_KEY),
        AsyncStorage.getItem(VEHICLES_KEY),
      ]);
      const list = rawB ? JSON.parse(rawB) : [];
      list.sort((a, b) => new Date(b.start) - new Date(a.start));
      setBookings(list);

      const vs = rawV ? JSON.parse(rawV) : [];
      const map = {};
      vs.forEach(v => { map[v.id] = v; });
      setVehiclesMap(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const extend = useCallback(async (id, mins) => {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex(b => b.id === id);
    if (i === -1) return;

    // אי אפשר להאריך אם לא מאושר
    if (list[i].status !== 'confirmed') {
      Alert.alert('לא ניתן להאריך', 'אפשר להאריך רק הזמנה מאושרת.');
      return;
    }

    if (list[i].notificationIds) {
      try { await cancelBookingNotifications(list[i].notificationIds); } catch {}
    }

    const nextEnd = new Date(list[i].end);
    nextEnd.setTime(nextEnd.getTime() + mins * 60 * 1000);

    const diffMs = nextEnd - new Date(list[i].start);
    const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const total = hours * (list[i].spot?.price || 10);

    const updated = { ...list[i], end: nextEnd.toISOString(), hours, total, updatedAt: new Date().toISOString() };

    try {
      const notifIds = await scheduleBookingNotifications(updated);
      updated.notificationIds = notifIds;
    } catch {}

    list[i] = updated;
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
    setBookings(list);
  }, []);

  const removeBooking = useCallback((id) => {
    Alert.alert('למחוק הזמנה?', undefined, [
      { text: 'בטל', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: async () => {
          const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const b = list.find(x => x.id === id);
          if (b?.notificationIds) {
            try { await cancelBookingNotifications(b.notificationIds); } catch {}
          }
          const next = list.filter(x => x.id !== id);
          await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(next));
          setBookings(next);
        }
      }
    ]);
  }, []);

  const renderItem = ({ item }) => {
    const now = new Date();
    const start = new Date(item.start);
    const end = new Date(item.end);
    const isActive = start <= now && now < end;
    const left = isActive ? msToHhMmSs(end - now) : null;

    let vehicleText = '';
    if (item.vehicleId && vehiclesMap[item.vehicleId]) {
      const v = vehiclesMap[item.vehicleId];
      vehicleText = v.desc ? `${v.plate} – ${v.desc}` : v.plate;
    } else if (item.plate) {
      vehicleText = item.carDesc ? `${item.plate} – ${item.carDesc}` : item.plate;
    }

    const pending = item.status === 'pending';
    const cancelled = item.status === 'cancelled';

    return (
      <View style={[styles.card, isActive && styles.cardActive]}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={styles.title}>{item.spot?.title || 'חניה'}</Text>
          <TouchableOpacity onPress={() => removeBooking(item.id)}>
            <Ionicons name="trash-outline" size={18} color="#d33" />
          </TouchableOpacity>
        </View>

        {!!item.spot?.address && <Text style={styles.line}>כתובת: {item.spot.address}</Text>}
        {!!vehicleText && <Text style={styles.line}>רכב: {vehicleText}</Text>}
        <Text style={styles.line}>תשלום: {paymentLabel(item.paymentMethod)}</Text>

        <Text style={styles.line}>
          מ־{dayjs(start).format('DD/MM/YYYY HH:mm')} עד {dayjs(end).format('DD/MM/YYYY HH:mm')}
        </Text>
        <Text style={styles.line}>משך: {item.hours} שעות • סה״כ: ₪{item.total}</Text>

        <View style={{ flexDirection:'row', gap:8, marginTop:6 }}>
          {pending && <Text style={[styles.badge, { backgroundColor:'#fff7e6', borderColor:'#ffd79a', color:'#7a4d00' }]}>ממתין לאישור</Text>}
          {cancelled && <Text style={[styles.badge, { backgroundColor:'#fff3f3', borderColor:'#ffd1d1', color:'#b33' }]}>בוטל</Text>}
          {item.status === 'confirmed' && <Text style={[styles.badge, { backgroundColor:'#e8fff2', borderColor:'#b9f5cf', color:'#0a7a3e' }]}>מאושר</Text>}
        </View>

        {isActive && item.status === 'confirmed' && (
          <View style={styles.activeRow}>
            <Text style={styles.activeText}>פעיל עכשיו • נותר: {left}</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity style={styles.extendBtn} onPress={() => extend(item.id, 30)}>
                <Text style={styles.extendBtnText}>+30 דק׳</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.extendBtn} onPress={() => extend(item.id, 60)}>
                <Text style={styles.extendBtnText}>+60 דק׳</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation.navigate('Booking', {
              spot: item.spot,
              bookingId: item.id,
              initialStart: item.start,
              initialEnd: item.end,
            })}
          >
            <Text style={styles.outlineBtnText}>ערוך הזמנה</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('SearchResults', { coords: { latitude: item.spot?.latitude, longitude: item.spot?.longitude } })}
          >
            <Text style={styles.secondaryBtnText}>פתח במפה</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const empty = (
    <View style={styles.empty}>
      <Ionicons name="car-sport" size={28} color="#9ab7d6" />
      <Text style={{ color:'#6992b8', marginTop:6 }}>אין עדיין הזמנות.</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={!loading && empty}
        contentContainerStyle={{ padding:14, paddingBottom:24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C6FF" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#f6f9fc' },

  card:{
    backgroundColor:'#fff',
    borderRadius:14,
    padding:14,
    marginBottom:12,
    shadowColor:'#000',
    shadowOpacity:0.06,
    shadowRadius:8,
    shadowOffset:{ width:0, height:3 },
    elevation:2,
    borderWidth:1,
    borderColor:'#ecf1f7',
  },
  cardActive:{ borderColor:'#b9f5cf', backgroundColor:'#f7fffb' },

  title:{ fontSize:16, fontWeight:'800', marginBottom:4 },
  line:{ fontSize:14, color:'#333', marginTop:2 },

  activeRow:{ marginTop:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  activeText:{ color:'#0a7a3e', fontWeight:'700' },
  extendBtn:{ paddingVertical:8, paddingHorizontal:10, backgroundColor:'#dff9ec', borderRadius:10, borderWidth:1, borderColor:'#b9f5cf' },
  extendBtnText:{ color:'#0a7a3e', fontWeight:'700' },

  outlineBtn:{ flex:1, paddingVertical:12, borderRadius:10, borderWidth:1, borderColor:'#00C6FF', alignItems:'center', backgroundColor:'#fff' },
  outlineBtnText:{ color:'#00C6FF', fontWeight:'800' },

  secondaryBtn:{ flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#eaf4ff', alignItems:'center', borderWidth:1, borderColor:'#cfe3ff' },
  secondaryBtnText:{ color:'#0b6aa8', fontWeight:'800' },

  empty:{ alignItems:'center', paddingTop:40 },

  badge:{ alignSelf:'flex-start', borderWidth:1, borderRadius:8, paddingHorizontal:8, paddingVertical:4, fontWeight:'700', fontSize:12 },
});

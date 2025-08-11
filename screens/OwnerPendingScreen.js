// screens/OwnerPendingScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { scheduleBookingNotifications } from '../utils/notify';

const LISTINGS_KEY = 'owner_listings';
const BOOKINGS_KEY  = 'bookings';

export default function OwnerPendingScreen() {
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);

  const load = useCallback( async () => {
    const [rawL, rawB] = await Promise.all([
      AsyncStorage.getItem(LISTINGS_KEY),
      AsyncStorage.getItem(BOOKINGS_KEY),
    ]);
    setListings(rawL ? JSON.parse(rawL) : []);
    const bs = rawB ? JSON.parse(rawB) : [];
    bs.sort((a,b)=> new Date(b.start)-new Date(a.start));
    setBookings(bs);
  }, []);

  useEffect(() => { load(); }, [load]);

  const listingsMap = useMemo(() => {
    const m = {}; listings.forEach(l=> m[l.id]=l); return m;
  }, [listings]);

  const pending = useMemo(() => bookings.filter(b => b.ownerListingId && b.status==='pending'), [bookings]);

  const approve = useCallback(async (id) => {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex(b => b.id === id);
    if (i === -1) return;
    const updated = { ...list[i], status:'confirmed', updatedAt: new Date().toISOString() };
    try {
      const ids = await scheduleBookingNotifications(updated);
      updated.notificationIds = ids;
    } catch {}
    list[i] = updated;
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
    setBookings(list);
  }, []);

  const reject = useCallback(async (id) => {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex(b => b.id === id);
    if (i === -1) return;
    list[i] = { ...list[i], status:'cancelled', updatedAt:new Date().toISOString() };
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
    setBookings(list);
  }, []);

  const renderItem = ({ item }) => {
    const l = listingsMap[item.ownerListingId];
    const thumb = l?.images?.[0]?.uri;
    const s = new Date(item.start), e = new Date(item.end);

    return (
      <View style={[styles.card, { borderColor:'#ffe1a8', backgroundColor:'#fffaf1' }]}>
        <View style={{ flexDirection:'row', gap:10 }}>
          {!!thumb && <Image source={{ uri: thumb }} style={styles.thumb} />}
          <View style={{ flex:1 }}>
            <Text style={styles.title}>{l?.title || item.spot?.title || 'חניה'}</Text>
            {!!item.spot?.address && <Text style={styles.line}>כתובת: {item.spot.address}</Text>}
            <Text style={styles.line}>מס׳ רכב: {item.plate}{item.carDesc ? ` – ${item.carDesc}` : ''}</Text>
            <Text style={styles.line}>מ־{s.toLocaleString()} עד {e.toLocaleString()}</Text>
            <Text style={styles.line}>משך: {item.hours} שעות • סה״כ: ₪{item.total}</Text>

            <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => approve(item.id)}>
                <Ionicons name="checkmark" size={16} color="#fff" style={{ marginEnd:6 }} />
                <Text style={styles.approveText}>אשר</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item.id)}>
                <Ionicons name="close" size={16} color="#b33" style={{ marginEnd:6 }} />
                <Text style={styles.rejectText}>דחה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const empty = (
    <View style={{ padding:18, alignItems:'center' }}>
      <Ionicons name="checkmark-done-circle-outline" size={28} color="#9ab7d6" />
      <Text style={{ color:'#6992b8', marginTop:6 }}>אין בקשות בהמתנה.</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>בקשות בהמתנה</Text>
      <FlatList
        data={pending}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        ListEmptyComponent={empty}
        contentContainerStyle={{ padding:14, paddingBottom:24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#f6f9fc' },
  header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginVertical:12 },

  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, borderWidth:1 },
  title:{ fontSize:16, fontWeight:'800', marginBottom:6 },
  line:{ fontSize:14, color:'#333', marginVertical:2 },

  thumb:{ width:84, height:84, borderRadius:10 },

  approveBtn:{ backgroundColor:'#0a7a3e', paddingVertical:10, paddingHorizontal:12, borderRadius:10, flexDirection:'row', alignItems:'center' },
  approveText:{ color:'#fff', fontWeight:'800' },
  rejectBtn:{ backgroundColor:'#fff', paddingVertical:10, paddingHorizontal:12, borderRadius:10, borderWidth:1, borderColor:'#ffd1d1', flexDirection:'row', alignItems:'center' },
  rejectText:{ color:'#b33', fontWeight:'800' },
});

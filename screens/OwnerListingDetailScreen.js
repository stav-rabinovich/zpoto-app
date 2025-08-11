// screens/OwnerListingDetailScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const LISTINGS_KEY = 'owner_listings';
const BOOKINGS_KEY  = 'bookings';

function dateKey(d){ return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function overlaps(aStart, aEnd, bStart, bEnd){ return aStart < bEnd && aEnd > bStart; }

export default function OwnerListingDetailScreen({ route, navigation }) {
  const listingId = route?.params?.id;
  const [listing, setListing] = useState(null);
  const [bookings, setBookings] = useState([]);

  const [from, setFrom] = useState(() => { const d=new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d; });
  const [to, setTo] = useState(() => { const d=new Date(); d.setHours(23,59,59,999); return d; });
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const load = useCallback(async () => {
    const [rawL, rawB] = await Promise.all([
      AsyncStorage.getItem(LISTINGS_KEY),
      AsyncStorage.getItem(BOOKINGS_KEY),
    ]);
    const ls = rawL ? JSON.parse(rawL) : [];
    setListing(ls.find(x => x.id === listingId) || null);

    const bs = rawB ? JSON.parse(rawB) : [];
    bs.sort((a,b)=>new Date(b.start)-new Date(a.start));
    setBookings(bs);
  }, [listingId]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const myBookings = useMemo(() => bookings.filter(b => b.ownerListingId === listingId), [bookings, listingId]);
  const confirmedInRange = useMemo(() => {
    return myBookings.filter(b => {
      if (b.status !== 'confirmed') return false;
      const s = new Date(b.start), e = new Date(b.end);
      return overlaps(s,e,from,to);
    });
  }, [myBookings, from, to]);

  const totals = useMemo(() => {
    const income = confirmedInRange.reduce((sum,b)=> sum + (b.total||0), 0);
    return { income, count: confirmedInRange.length };
  }, [confirmedInRange]);

  const chart = useMemo(() => {
    const map = {};
    const cur = new Date(from);
    while (cur <= to) { map[dateKey(cur)] = 0; cur.setDate(cur.getDate()+1); }
    confirmedInRange.forEach(b => {
      const k = dateKey(new Date(b.end));
      if (map[k] != null) map[k] += (b.total||0);
    });
    const arr = [];
    const c = new Date(from);
    while (c <= to) {
      const k = dateKey(c);
      arr.push({ label: `${c.getDate()}/${c.getMonth()+1}`, value: map[k]||0 });
      c.setDate(c.getDate()+1);
    }
    return arr;
  }, [from, to, confirmedInRange]);

  const maxVal = Math.max(1, ...chart.map(p=>p.value));

  const renderBooking = ({ item }) => {
    const s = new Date(item.start), e = new Date(item.end);
    return (
      <View style={styles.bCard}>
        <Text style={styles.bTitle}>{item.spot?.title || 'חניה'}</Text>
        {!!item.spot?.address && <Text style={styles.line}>כתובת: {item.spot.address}</Text>}
        <Text style={styles.line}>מ־{s.toLocaleString()} עד {e.toLocaleString()}</Text>
        <Text style={styles.line}>משך: {item.hours} שעות • סה״כ: ₪{item.total}</Text>
        <Text style={[styles.badge, { backgroundColor: item.status==='confirmed' ? '#e8fff2' : (item.status==='pending' ? '#fff7e6' : '#fff3f3'),
          borderColor: item.status==='confirmed' ? '#b9f5cf' : (item.status==='pending' ? '#ffd79a' : '#ffd1d1'),
          color: item.status==='confirmed' ? '#0a7a3e' : (item.status==='pending' ? '#7a4d00' : '#b33') }]}
        >
          {item.status==='confirmed'?'מאושר': item.status==='pending'?'ממתין':'בוטל'}
        </Text>
      </View>
    );
  };

  const thumb = listing?.images?.[0]?.uri;

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>דוח חניה</Text>

      {listing ? (
        <View style={styles.card}>
          {!!thumb && <Image source={{ uri: thumb }} style={styles.hero} />}
          <Text style={styles.title}>{listing.title || listing.address || 'חניה'}</Text>
          {!!listing.address && <Text style={styles.line}>כתובת: {listing.address}</Text>}
          <Text style={styles.line}>מחיר לשעה: ₪{listing.price || 0}</Text>
          {typeof listing.latitude === 'number' && typeof listing.longitude === 'number' && (
            <Text style={styles.line}>מיקום: {listing.latitude.toFixed(5)}, {listing.longitude.toFixed(5)}</Text>
          )}

          <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
            <TouchableOpacity style={styles.rangeBtn} onPress={() => { const d=new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); setFrom(d); const e=new Date(); e.setHours(23,59,59,999); setTo(e); }}>
              <Text style={styles.rangeBtnText}>7 ימים</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rangeBtn} onPress={() => { const d=new Date(); d.setDate(d.getDate()-29); d.setHours(0,0,0,0); setFrom(d); const e=new Date(); e.setHours(23,59,59,999); setTo(e); }}>
              <Text style={styles.rangeBtnText}>30 ימים</Text>
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
            <DateTimePicker value={from} mode="date" onChange={(_,d)=>{ setShowFrom(false); if(d){ d.setHours(0,0,0,0); setFrom(d);} }} />
          )}
          {showTo && (
            <DateTimePicker value={to} mode="date" onChange={(_,d)=>{ setShowTo(false); if(d){ d.setHours(23,59,59,999); setTo(d);} }} />
          )}

          <Text style={[styles.line, { marginTop:6 }]}><Text style={{ fontWeight:'800' }}>סה״כ הכנסות בטווח:</Text> ₪{totals.income}</Text>

          <View style={styles.chartRow}>
            {chart.map((p,i)=>{
              const h = Math.round((p.value/Math.max(1,...chart.map(x=>x.value)))*80);
              return (
                <View key={`${p.label}-${i}`} style={styles.barWrap}>
                  <View style={[styles.bar,{ height: Math.max(2,h)}]} />
                  <Text style={styles.barLabel}>{p.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.card}><Text>החניה לא נמצאה.</Text></View>
      )}

      <Text style={styles.section}>הזמנות רלוונטיות</Text>
      <FlatList
        data={myBookings}
        keyExtractor={i=>i.id}
        renderItem={renderBooking}
        contentContainerStyle={{ paddingBottom:24 }}
        ListEmptyComponent={<Text style={{ color:'#666', textAlign:'center', marginTop:8 }}>אין הזמנות.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#f6f9fc', padding:14 },
  header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:12 },

  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:'#ecf1f7' },
  title:{ fontSize:16, fontWeight:'800', marginBottom:6 },
  line:{ fontSize:14, color:'#333', marginVertical:2 },

  hero:{ width:'100%', height:160, borderRadius:10, marginBottom:8 },

  rangeBtn:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:'#cfe3ff', backgroundColor:'#eaf4ff' },
  rangeBtnText:{ color:'#0b6aa8', fontWeight:'800' },
  datePick:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fff', flexDirection:'row', alignItems:'center' },
  datePickText:{ color:'#0b6aa8', fontWeight:'700' },

  chartRow:{ flexDirection:'row', gap:6, alignItems:'flex-end', marginTop:10, paddingTop:6, borderTopWidth:1, borderTopColor:'#f1f4f8' },
  barWrap:{ alignItems:'center', width:24 },
  bar:{ width:16, backgroundColor:'#00C6FF', borderRadius:6 },
  barLabel:{ fontSize:10, color:'#555', marginTop:4 },

  section:{ fontSize:16, fontWeight:'800', marginBottom:6, marginTop:4, color:'#0b6aa8' },

  bCard:{ backgroundColor:'#fff', borderRadius:12, padding:12, marginBottom:10, borderWidth:1, borderColor:'#ecf1f7' },
  bTitle:{ fontSize:15, fontWeight:'800', marginBottom:4 },
  badge:{ marginTop:6, alignSelf:'flex-start', borderWidth:1, borderRadius:8, paddingHorizontal:8, paddingVertical:4, fontWeight:'700' },
});

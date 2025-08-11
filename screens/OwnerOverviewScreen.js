// screens/OwnerOverviewScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const LISTINGS_KEY = 'owner_listings';
const BOOKINGS_KEY = 'bookings';

function dateKey(d){ return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function overlaps(aStart, aEnd, bStart, bEnd){ return aStart < bEnd && aEnd > bStart; }

export default function OwnerOverviewScreen({ navigation }) {
  const [listings, setListings] = useState([]);
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
    setListings(rawL ? JSON.parse(rawL) : []);
    const bs = rawB ? JSON.parse(rawB) : [];
    bs.sort((a,b)=>new Date(b.start)-new Date(a.start));
    setBookings(bs);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const myBookings = useMemo(() => {
    const ids = new Set(listings.map(l=>l.id));
    return bookings.filter(b => b.ownerListingId && ids.has(b.ownerListingId));
  }, [bookings, listings]);

  const inRangeConfirmed = useMemo(() => {
    return myBookings.filter(b => {
      if (b.status !== 'confirmed') return false;
      const s = new Date(b.start), e = new Date(b.end);
      return overlaps(s,e,from,to);
    });
  }, [myBookings, from, to]);

  const totals = useMemo(() => {
    const income = inRangeConfirmed.reduce((sum,b)=> sum + (b.total||0), 0);
    const count  = inRangeConfirmed.length;
    const byListing = {};
    inRangeConfirmed.forEach(b => {
      byListing[b.ownerListingId] = (byListing[b.ownerListingId]||0) + (b.total||0);
    });
    return { income, count, byListing };
  }, [inRangeConfirmed]);

  const chart = useMemo(() => {
    const map = {};
    const cur = new Date(from);
    while (cur <= to) { map[dateKey(cur)] = 0; cur.setDate(cur.getDate()+1); }
    inRangeConfirmed.forEach(b => {
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
  }, [from, to, inRangeConfirmed]);

  const maxVal = Math.max(1, ...chart.map(p=>p.value));

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>סקירה כללית – בעלי חניה</Text>

      <View style={styles.card}>
        <Text style={styles.title}>טווח נתונים</Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>סיכום</Text>
        <Text style={styles.line}>סה״כ הכנסות בטווח: <Text style={styles.bold}>₪{totals.income}</Text></Text>
        <Text style={styles.line}>מס׳ הזמנות מאושרות: <Text style={styles.bold}>{totals.count}</Text></Text>

        <View style={styles.chartRow}>
          {chart.map((p,i)=>{
            const h = Math.round((p.value/maxVal)*80);
            return (
              <View key={`${p.label}-${i}`} style={styles.barWrap}>
                <View style={[styles.bar, { height: Math.max(2,h) }]} />
                <Text style={styles.barLabel}>{p.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection:'row', gap:10 }}>
        <TouchableOpacity style={styles.navBtn} onPress={()=> navigation.navigate('OwnerPending')}>
          <Ionicons name="timer" size={16} color="#fff" style={{ marginEnd:6 }} />
          <Text style={styles.navBtnText}>בקשות בהמתנה</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtnOutline} onPress={()=> navigation.navigate('OwnerDashboard')}>
          <Text style={styles.navBtnOutlineText}>ניהול החניות</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={[styles.title, { marginBottom:6 }]}>חניות – קפיצה לדוח</Text>
        {listings.length === 0 ? (
          <Text style={{ color:'#666' }}>אין חניות. צור חניה חדשה במסך "ניהול החניות".</Text>
        ) : (
          listings.map(l => (
            <TouchableOpacity key={l.id} style={styles.listingRow} onPress={() => navigation.navigate('OwnerListingDetail', { id: l.id })}>
              <Text style={styles.listingTitle}>{l.title || l.address || 'חניה'}</Text>
              <Ionicons name="chevron-back" size={18} color="#0b6aa8" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#f6f9fc', padding:14 },
  header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:12 },

  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:'#ecf1f7' },
  title:{ fontSize:16, fontWeight:'800' },
  line:{ fontSize:14, marginTop:6, color:'#333' },
  bold:{ fontWeight:'800' },

  rangeBtn:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:'#cfe3ff', backgroundColor:'#eaf4ff' },
  rangeBtnText:{ color:'#0b6aa8', fontWeight:'800' },
  datePick:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fff', flexDirection:'row', alignItems:'center' },
  datePickText:{ color:'#0b6aa8', fontWeight:'700' },

  chartRow:{ flexDirection:'row', gap:6, alignItems:'flex-end', marginTop:10, paddingTop:6, borderTopWidth:1, borderTopColor:'#f1f4f8' },
  barWrap:{ alignItems:'center', width:24 },
  bar:{ width:16, backgroundColor:'#00C6FF', borderRadius:6 },
  barLabel:{ fontSize:10, color:'#555', marginTop:4 },

  navBtn:{ flex:1, backgroundColor:'#00C6FF', paddingVertical:12, borderRadius:10, alignItems:'center', flexDirection:'row', justifyContent:'center' },
  navBtnText:{ color:'#fff', fontWeight:'800' },
  navBtnOutline:{ flex:1, backgroundColor:'#fff', paddingVertical:12, borderRadius:10, borderWidth:1, borderColor:'#00C6FF', alignItems:'center' },
  navBtnOutlineText:{ color:'#00C6FF', fontWeight:'800' },

  listingRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderTopWidth:1, borderTopColor:'#f1f4f8' },
  listingTitle:{ fontSize:15, fontWeight:'700', color:'#0b6aa8' },
});

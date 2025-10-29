// screens/OwnerListingDetailScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { getOwnerParkings, getOwnerBookings, updateBookingStatus, getBookingsByStatus, sortBookingsByDate, formatCurrency } from '../services/api/owner';
import { getStatusText, getStatusColor, formatBookingDate } from '../services/api/bookings';
import { setTimeInIsrael } from '../utils/timezone';

const LISTINGS_KEY = 'owner_listings';
const BOOKINGS_KEY  = 'bookings';

function dateKey(d){ return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function overlaps(aStart, aEnd, bStart, bEnd){ return aStart < bEnd && aEnd > bStart; }

export default function OwnerListingDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { isAuthenticated } = useAuth();

  const parkingId = route?.params?.id || route?.params?.parkingId;
  const [parking, setParking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרות ידניות
  const [from, setFrom] = useState(() => { 
    const d = new Date(); 
    const sixDaysAgo = new Date(d.getTime() - (6 * 24 * 60 * 60 * 1000));
    return setTimeInIsrael(sixDaysAgo, 0, 0); 
  });
  const [to, setTo] = useState(() => { 
    const d = new Date(); 
    return setTimeInIsrael(d, 23, 59); 
  });
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const load = useCallback(async () => {
    if (!parkingId || !isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [parkingsResult, bookingsResult] = await Promise.all([
        getOwnerParkings(),
        getOwnerBookings(),
      ]);

      // טעינת החניה
      if (parkingsResult.success) {
        const p = parkingsResult.data.find(x => x.id === parseInt(parkingId)) || null;
        setParking(p);
      } else {
        console.error('Failed to load parkings:', parkingsResult.error);
        setParking(null);
      }

      // טעינת הזמנות
      if (bookingsResult.success) {
        const sortedBookings = sortBookingsByDate(bookingsResult.data);
        setBookings(sortedBookings);
      } else {
        console.error('Failed to load bookings:', bookingsResult.error);
        setBookings([]);
      }
    } catch (error) {
      console.error('Load error:', error);
      setParking(null);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [parkingId, isAuthenticated]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const myBookings = useMemo(() => bookings.filter(b => b.parkingId === parseInt(parkingId)), [bookings, parkingId]);
  const confirmedInRange = useMemo(() => {
    return myBookings.filter(b => {
      if (b.status !== 'CONFIRMED') return false;
      const s = new Date(b.startTime), e = new Date(b.endTime);
      return overlaps(s,e,from,to);
    });
  }, [myBookings, from, to]);

  const totals = useMemo(() => {
    const income = confirmedInRange.reduce((sum,b)=> sum + ((b.totalPriceCents||0) / 100), 0);
    return { income, count: confirmedInRange.length };
  }, [confirmedInRange]);

  const chart = useMemo(() => {
    const map = {};
    let cur = new Date(from);
    // 🔧 תוקן: משתמש בחישוב מילישניות במקום המרה ידנית
    while (cur <= to) { 
      map[dateKey(cur)] = 0; 
      cur = new Date(cur.getTime() + (24 * 60 * 60 * 1000)); // הוסף יום
    }
    confirmedInRange.forEach(b => {
      const k = dateKey(new Date(b.endTime));
      if (map[k] != null) map[k] += ((b.totalPriceCents||0) / 100);
    });
    const arr = [];
    let c = new Date(from);
    while (c <= to) {
      const k = dateKey(c);
      arr.push({ label: `${c.getDate()}/${c.getMonth()+1}`, value: map[k]||0 });
      // 🔧 תוקן: משתמש בחישוב מילישניות במקום המרה ידנית
      c = new Date(c.getTime() + (24 * 60 * 60 * 1000)); // הוסף יום
    }
    return arr;
  }, [from, to, confirmedInRange]);

  const maxVal = Math.max(1, ...chart.map(p=>p.value));

  const renderBooking = ({ item }) => {
    const s = new Date(item.startTime), e = new Date(item.endTime);
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusText(item.status);
    const hours = Math.ceil((e - s) / (1000 * 60 * 60));
    const total = (item.totalPriceCents || 0) / 100;
    
    return (
      <View style={styles.bCard}>
        <View style={styles.bHeader}>
          <Text style={styles.bTitle} numberOfLines={1}>{item.user?.email || 'משתמש'}</Text>
          <Text
            style={[
              styles.statusPill,
              { backgroundColor: statusColor + '20', color: statusColor }
            ]}
          >
            {statusText}
          </Text>
        </View>

        <Text style={styles.line}>מ־{formatBookingDate(item.startTime)} עד {formatBookingDate(item.endTime)}</Text>
        <Text style={styles.line}>משך: {hours} שעות • סה״כ: {formatCurrency(total)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>דוח חניה</Text>

      {parking ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="business-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.title}>{parking.title || parking.address || 'חניה'}</Text>
          </View>

          {!!parking.address && <Text style={styles.line}>כתובת: {parking.address}</Text>}
          <Text style={styles.line}>מחיר לשעה: {formatCurrency(parking.priceHr || 0)}</Text>
          {typeof parking.lat === 'number' && typeof parking.lng === 'number' && (
            <Text style={styles.line}>מיקום: {parking.lat.toFixed(5)}, {parking.lng.toFixed(5)}</Text>
          )}

          {/* טווחים מהירים */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.rangeBtn}
              onPress={() => { 
                // 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרות ידניות
                const d = new Date(); 
                const sixDaysAgo = new Date(d.getTime() - (6 * 24 * 60 * 60 * 1000));
                setFrom(setTimeInIsrael(sixDaysAgo, 0, 0)); 
                setTo(setTimeInIsrael(d, 23, 59)); 
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.rangeBtnText}>7 ימים</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rangeBtn}
              onPress={() => { 
                // 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרות ידניות
                const d = new Date(); 
                const thirtyDaysAgo = new Date(d.getTime() - (29 * 24 * 60 * 60 * 1000));
                setFrom(setTimeInIsrael(thirtyDaysAgo, 0, 0)); 
                setTo(setTimeInIsrael(d, 23, 59)); 
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.rangeBtnText}>30 ימים</Text>
            </TouchableOpacity>
          </View>

          {/* בחירת תאריכים */}
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.datePick} onPress={() => setShowFrom(true)} activeOpacity={0.9}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} style={{ marginEnd:6 }} />
              <Text style={styles.datePickText}>מ־{from.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.datePick} onPress={() => setShowTo(true)} activeOpacity={0.9}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} style={{ marginEnd:6 }} />
              <Text style={styles.datePickText}>עד {to.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>

          {showFrom && (
            <DateTimePicker value={from} mode="date" onChange={(_,d)=>{ 
              setShowFrom(false); 
              if(d){ 
                // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
                setFrom(setTimeInIsrael(d, 0, 0));
              } 
            }} />
          )}
          {showTo && (
            <DateTimePicker value={to} mode="date" onChange={(_,d)=>{ 
              setShowTo(false); 
              if(d){ 
                // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
                setTo(setTimeInIsrael(d, 23, 59));
              } 
            }} />
          )}

          {/* סיכום הכנסות */}
          <View style={styles.summary}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.text} style={{ marginEnd: 6 }} />
            <Text style={styles.summaryText}>
              סה״כ הכנסות בטווח: {formatCurrency(totals.income)} • {totals.count} הזמנות
            </Text>
          </View>

          {/* גרף עמודות */}
          <View style={styles.chartRow}>
            {chart.map((p,i)=>{
              const h = Math.round((p.value / maxVal) * 80);
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
        <View style={styles.card}><Text style={styles.line}>החניה לא נמצאה.</Text></View>
      )}

      <Text style={styles.section}>הזמנות רלוונטיות</Text>
      <FlatList
        data={myBookings}
        keyExtractor={i=>i.id}
        renderItem={renderBooking}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        ListEmptyComponent={<Text style={[styles.line, { textAlign:'center', color: theme.colors.subtext, marginTop: 8 }]}>אין הזמנות.</Text>}
      />
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    wrap:{ flex:1, backgroundColor: colors.bg, padding: spacing.lg },
    header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginBottom: spacing.md, color: colors.text },

    // כרטיס עליון
    card:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth:1, borderColor: colors.border,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    cardHeader:{ flexDirection:'row', alignItems:'center', marginBottom: spacing.xs },
    cardIconWrap:{
      width:24, height:24, borderRadius:12,
      alignItems:'center', justifyContent:'center',
      marginEnd:8, backgroundColor: colors.primary
    },

    title:{ fontSize:16, fontWeight:'800', color: colors.text, flexShrink:1 },
    line:{ fontSize:14, color: colors.text, marginVertical:2 },

    hero:{ width:'100%', height:160, borderRadius: borderRadii.sm, marginBottom:8, backgroundColor: colors.bg },

    // טווחים מהירים
    quickRow:{ flexDirection:'row', gap:8, marginTop:8 },
    rangeBtn:{
      paddingVertical:8, paddingHorizontal:10,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.primary,
      backgroundColor: colors.surface,
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
    rangeBtnText:{ color: colors.primary, fontWeight:'800' },

    // בחירת תאריכים
    dateRow:{ flexDirection:'row', gap:10, marginTop:8 },
    datePick:{
      paddingVertical:10, paddingHorizontal:12,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection:'row', alignItems:'center',
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
    datePickText:{ color: colors.text, fontWeight:'700' },

    // סיכום הכנסות
    summary:{
      marginTop: spacing.sm,
      flexDirection:'row', alignItems:'center',
      backgroundColor:'#EEF3FF',
      borderRadius: borderRadii.md,
      borderWidth:1, borderColor: colors.border,
      padding: spacing.md
    },
    summaryText:{ color: colors.text, fontWeight:'700' },

    // גרף
    chartRow:{
      flexDirection:'row', gap:6, alignItems:'flex-end',
      marginTop:10, paddingTop:6, borderTopWidth:1, borderTopColor: colors.border
    },
    barWrap:{ alignItems:'center', width:28 },
    bar:{
      width:18, backgroundColor: colors.primary,
      borderRadius: 8
    },
    barLabel:{ fontSize:10, color: colors.subtext, marginTop:4 },

    // כותרת משנה
    section:{ fontSize:16, fontWeight:'800', marginBottom:6, marginTop:4, color: colors.text },

    // כרטיס הזמנה
    bCard:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.md,
      marginBottom: 10,
      borderWidth:1, borderColor: colors.border
    },
    bHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 },
    bTitle:{ fontSize:15, fontWeight:'800', color: colors.text, flex:1, marginEnd: spacing.sm },

    // סטטוס כ־Pill
    statusPill:{
      paddingVertical:4, paddingHorizontal:10, borderRadius:999,
      fontSize:12, overflow:'hidden',
      borderWidth:1, borderColor: colors.border, color: colors.text, backgroundColor: colors.bg
    },
    statusOk:{ color: colors.success, borderColor: '#b9f5cf', backgroundColor:'#f7fffb' },
    statusPending:{ color: colors.warning, borderColor:'#ffd79a', backgroundColor:'#fff7e6' },
    statusCancel:{ color: '#fff', borderColor: '#d66', backgroundColor:'#d66' },
  });
}

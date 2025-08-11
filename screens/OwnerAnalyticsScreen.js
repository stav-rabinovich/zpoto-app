// screens/OwnerAnalyticsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getListingStats } from '../services/stats';
import BarChartMini from '../components/BarChartMini';

const LISTINGS_KEY = 'owner_listings';

function addDays(d, n) { return new Date(d.getTime() + n * 24 * 3600 * 1000); }
function isoDaysAgo(n) {
  const to = new Date();
  const from = addDays(to, -n);
  return { from: from.toISOString(), to: to.toISOString() };
}
function sum(arr, pluck) { return arr.reduce((s, x) => s + (Number(pluck ? x[pluck] : x) || 0), 0); }

export default function OwnerAnalyticsScreen({ route }) {
  const listingId = route?.params?.id;
  const [listing, setListing] = useState(null);
  const [rangeKey, setRangeKey] = useState('30'); // 30 | 90 | 365
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hiRevenueIdx, setHiRevenueIdx] = useState(null);
  const [hiBookingsIdx, setHiBookingsIdx] = useState(null);

  const ranges = useMemo(() => ({
    '30': isoDaysAgo(30),
    '90': isoDaysAgo(90),
    '365': isoDaysAgo(365),
  }), []);

  const loadListing = useCallback(async () => {
    if (!listingId) return;
    const raw = await AsyncStorage.getItem(LISTINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const l = list.find(x => x.id === listingId) || null;
    setListing(l);
  }, [listingId]);

  const loadStats = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    try {
      const { from, to } = ranges[rangeKey];
      const s = await getListingStats({ listingId, fromISO: from, toISO: to });
      setStats(s);
      setHiRevenueIdx(null);
      setHiBookingsIdx(null);
    } catch (e) {
      Alert.alert('שגיאה', 'לא ניתן לטעון סטטיסטיקות.');
    } finally {
      setLoading(false);
    }
  }, [listingId, rangeKey, ranges]);

  useEffect(() => { loadListing(); }, [loadListing]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const dailyRevenueData = useMemo(() => {
    const days = stats?.daily || [];
    return days.slice(-30).map(d => ({ label: d.day, value: d.revenue || 0 }));
  }, [stats]);

  const dailyBookingsData = useMemo(() => {
    const days = stats?.daily || [];
    return days.slice(-30).map(d => ({ label: d.day, value: d.bookings || 0 }));
  }, [stats]);

  const kpis = useMemo(() => ({
    revenue: stats?.totalRevenue || 0,
    hours: stats?.totalHours || 0,
    bookings: stats?.totalBookings || 0,
    avgRevPerBooking: (stats?.totalBookings || 0) ? Math.round((stats.totalRevenue || 0) / stats.totalBookings) : 0,
    avgHoursPerBooking: (stats?.totalBookings || 0) ? Math.round((stats.totalHours || 0) / stats.totalBookings) : 0,
    last30Revenue: sum(dailyRevenueData, 'value'),
    last30Bookings: sum(dailyBookingsData, 'value'),
  }), [stats, dailyRevenueData, dailyBookingsData]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>סטטיסטיקות חניה</Text>
      <Text style={styles.title}>{listing?.title || listing?.address || 'חניה'}</Text>

      {/* בחירת טווח */}
      <View style={styles.tabs}>
        {[
          { key: '30', label: '30 ימים' },
          { key: '90', label: '90 ימים' },
          { key: '365', label: '12 חודשים' },
        ].map(t => {
          const active = rangeKey === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setRangeKey(t.key)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : !stats ? (
        <Text style={{ textAlign: 'center', color: '#666' }}>אין נתונים.</Text>
      ) : (
        <>
          {/* KPI */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Ionicons name="cash" size={18} color="#0a7a3e" />
              <Text style={styles.kpiNumber}>₪{kpis.revenue}</Text>
              <Text style={styles.kpiLabel}>הכנסה בטווח</Text>
            </View>
            <View style={styles.kpiCard}>
              <Ionicons name="calendar" size={18} color="#7a4d00" />
              <Text style={styles.kpiNumber}>{kpis.bookings}</Text>
              <Text style={styles.kpiLabel}>הזמנות</Text>
            </View>
            <View style={styles.kpiCard}>
              <Ionicons name="time" size={18} color="#0b6aa8" />
              <Text style={styles.kpiNumber}>{kpis.hours}</Text>
              <Text style={styles.kpiLabel}>שעות</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCardSmall}>
              <Text style={styles.kpiMiniTitle}>ממוצע להזמנה</Text>
              <Text style={[styles.kpiMiniNum, { color: '#0a7a3e' }]}>₪{kpis.avgRevPerBooking}</Text>
            </View>
            <View style={styles.kpiCardSmall}>
              <Text style={styles.kpiMiniTitle}>שעות להזמנה</Text>
              <Text style={[styles.kpiMiniNum, { color: '#0b6aa8' }]}>{kpis.avgHoursPerBooking}</Text>
            </View>
            <View style={styles.kpiCardSmall}>
              <Text style={styles.kpiMiniTitle}>₪ ב־30 יום</Text>
              <Text style={[styles.kpiMiniNum, { color: '#0a7a3e' }]}>₪{kpis.last30Revenue}</Text>
            </View>
            <View style={styles.kpiCardSmall}>
              <Text style={styles.kpiMiniTitle}>הזמנות 30 יום</Text>
              <Text style={[styles.kpiMiniNum, { color: '#7a4d00' }]}>{kpis.last30Bookings}</Text>
            </View>
          </View>

          {/* גרפים */}
          <Text style={styles.section}>הכנסות יומיות (עד 30 ימים)</Text>
          <BarChartMini
            data={dailyRevenueData}
            yFormatter={(n) => `₪${n}`}
            xFormatter={(s) => {
              // YYYY-MM-DD -> DD/MM
              if (!s) return '';
              const [y,m,d] = s.split('-');
              return `${d}/${m}`;
            }}
            highlightIndex={hiRevenueIdx}
            onBarPress={(_, idx) => setHiRevenueIdx(idx)}
            color="#0a7a3e"
            colorFaded="rgba(10,122,62,0.18)"
          />

          <Text style={[styles.section, { marginTop: 12 }]}>כמות הזמנות יומית (עד 30 ימים)</Text>
          <BarChartMini
            data={dailyBookingsData}
            yFormatter={(n) => `${n}`}
            xFormatter={(s) => {
              if (!s) return '';
              const [y,m,d] = s.split('-');
              return `${d}/${m}`;
            }}
            highlightIndex={hiBookingsIdx}
            onBarPress={(_, idx) => setHiBookingsIdx(idx)}
            color="#00C6FF"
            colorFaded="rgba(0,198,255,0.18)"
          />

          {/* הזמנות אחרונות */}
          <Text style={[styles.section, { marginTop: 12 }]}>הזמנות אחרונות</Text>
          <FlatList
            data={stats.recent}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => {
              const start = new Date(item.start);
              const end = new Date(item.end);
              return (
                <View style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingTitle}>{item.plate}{item.carDesc ? ` – ${item.carDesc}` : ''}</Text>
                    {!!item.spot?.address && <Text style={styles.bookingLine}>כתובת: {item.spot.address}</Text>}
                    <Text style={styles.bookingLine}>
                      מ־{start.toLocaleString()} עד {end.toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.bookingPrice}>₪{item.total}</Text>
                    <Text style={styles.bookingMeta}>{item.hours} שעות</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={{ color: '#666', textAlign: 'center', marginTop: 8 }}>אין הזמנות.</Text>}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f6f9fc', padding: 14 },
  header: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#0b6aa8' },

  tabs: {
    flexDirection: 'row', backgroundColor: '#eaf4ff', borderRadius: 999,
    borderWidth: 1, borderColor: '#cfe3ff', padding: 4, marginBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 999 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#0b6aa8', fontWeight: '700' },
  tabTextActive: { color: '#0b6aa8', fontWeight: '900' },

  center: { paddingVertical: 20 },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ecf1f7',
    paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
  },
  kpiNumber: { fontSize: 18, fontWeight: '900', marginTop: 4, color: '#0b6aa8' },
  kpiLabel: { fontSize: 12, color: '#445' },

  kpiCardSmall: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ecf1f7',
    paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center',
  },
  kpiMiniTitle: { fontSize: 11, color: '#445' },
  kpiMiniNum: { fontSize: 16, fontWeight: '900' },

  section: { fontSize: 15, fontWeight: '800', marginTop: 8, marginBottom: 6, color: '#0b6aa8' },

  bookingRow: {
    flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ecf1f7',
    padding: 12, marginBottom: 10,
  },
  bookingTitle: { fontSize: 14, fontWeight: '700' },
  bookingLine: { fontSize: 12, color: '#444', marginTop: 2 },
  bookingPrice: { fontSize: 16, fontWeight: '900', color: '#0a7a3e' },
  bookingMeta: { fontSize: 12, color: '#666' },
});

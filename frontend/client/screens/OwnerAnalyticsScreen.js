// screens/OwnerAnalyticsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { getOwnerParkings, getParkingStats, formatCurrency, calculateOccupancyRate, calculateAverageHourlyRevenue } from '../services/api/owner';
import BarChartMini from '../components/BarChartMini';

const LISTINGS_KEY = 'owner_listings';

function addDays(d, n) { return new Date(d.getTime() + n * 24 * 3600 * 1000); }
function isoDaysAgo(n) {
  const to = new Date();
  const from = addDays(to, -n);
  return { from: from.toISOString(), to: to.toISOString() };
}
function sum(arr, pluck) { return arr.reduce((s, x) => s + (Number(pluck ? x[pluck] : x) || 0), 0); }
const fmtIL = (n) => new Intl.NumberFormat('he-IL').format(n || 0);

export default function OwnerAnalyticsScreen({ route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { isAuthenticated } = useAuth();

  const parkingId = route?.params?.id || route?.params?.parkingId;
  const [parking, setParking] = useState(null);
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

  const loadParking = useCallback(async () => {
    if (!parkingId || !isAuthenticated) return;
    
    try {
      const result = await getOwnerParkings();
      if (result.success) {
        const p = result.data.find(x => x.id === parseInt(parkingId)) || null;
        setParking(p);
      } else {
        console.error('Failed to load parkings:', result.error);
        setParking(null);
      }
    } catch (error) {
      console.error('Load parking error:', error);
      setParking(null);
    }
  }, [parkingId, isAuthenticated]);

  const loadStats = useCallback(async () => {
    if (!parkingId || !isAuthenticated) return;
    setLoading(true);
    try {
      const { from, to } = ranges[rangeKey];
      const result = await getParkingStats(parkingId, { 
        from, 
        to,
        days: parseInt(rangeKey)
      });
      
      if (result.success) {
        setStats(result.data);
        setHiRevenueIdx(null);
        setHiBookingsIdx(null);
      } else {
        console.error('Failed to load stats:', result.error);
        setStats(null);
      }
    } catch (error) {
      console.error('Load stats error:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [parkingId, rangeKey, ranges, isAuthenticated]);

  useEffect(() => { loadParking(); }, [loadParking]);
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
      <Text style={styles.title}>{parking?.title || parking?.address || 'חניה'}</Text>

      {/* בחירת טווח (segmented) */}
      <View style={styles.tabs}>
        {[
          { key: '30', label: '30 ימים' },
          { key: '90', label: '90 ימים' },
          { key: '365', label: '12 חודשים' },
        ].map(t => {
          const active = rangeKey === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setRangeKey(t.key)}
              activeOpacity={0.9}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : !stats ? (
        <Text style={styles.empty}>אין נתונים.</Text>
      ) : (
        <>
          {/* KPI ראשיים */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}><Ionicons name="cash-outline" size={16} color="#fff" /></View>
              <Text style={styles.kpiNumber}>{formatCurrency(kpis.revenue)}</Text>
              <Text style={styles.kpiLabel}>הכנסה בטווח</Text>
            </View>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: '#7a4d00' }]}><Ionicons name="calendar-outline" size={16} color="#fff" /></View>
              <Text style={styles.kpiNumber}>{fmtIL(kpis.bookings)}</Text>
              <Text style={styles.kpiLabel}>הזמנות</Text>
            </View>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: theme.colors.primary }]}><Ionicons name="time-outline" size={16} color="#fff" /></View>
              <Text style={styles.kpiNumber}>{fmtIL(kpis.hours)}</Text>
              <Text style={styles.kpiLabel}>שעות</Text>
            </View>
          </View>

          {/* KPI משניים */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCardSmall}>
              <Text style={styles.kpiMiniTitle}>ממוצע להזמנה</Text>
              <Text style={[styles.kpiMiniNum, { color: theme.colors.success }]}>{formatCurrency(kpis.avgRevPerBooking)}</Text>
            </View>
            <View style={styles.kpiCardSmall}>
              <Text style={styles.kpiMiniTitle}>שעות להזמנה</Text>
              <Text style={[styles.kpiMiniNum, { color: theme.colors.primary }]}>{fmtIL(kpis.avgHoursPerBooking)}</Text>
            </View>
            <View style={styles.kpiCardSmall}>
              <Text style={styles.kpiMiniTitle}>תפוסה</Text>
              <Text style={[styles.kpiMiniNum, { color: '#FF6B35' }]}>{calculateOccupancyRate(stats)}%</Text>
            </View>
            <View style={styles.kpiCardSmall}>
              <Text style={styles.kpiMiniTitle}>₪ לשעה</Text>
              <Text style={[styles.kpiMiniNum, { color: theme.colors.success }]}>{formatCurrency(calculateAverageHourlyRevenue(stats))}</Text>
            </View>
          </View>

          {/* גרפים */}
          <Text style={styles.section}>הכנסות יומיות (עד 30 ימים)</Text>
          <BarChartMini
            data={dailyRevenueData}
            yFormatter={(n) => `₪${fmtIL(n)}`}
            xFormatter={(s) => {
              // YYYY-MM-DD -> DD/MM
              if (!s) return '';
              const [y,m,d] = s.split('-');
              return `${d}/${m}`;
            }}
            highlightIndex={hiRevenueIdx}
            onBarPress={(_, idx) => setHiRevenueIdx(idx)}
            color={theme.colors.success}
            colorFaded="rgba(10,122,62,0.18)"
          />

          <Text style={[styles.section, { marginTop: theme.spacing.md }]}>כמות הזמנות יומית (עד 30 ימים)</Text>
          <BarChartMini
            data={dailyBookingsData}
            yFormatter={(n) => `${fmtIL(n)}`}
            xFormatter={(s) => {
              if (!s) return '';
              const [y,m,d] = s.split('-');
              return `${d}/${m}`;
            }}
            highlightIndex={hiBookingsIdx}
            onBarPress={(_, idx) => setHiBookingsIdx(idx)}
            color={theme.colors.primary}
            colorFaded="rgba(0,198,255,0.18)"
          />

          {/* הזמנות אחרונות */}
          <Text style={[styles.section, { marginTop: theme.spacing.md }]}>הזמנות אחרונות</Text>
          <FlatList
            data={stats.recent}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            renderItem={({ item }) => {
              const start = new Date(item.start);
              const end = new Date(item.end);
              return (
                <View style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingTitle} numberOfLines={1}>
                      {item.plate}{item.carDesc ? ` – ${item.carDesc}` : ''}
                    </Text>
                    {!!item.spot?.address && <Text style={styles.bookingLine}>כתובת: {item.spot.address}</Text>}
                    <Text style={styles.bookingLine}>מ־{start.toLocaleString()} עד {end.toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.bookingPrice}>₪{fmtIL(item.total)}</Text>
                    <Text style={styles.bookingMeta}>{fmtIL(item.hours)} שעות</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>אין הזמנות.</Text>}
          />
        </>
      )}
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },

    header: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: spacing.xs, color: colors.text },
    title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm, color: colors.primary },

    // Segmented tabs
    tabs: {
      flexDirection: 'row',
      backgroundColor: '#EAF4FF',
      borderRadius: 999,
      borderWidth: 1, borderColor: colors.border,
      padding: 4, marginBottom: spacing.md,
    },
    tab: {
      flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 999,
    },
    tabActive: {
      backgroundColor: colors.surface,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
    tabText: { color: colors.primary, fontWeight: '700' },
    tabTextActive: { color: colors.primary, fontWeight: '900' },

    center: { paddingVertical: spacing.lg },
    empty: { textAlign: 'center', color: colors.subtext },

    // KPI
    kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      borderWidth: 1, borderColor: colors.border,
      paddingVertical: 12, paddingHorizontal: spacing.md,
      alignItems: 'center', justifyContent: 'center',
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    kpiIcon: {
      width: 24, height: 24, borderRadius: 12,
      alignItems:'center', justifyContent:'center',
      backgroundColor: colors.success
    },
    kpiNumber: { fontSize: 18, fontWeight: '900', marginTop: 6, color: colors.text },
    kpiLabel: { fontSize: 12, color: colors.subtext },

    kpiCardSmall: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      borderWidth: 1, borderColor: colors.border,
      paddingVertical: 10, paddingHorizontal: 8,
      alignItems: 'center', justifyContent: 'center',
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
    kpiMiniTitle: { fontSize: 11, color: colors.subtext },
    kpiMiniNum: { fontSize: 16, fontWeight: '900' },

    section: { fontSize: 15, fontWeight: '800', marginTop: spacing.sm, marginBottom: spacing.xs, color: colors.text },

    // הזמנות אחרונות
    bookingRow: {
      flexDirection: 'row', gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, marginBottom: spacing.sm,
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
    bookingTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    bookingLine: { fontSize: 12, color: colors.subtext, marginTop: 2 },
    bookingPrice: { fontSize: 16, fontWeight: '900', color: colors.success },
    bookingMeta: { fontSize: 12, color: colors.subtext },
  });
}

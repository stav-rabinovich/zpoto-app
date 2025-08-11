// screens/OwnerOverviewScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import * as bookingsRepo from '../data/bookingsRepo';
import { BOOKING_STATUS } from '../types/status';

const PRESETS = [
  { key: '7d', label: '7 ימים', deltaDays: 7 },
  { key: '30d', label: '30 ימים', deltaDays: 30 },
  { key: '90d', label: '90 ימים', deltaDays: 90 },
];

export default function OwnerOverviewScreen() {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [all, setAll] = useState([]);
  const [kpi, setKpi] = useState({ revenue: 0, completedCount: 0, approvedCount: 0, totalCount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await bookingsRepo.getAll();
      setAll(items);
    } finally {
      setLoading(false);
    }
  }, []);

  async function recompute() {
    const res = await bookingsRepo.kpis(from, to);
    setKpi(res);
  }

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, all.length]);

  const filtered = useMemo(
    () => all.filter((b) => bookingsRepo.inRange(b, from, to)),
    [all, from, to]
  );

  const completed = useMemo(
    () => filtered.filter((b) => b.status === BOOKING_STATUS.COMPLETED),
    [filtered]
  );

  const approved = useMemo(
    () => filtered.filter((b) => b.status === BOOKING_STATUS.APPROVED),
    [filtered]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>סקירה כללית</Text>

      {/* Presets */}
      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[
              styles.presetBtn,
              isSameRange(from, to, p.deltaDays) && styles.presetBtnActive
            ]}
            onPress={() => {
              setFrom(daysAgo(p.deltaDays));
              setTo(new Date());
            }}
          >
            <Text style={[styles.presetText, isSameRange(from, to, p.deltaDays) && styles.presetTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPIs */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text>טוען נתונים…</Text>
        </View>
      ) : (
        <View style={styles.kpis}>
          <Kpi title="הכנסה" value={formatCurrency(kpi.revenue)} />
          <Kpi title="הזמנות שהושלמו" value={String(kpi.completedCount)} />
          <Kpi title="הזמנות שאושרו" value={String(kpi.approvedCount)} />
          <Kpi title="סה״כ הזמנות בטווח" value={String(kpi.totalCount)} />
        </View>
      )}

      {/* רשימת הזמנות בטווח */}
      <Text style={styles.subHeader}>הזמנות בטווח הנבחר</Text>
      <FlatList
        data={filtered.sort((a, b) => (new Date(b.startAt) - new Date(a.startAt)))}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title || 'הזמנה'}</Text>
            <Text style={styles.row}>סטטוס: {item.status}</Text>
            <Text style={styles.row}>מתאריך: {fmt(item.startAt)} עד {fmt(item.endAt)}</Text>
            <Text style={styles.row}>מחיר משוער: {bookingsRepo.calcTotalPrice(item)} ₪</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
      />
    </View>
  );
}

function Kpi({ title, value }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function fmt(v) {
  try {
    const d = new Date(v);
    const dd = d.toLocaleDateString('he-IL');
    const tt = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${dd} ${tt}`;
  } catch {
    return '-';
  }
}

function formatCurrency(n) {
  const val = Number(n || 0);
  return val.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameRange(from, to, deltaDays) {
  const targetFrom = daysAgo(deltaDays).getTime();
  const now = new Date();
  const okTo = Math.abs(to.getTime() - now.getTime()) < 1000 * 60 * 5; // 5 דקות
  return Math.abs(from.getTime() - targetFrom) < 1000 * 60 && okTo;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', margin: 16 },
  presetRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  presetBtn: {
    borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8
  },
  presetBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  presetText: { color: '#111827', fontWeight: '600' },
  presetTextActive: { color: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 6 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  kpiCard: { flexBasis: '48%', backgroundColor: '#f7f7fb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ececf1' },
  kpiTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '700' },
  subHeader: { fontSize: 16, fontWeight: '700', marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  card: { backgroundColor: '#f7f7fb', borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#ececf1' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  row: { fontSize: 13, color: '#333' },
});

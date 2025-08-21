// screens/OwnerOverviewScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import * as bookingsRepo from '../data/bookingsRepo';
import { BOOKING_STATUS } from '../data/bookingsRepo';
import BookingLifecycleWatcher from '../components/BookingLifecycleWatcher';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// צבעי Zpoto
const ZPOTO = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  border: '#C7DEFF',
};

const PRESETS = [
  { key: '7d',  label: '7 ימים',  deltaDays: 7  },
  { key: '30d', label: '30 ימים', deltaDays: 30 },
  { key: '90d', label: '90 ימים', deltaDays: 90 },
];

export default function OwnerOverviewScreen() {
  const [from, setFrom]   = useState(daysAgo(7));
  const [to, setTo]       = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [all, setAll]         = useState([]);
  const [kpi, setKpi]         = useState({ revenue: 0, completedCount: 0, approvedCount: 0, totalCount: 0 });

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

  useEffect(() => { load(); }, [load]);

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
      {/* מריץ אוטומציית סטטוסים ברקע */}
      <BookingLifecycleWatcher />

      {/* כותרת במרכז */}
      <Text style={styles.header}>סקירה כללית</Text>

      {/* Presets – מילוי בגרדיאנט צבעי Zpoto */}
      <View style={styles.presetRow}>
        {PRESETS.map((p) => {
          const active = isSameRange(from, to, p.deltaDays);
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.presetBtn, active && styles.presetBtnActive]}
              onPress={() => {
                setFrom(daysAgo(p.deltaDays));
                setTo(new Date());
              }}
              activeOpacity={0.9}
            >
              {active ? (
                <LinearGradient
                  colors={[ZPOTO.primary, ZPOTO.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.presetGradient}
                >
                  <Text style={[styles.presetText, styles.presetTextActive]}>{p.label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.presetText}>{p.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* KPIs */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text>טוען נתונים…</Text>
        </View>
      ) : (
        <>
          <View style={styles.kpis}>
            <Kpi title="הכנסה" value={formatCurrency(kpi.revenue)} />
            <Kpi title="הזמנות שהושלמו" value={String(kpi.completedCount)} />
            <Kpi title="הזמנות שאושרו" value={String(kpi.approvedCount)} />
            <Kpi title="סה״כ הזמנות בטווח" value={String(kpi.totalCount)} />
          </View>

          {/* טיפ – עיצוב זהה ל-infoStrip שב-OwnerIntroScreen:
              אייקון ראשון, ואז הטקסט עטוף וּמיושר לשמאל */}
          <View style={styles.tipStrip}>
            <Ionicons name="bulb-outline" size={16} color={ZPOTO.primary} style={styles.tipIcon} />
            <View style={styles.tipTextWrap}>
              <Text style={styles.tipStripText}>
                טיפ: הורד מחיר ב־10% לשעות חלשות.
              </Text>
            </View>
          </View>
        </>
      )}

      {/* רשימת הזמנות בטווח */}
      <Text style={styles.subHeader}>הזמנות בטווח הנבחר</Text>
      <FlatList
        data={[...filtered].sort((a, b) => (new Date(b.startAt) - new Date(a.startAt)))}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title || 'הזמנה'}</Text>
            <Text style={styles.row}>סטטוס: {prettyStatus(item.status)}</Text>
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

function prettyStatus(s) {
  switch (s) {
    case BOOKING_STATUS.PENDING:   return 'ממתינה לאישור';
    case BOOKING_STATUS.APPROVED:  return 'מאושרת (עתידית)';
    case BOOKING_STATUS.ACTIVE:    return 'פעילה';
    case BOOKING_STATUS.COMPLETED: return 'הושלמה';
    case BOOKING_STATUS.REJECTED:  return 'נדחתה';
    case BOOKING_STATUS.CANCELED:  return 'בוטלה';
    default: return String(s || '-');
  }
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

  // כותרת ראשית – במרכז
  header: { fontSize: 20, fontWeight: '700', margin: 16, textAlign: 'center' },

  // Presets
  presetRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  presetBtn: {
    borderWidth: 1,
    borderColor: ZPOTO.border,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  presetBtnActive: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  presetGradient: {
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetText: { color: '#111827', fontWeight: '600', textAlign: 'left' },
  presetTextActive: { color: '#fff' },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 6 },

  // KPIs – פריסה 2x2; טקסטים לשמאל
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  kpiCard: { flexBasis: '48%', backgroundColor: '#f7f7fb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ececf1' },
  kpiTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4, textAlign: 'left' },
  kpiValue: { fontSize: 18, fontWeight: '700', textAlign: 'left' },

  // טיפ – כמו infoStrip: אייקון + טקסט משמאלו, מיושר לשמאל
  tipStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececf1',
    backgroundColor: '#F8FAFF',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  tipIcon: { marginEnd: 8 },
  tipTextWrap: { flex: 1, alignSelf: 'stretch' },
  tipStripText: { fontSize: 13, color: '#4B5563', textAlign: 'left' },

  // כותרת משנה – לשמאל
  subHeader: { fontSize: 16, fontWeight: '700', marginHorizontal: 16, marginTop: 8, marginBottom: 4, textAlign: 'left' },

  // כרטיסיות – הכל לשמאל
  card: {
    backgroundColor: '#f7f7fb',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ececf1',
    alignItems: 'flex-start',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start' },
  row: { fontSize: 13, color: '#333', textAlign: 'left', alignSelf: 'flex-start' },
});

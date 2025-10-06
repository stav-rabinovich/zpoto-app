// screens/OwnerIntroScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import ZpButton from '../components/ui/ZpButton';
import api from '../utils/api';
import { useAuthContext } from '../contexts/ServerOnlyAuthContext';

const PROFILE_KEY = 'profile';

function StatusBadge({ status, colors }) {
  const map = {
    approved: { bg: '#e8fff2', br: '#b9f5cf', color: colors.success, icon: 'checkmark-circle' },
    pending:  { bg: '#fffaf1', br: '#ffe1a8', color: colors.warning, icon: 'time' },
    none:     { bg: '#eef3ff', br: '#dfe7ff', color: colors.primary, icon: 'information-circle' },
  };
  const s = map[status] || map.none;
  const label = status === 'approved' ? 'מאושר' : status === 'pending' ? 'בהמתנה' : 'טרם נרשמת';
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.br }]}>
      <Ionicons name={s.icon} size={14} color={s.color} style={{ marginEnd: 6 }} />
      <Text style={[styles.badgeText, { color: s.color }]}>{label}</Text>
    </View>
  );
}

function KpiCard({ icon, label, value, colors }) {
  return (
    <View style={[styles.kpi, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
        <Ionicons name={icon} size={16} color={colors.text} />
      </View>
      <Text style={[styles.kpiValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.subtext }]}>{label}</Text>
    </View>
  );
}

export default function OwnerIntroScreen({ navigation }) {
  const theme = useTheme();
  const { user, token } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('none'); // 'none' | 'pending' | 'approved'
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      const p = raw ? JSON.parse(raw) : {};
      setStatus(p?.owner_status || 'none');
      setName(p?.name || '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const approveDev = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    const roles = Array.isArray(prev.roles)
      ? Array.from(new Set([...prev.roles, 'owner']))
      : ['seeker', 'owner'];
    const next = { ...prev, owner_status: 'approved', roles };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setStatus('approved');
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.centerText, { color: theme.colors.subtext }]}>טוען…</Text>
      </View>
    );
  }

  const gradStart = theme.colors?.gradientStart ?? theme.colors.primary;
  const gradEnd = theme.colors?.gradientEnd ?? theme.colors.primary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={[styles.wrap, { padding: theme.spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* HERO מנהלי */}
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.hero, { borderRadius: theme.borderRadii.lg }]}
      >
        <View style={styles.heroTopRow}>
          <Text style={styles.heroTitle}>מרכז הניהול להשכרת חניה</Text>

          {status !== 'approved' && (
            <TouchableOpacity
              onPress={approveDev}
              style={[styles.devBtn, { borderColor: 'rgba(255,255,255,0.45)' }]}
              activeOpacity={0.9}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="construct-outline" size={14} color="#fff" style={{ marginEnd: 6 }} />
              <Text style={[styles.devBtnText, { color: '#fff' }]}>אשר זמנית (DEV)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ברכה קצרה */}
        {!!name && <Text style={styles.heroHello}>שלום{name ? `, ${name}` : ''}</Text>}

        {/* תיאור – מיושר לשמאל */}
        <Text style={styles.heroSub}>
          הפכו את החניה שלכם להכנסה קבועה — ניהול קל, שקיפות מלאה ותשלומים מאובטחים.
        </Text>

        {/* תג הסטטוס מתחת לטקסט התיאור */}
        <View style={styles.heroBadgeBelow}>
          <StatusBadge status={status} colors={theme.colors} />
        </View>
      </LinearGradient>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <KpiCard icon="cash-outline"     label="הכנסה חודשית" value="₪0 (דמו)" colors={theme.colors} />
        <KpiCard icon="calendar-outline" label="הזמנות החודש" value="—"         colors={theme.colors} />
        <KpiCard icon="timer-outline"    label="שעות תפוסה"    value="—"         colors={theme.colors} />
      </View>

      {/* תוכן לפי סטטוס */}
      {status === 'approved' && (
        <>
          <View style={[styles.card, styles.cardApproved, themed(theme)]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>ברוך/ה הבא/ה{name ? `, ${name}` : ''}!</Text>
            </View>

            <Text style={[styles.sectionTitleLeft, { color: theme.colors.text }]}>מה תרצו לעשות?</Text>

            {/* פעולות מהירות */}
            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={[styles.quickTile, { borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('OwnerOverview')}
                activeOpacity={0.9}
              >
                <Ionicons name="speedometer" size={20} color={theme.colors.primary} />
                <Text style={[styles.quickLabel, { color: theme.colors.text }]}>סקירה כללית</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickTile, { borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('OwnerDashboard')}
                activeOpacity={0.9}
              >
                <Ionicons name="business" size={20} color={theme.colors.primary} />
                <Text style={[styles.quickLabel, { color: theme.colors.text }]}>ניהול החניות</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickTile, { borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('OwnerPending')}
                activeOpacity={0.9}
              >
                <Ionicons name="timer" size={20} color={theme.colors.primary} />
                <Text style={[styles.quickLabel, { color: theme.colors.text }]}>בקשות בהמתנה</Text>
              </TouchableOpacity>

              {/* פרסום חניה חדשה -> OwnerListingFormScreen.js */}
              <TouchableOpacity
                style={[styles.quickTile, { borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('OwnerListingForm')}
                activeOpacity={0.9}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.quickLabel, { color: theme.colors.text }]}>פרסום חניה חדשה</Text>
              </TouchableOpacity>
            </View>

            {/* שינוי טקסט הכפתור */}
            <ZpButton
              title="כניסה לממשק"
              onPress={() => navigation.navigate('OwnerOverview')}
              leftIcon={<Ionicons name="enter" size={18} color="#fff" style={{ marginEnd: 6 }} />}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>

          <View style={[styles.infoStrip, { borderColor: theme.colors.border, backgroundColor: '#F8FAFF' }]}>
            <Ionicons name="bulb-outline" size={16} color={theme.colors.primary} style={{ marginEnd: 8 }} />
            <Text style={[styles.infoStripText, { color: theme.colors.subtext }]}>
              טיפ: הגדירו שעות זמינות קבועות כדי למקסם תפוסה.
            </Text>
          </View>
        </>
      )}

      {status === 'pending' && (
        <View style={[styles.card, styles.cardPending, themed(theme)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.warning }]}>
              <Ionicons name="time-outline" size={16} color="#fff" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>הבקשה בהמתנה</Text>
          </View>

          <Text style={[styles.parLeft, { color: theme.colors.text }]}>
            אנו בודקים את הפרטים שלך. נעדכן ברגע האישור.
          </Text>

          <ZpButton
            title="בדוק סטטוס"
            onPress={load}
            leftIcon={<Ionicons name="refresh" size={18} color="#fff" style={{ marginEnd: 6 }} />}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>
      )}

      {status === 'none' && (
        <View style={[styles.card, themed(theme)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="create-outline" size={16} color="#fff" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>התחילו להשכיר בחכמה</Text>
          </View>

          <Text style={[styles.parLeft, { color: theme.colors.text }]}>
            נמלא פרטים קצרים ונשלח בקשה לאישור. אחר כך תקבלו גישה למרכז הניהול.
          </Text>

          <View style={styles.bullets}>
            <View style={styles.bulletRow}>
              <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} style={{ marginEnd: 8 }} />
              <Text style={[styles.bulletText, { color: theme.colors.subtext }]}>תשלומים מאובטחים והגנות ביטול</Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="calendar" size={16} color={theme.colors.primary} style={{ marginEnd: 8 }} />
              <Text style={[styles.bulletText, { color: theme.colors.subtext }]}>שליטה מלאה בזמינות</Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="chatbubbles" size={16} color={theme.colors.primary} style={{ marginEnd: 8 }} />
              <Text style={[styles.bulletText, { color: theme.colors.subtext }]}>תמיכה ידידותית בעברית</Text>
            </View>
          </View>

          <ZpButton
            title="הגש בקשה"
            onPress={() => navigation.navigate('OwnerApply')}
            leftIcon={<Ionicons name="create" size={18} color="#fff" style={{ marginEnd: 6 }} />}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const themed = (theme) => ({
  borderColor: theme.colors.border,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
});

const styles = StyleSheet.create({
  wrap: { direction: 'rtl' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: 8 },

  hero: { paddingVertical: 18, paddingHorizontal: 16, marginBottom: 14 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroHello: { color: '#fff', fontWeight: '700', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.95)', marginTop: 8, lineHeight: 20, fontSize: 13, textAlign: 'left', writingDirection: 'ltr' },
  heroBadgeBelow: { marginTop: 10, alignItems: 'flex-start' }, // מתחת לטקסט, מיושר לשמאל

  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  devBtnText: { fontSize: 11, fontWeight: '700' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpi: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  kpiValue: { fontSize: 16, fontWeight: '800' },
  kpiLabel: { fontSize: 11, marginTop: 2 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardApproved: { backgroundColor: '#f7fffb' },
  cardPending: { backgroundColor: '#fffaf1' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginEnd: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },

  sectionTitleLeft: { fontSize: 14, fontWeight: '800', marginTop: 2, marginBottom: 8, textAlign: 'left', writingDirection: 'ltr' },
  parLeft: { fontSize: 14, marginVertical: 2, textAlign: 'left', writingDirection: 'ltr' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickTile: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickLabel: { fontWeight: '700', fontSize: 13, textAlign: 'center' },

  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoStripText: { fontSize: 13 },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '800' },
  line: { fontSize: 14, marginVertical: 2 },
  bullets: { marginTop: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bulletText: { fontSize: 13 },
});

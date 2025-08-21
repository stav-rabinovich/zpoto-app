// screens/BookingDetailScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as bookingsRepo from '../data/bookingsRepo';
import { BOOKING_STATUS } from '../data/bookingsRepo';
import { useTheme } from '@shopify/restyle';
import ZpButton from '../components/ui/ZpButton';

export default function BookingDetailScreen({ route }) {
  // תומך גם ב-id וגם ב-bookingId (מההתראות)
  const bookingId = route?.params?.id || route?.params?.bookingId;
  const [b, setB] = useState(null);
  const [ticker, setTicker] = useState(0); // ריענון לספירה לאחור

  // טעינה ראשונית + טיקט לשעון
  useEffect(() => {
    let ok = true;
    (async () => {
      const x = await bookingsRepo.getById(bookingId);
      if (ok) setB(x);
    })();
    const t = setInterval(() => setTicker(v => v + 1), 1000);
    return () => { ok = false; clearInterval(t); };
  }, [bookingId]);

  // עדכון סטטוסים אוטומטי ברקע + ריענון תצוגה
  useEffect(() => {
    (async () => {
      await bookingsRepo.sweepAndAutoTransition();
      const x = await bookingsRepo.getById(bookingId);
      setB(x);
    })();
  }, [ticker, bookingId]);

  const theme = useTheme();
  const styles = makeStyles(theme);

  if (!b) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.header}>טוען…</Text>
        </View>
      </View>
    );
  }

  const now = Date.now();
  const startTs = b.startAt ? new Date(b.startAt).getTime() : null;
  const endTs   = b.endAt   ? new Date(b.endAt).getTime()   : null;

  const untilStart = startTs && now < startTs ? startTs - now : 0;
  const untilEnd   = endTs   && now < endTs   ? endTs   - now : 0;

  function fmt(v) {
    if (!v) return '-';
    const d = new Date(v);
    const dd = d.toLocaleDateString('he-IL');
    const tt = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${dd} ${tt}`;
  }
  function pretty(s) {
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
  function fmtCountdown(ms) {
    if (!ms || ms <= 0) return '—';
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  async function extend() {
    const newEnd = new Date(new Date(b.endAt).getTime() + 30 * 60 * 1000);
    const updated = await bookingsRepo.extend(b.id, newEnd.toISOString());
    setB(updated);
    Alert.alert('הוארך', 'ההזמנה הוארכה ב‑30 דקות');
  }
  async function finishNow() {
    const updated = await bookingsRepo.finishNow(b.id);
    setB(updated);
    Alert.alert('הסתיים', `החיוב הסופי: ${bookingsRepo.calcTotalPrice(updated)} ₪`);
  }

  const isActive   = b.status === BOOKING_STATUS.ACTIVE;
  const isApproved = b.status === BOOKING_STATUS.APPROVED;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.header}>{b.title || 'הזמנה'}</Text>

        <View style={styles.rowLine}>
          <Text style={styles.rowLabel}>סטטוס</Text>
          <Text
            style={[
              styles.statusPill,
              isActive && styles.statusActive,
              isApproved && styles.statusApproved,
              b.status === BOOKING_STATUS.COMPLETED && styles.statusDone,
              b.status === BOOKING_STATUS.REJECTED && styles.statusRejected,
              b.status === BOOKING_STATUS.CANCELED && styles.statusCanceled,
            ]}
          >
            {pretty(b.status)}
          </Text>
        </View>

        <View style={styles.rowLine}>
          <Text style={styles.rowLabel}>טווח</Text>
          <Text style={styles.rowValue}>{fmt(b.startAt)}  —  {fmt(b.endAt)}</Text>
        </View>

        <View style={styles.rowLine}>
          <Text style={styles.rowLabel}>חיוב משוער</Text>
          <Text style={styles.priceValue}>{bookingsRepo.calcTotalPrice(b)} ₪</Text>
        </View>

        {isApproved && (
          <View style={styles.countWrap}>
            <Text style={styles.countLabel}>מתחיל בעוד</Text>
            <Text style={styles.countValue}>{fmtCountdown(untilStart)}</Text>
          </View>
        )}
        {isActive && (
          <View style={styles.countWrap}>
            <Text style={styles.countLabel}>נותר</Text>
            <Text style={styles.countValue}>{fmtCountdown(untilEnd)}</Text>
          </View>
        )}

        {isActive && (
          <View style={styles.actions}>
            {/* כפתור ראשי ממותג (גרדיאנט) */}
            <ZpButton title="Extend +30m" onPress={extend} style={{ flex: 1 }} />

            {/* כפתור מסוכן/סיום — סוליד אדום ממותג */}
            <TouchableOpacity style={[styles.btn, styles.danger]} onPress={finishNow} activeOpacity={0.9}>
              <Text style={styles.btnTxt}>Finish Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: spacing.xl,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    header: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
      textAlign: 'center',
    },

    rowLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    rowLabel: {
      fontSize: 14,
      color: colors.subtext,
    },
    rowValue: {
      fontSize: 14,
      color: colors.text,
      textAlign: 'left',
    },
    priceValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },

    // סטטוס כ־Pill
    statusPill: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      fontSize: 12,
      overflow: 'hidden',
      color: colors.text,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusApproved: {
      color: colors.secondary,
      borderColor: colors.secondary,
      backgroundColor: '#F3F0FF',
    },
    statusActive: {
      color: colors.primary,
      borderColor: colors.primary,
      backgroundColor: '#EEF3FF',
    },
    statusDone: {
      color: colors.subtext,
      borderColor: colors.border,
      backgroundColor: '#F4F6FA',
    },
    statusRejected: {
      color: '#FFFFFF',
      borderColor: colors.error,
      backgroundColor: colors.error,
    },
    statusCanceled: {
      color: '#FFFFFF',
      borderColor: colors.warning,
      backgroundColor: colors.warning,
    },

    // קאונטר
    countWrap: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    countLabel: {
      fontSize: 12,
      color: colors.subtext,
      marginBottom: 4,
    },
    countValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 1,
    },

    // פעולות
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    btn: {
      flex: 1,
      borderRadius: borderRadii.md,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    danger: {
      backgroundColor: colors.error,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    btnTxt: {
      color: '#fff',
      fontWeight: '700',
    },
  });
}

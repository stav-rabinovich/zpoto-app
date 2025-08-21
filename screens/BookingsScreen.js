// screens/BookingsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as bookingsRepo from '../../data/bookingsRepo';
import BookingLifecycleWatcher from '../components/BookingLifecycleWatcher';
import { BOOKING_STATUS } from '../../data/bookingsRepo';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';

export default function BookingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const load = useCallback(async () => {
    const bs = await bookingsRepo.getAll();
    setBookings(bs.sort((a, b) => (new Date(b.startAt) - new Date(a.startAt))));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await bookingsRepo.sweepAndAutoTransition();
        await load();
      })();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await bookingsRepo.sweepAndAutoTransition();
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  function openBooking(b) {
    navigation.navigate('BookingDetail', { id: b.id });
  }

  const renderItem = ({ item }) => {
    const price = bookingsRepo.calcTotalPrice(item);
    return (
      <TouchableOpacity onPress={() => openBooking(item)} activeOpacity={0.85} style={styles.cardTap}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            {/* סטטוס בצד ימין */}
            <Text
              style={[
                styles.statusPill,
                item.status === BOOKING_STATUS.ACTIVE && styles.statusActive,
                item.status === BOOKING_STATUS.APPROVED && styles.statusApproved,
                item.status === BOOKING_STATUS.PENDING && styles.statusPending,
                item.status === BOOKING_STATUS.COMPLETED && styles.statusDone,
                item.status === BOOKING_STATUS.REJECTED && styles.statusRejected,
                item.status === BOOKING_STATUS.CANCELED && styles.statusCanceled,
              ]}
              numberOfLines={1}
            >
              {prettyStatus(item.status)}
            </Text>
            {/* כותרת לשמאל */}
            <Text style={styles.title} numberOfLines={1}>{item.title || 'הזמנה'}</Text>
          </View>

          <View style={styles.rowLine}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
            <Text style={styles.rowText}>מתאריך: {fmt(item.startAt)} עד {fmt(item.endAt)}</Text>
          </View>

          <View style={styles.rowLine}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
            <Text style={styles.rowText}>חיוב משוער: {price} ₪</Text>
          </View>

          <View style={styles.ctaRow}>
            <Text style={styles.link}>לחץ לצפייה ופעולות</Text>
            <Ionicons name="chevron-back" size={16} color={theme.colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <BookingLifecycleWatcher />

      {/* כותרת מרכזית */}
      <Text style={styles.header}>ההזמנות שלי</Text>

      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>אין עדיין הזמנות.</Text>}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        renderItem={renderItem}
      />
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
  if (!v) return '-';
  try {
    const d = new Date(v);
    const dd = d.toLocaleDateString('he-IL');
    const tt = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${dd} ${tt}`;
  } catch {
    return String(v);
  }
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    // כותרת מרכזית
    header: { fontSize: 20, fontWeight: '800', margin: spacing.lg, color: colors.text, textAlign: 'center' },

    empty: { marginHorizontal: spacing.lg, color: colors.subtext, textAlign: 'center' },

    cardTap: { marginBottom: spacing.md },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },

    // שורה עם סטטוס בצד ימין וכותרת בצד שמאל
    cardHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },

    // כותרת לשמאל
    title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'left', marginStart: spacing.sm },

    // סטטוס בצד ימין
    statusPill: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      fontSize: 12,
      overflow: 'hidden',
      color: colors.text,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      flexShrink: 0,
    },
    statusApproved: { color: colors.secondary, borderColor: colors.secondary, backgroundColor: '#F3F0FF' },
    statusActive: { color: colors.primary, borderColor: colors.primary, backgroundColor: '#EEF3FF' },
    statusPending: { color: colors.warning, borderColor: colors.warning, backgroundColor: '#FFF7E8' },
    statusDone: { color: colors.subtext, borderColor: colors.border, backgroundColor: '#F4F6FA' },
    statusRejected: { color: '#FFFFFF', borderColor: colors.error, backgroundColor: colors.error },
    statusCanceled: { color: '#FFFFFF', borderColor: colors.warning, backgroundColor: colors.warning },

    rowLine: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    rowText: { fontSize: 13, color: colors.text },

    ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.sm },
    link: { fontSize: 13, fontWeight: '700', color: colors.primary, marginEnd: 4 },
  });
}

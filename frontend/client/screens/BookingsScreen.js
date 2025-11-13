// screens/BookingsScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUserBookings, getStatusText, getStatusColor, formatBookingDate, isBookingActive, isBookingUpcoming } from '../services/api/bookings';

const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
};

export default function BookingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const { token } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timers, setTimers] = useState({}); // {bookingId: timeLeftMs}
  const intervalRef = useRef(null);
  const navigation = useNavigation();

  const load = useCallback(async () => {
    if (!token) {
      setBookings([]);
      setLoading(false);
      return;
    }
    
    try {
      console.log('📲 BookingsScreen: Starting to load bookings...');
      const result = await getUserBookings();
      console.log('📋 BookingsScreen: Received result:', {
        success: result.success,
        dataType: typeof result.data,
        isArray: Array.isArray(result.data),
        dataLength: result.data?.length || 'N/A'
      });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log(`✅ BookingsScreen: Processing ${result.data.length} bookings`);
        // מיון לפי תאריך התחלה (חדש יותר קודם)
        const sortedBookings = result.data.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        console.log(`📊 BookingsScreen: Setting ${sortedBookings.length} sorted bookings to state`);
        console.log('🔍 First booking:', sortedBookings[0] ? {
          id: sortedBookings[0].id,
          status: sortedBookings[0].status,
          startTime: sortedBookings[0].startTime
        } : 'None');
        setBookings(sortedBookings);
      } else {
        console.error('❌ BookingsScreen: Failed to load bookings or invalid data:', result);
        setBookings([]);
      }
    } catch (error) {
      console.error('❌ BookingsScreen: Load bookings error:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // // 📝 LEGACY CODE - Timer System for Manual Approvals (Commented Out)
  // // This system showed countdown timers for pending approval bookings
  // useEffect(() => {
  //   const pendingBookings = bookings.filter(b => b.status === 'PENDING_APPROVAL');
  //   if (pendingBookings.length > 0) {
  //     intervalRef.current = setInterval(() => {
  //       // Timer logic for manual approval system
  //     }, 1000);
  //   }
  //   return () => {
  //     if (intervalRef.current) {
  //       clearInterval(intervalRef.current);
  //     }
  //   };
  // }, [bookings, load]);

  // // 📝 LEGACY CODE - Timer formatting function (Commented Out)
  // const formatTimeLeft = (ms) => {
  //   if (ms <= 0) return '⏰ פג הזמן';
  //   const minutes = Math.floor(ms / (1000 * 60));
  //   const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  //   return minutes > 0 ? `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}` : `⏱️ ${seconds}s`;
  // };

  function openBooking(b) {
    navigation.navigate('BookingDetail', { id: b.id });
  }

  // // 📝 REMOVED - Extension functions moved to BookingDetailScreen only

  const renderItem = ({ item }) => {
    const parking = item.parking || {};
    const statusColor = getStatusColor(item.status);
    const isActive = isBookingActive(item);
    const isUpcoming = isBookingUpcoming(item);
    
    // בדיקה אם החניה הושלמה (עברה וההזמנה מאושרת)
    const now = new Date();
    const endTime = new Date(item.endTime);
    const isCompleted = item.status === 'CONFIRMED' && endTime < now && !isActive;
    
    return (
      <TouchableOpacity onPress={() => openBooking(item)} activeOpacity={0.85} style={styles.cardTap}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            {/* סטטוס בצד ימין */}
            <Text
              style={[
                styles.statusPill,
                { backgroundColor: statusColor + '20', color: statusColor }
              ]}
              numberOfLines={1}
            >
              {prettyStatus(item.status)}
            </Text>
            {/* כותרת לשמאל */}
            <Text style={styles.title} numberOfLines={1}>{parking.title || 'הזמנה'}</Text>
          </View>
          
          {/* // 📝 LEGACY CODE - Timer Display (Commented Out) */}
          {/* {isPendingApproval && item.approvalExpiresAt && (
            <View style={[styles.timerContainer, timeLeft <= 0 && styles.expiredTimer]}>
              <Text style={[styles.timerText, timeLeft <= 0 && styles.expiredTimerText]}>
                {formatTimeLeft(timeLeft)}
              </Text>
            </View>
          )} */}
          
          {/* אינדיקטור להזמנה פעילה, עתידית או מושלמת */}
          {isActive && (
            <View style={styles.activeIndicator}>
              <Text style={styles.activeText}>🟢 פעילה כעת</Text>
            </View>
          )}
          {!isActive && isUpcoming && (
            <View style={styles.upcomingIndicator}>
              <Text style={styles.upcomingText}>⏰ עתידית</Text>
            </View>
          )}
          {!isActive && !isUpcoming && isCompleted && (
            <View style={styles.completedIndicator}>
              <Text style={styles.completedText}>🏁 הושלמה</Text>
            </View>
          )}

          {/* // 📝 REMOVED - Extension button moved to booking detail screen only */}

          <View style={styles.rowLine}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
            <Text style={styles.rowText}>מתאריך: {fmt(item.startTime)} עד {fmt(item.endTime)}</Text>
          </View>

          <View style={styles.rowLine}>
            <Ionicons name="location-outline" size={16} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
            <Text style={styles.rowText}>{parking.address || 'כתובת לא זמינה'}</Text>
          </View>

          <View style={styles.ctaRow}>
            <Text style={styles.link}>לחץ לצפייה ופעולות</Text>
            <Ionicons name="chevron-back" size={16} color={theme.colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.subtext }}>טוען הזמנות...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Text style={styles.empty}>אין עדיין הזמנות.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: Math.max(insets.bottom + 70, theme.spacing.xl) }}
        renderItem={renderItem}
      />
    </View>
  );
}

function prettyStatus(s) {
  // שימוש בפונקציה מהשירות החדש
  return getStatusText(s) || String(s || '-');
}

function fmt(v) {
  // שימוש בפונקציה מהשירות החדש
  return formatBookingDate(v) || '-';
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    // כותרת מרכזית
    header: { fontSize: 20, fontWeight: '800', margin: spacing.lg, color: colors.text, textAlign: 'center' },

    empty: { marginHorizontal: spacing.lg, color: colors.subtext, textAlign: 'center' },
    
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl * 2,
      minHeight: 300,
      marginTop: '30%',
    },

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

    // אינדיקטורים חדשים
    activeIndicator: {
      backgroundColor: '#E8F5E8',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadii.sm,
      marginTop: spacing.xs,
      alignSelf: 'flex-start',
    },
    activeText: {
      fontSize: 12,
      color: '#2E7D32',
      fontWeight: '600',
    },
    upcomingIndicator: {
      backgroundColor: '#FFF3E0',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadii.sm,
      marginTop: spacing.xs,
      alignSelf: 'flex-start',
    },
    upcomingText: {
      fontSize: 12,
      color: '#F57C00',
      fontWeight: '600',
    },
    completedIndicator: {
      backgroundColor: '#F5F5F5',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadii.sm,
      marginTop: spacing.xs,
      alignSelf: 'flex-start',
    },
    completedText: {
      fontSize: 12,
      color: '#757575',
      fontWeight: '600',
    },

    // טיימר לבקשות ממתינות
    timerContainer: {
      backgroundColor: '#fef3c7',
      borderRadius: borderRadii.sm,
      padding: spacing.sm,
      marginTop: spacing.xs,
      borderWidth: 1,
      borderColor: '#f59e0b',
    },
    timerText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#92400e',
      textAlign: 'center',
    },
    expiredTimer: {
      backgroundColor: '#fee2e2',
      borderColor: '#f87171',
    },
    expiredTimerText: {
      color: '#dc2626',
    },

    // // 📝 REMOVED - Extension button styles moved to BookingDetailScreen only

    ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.sm },
    link: { fontSize: 13, fontWeight: '700', color: colors.primary, marginEnd: 4 },
  });
}

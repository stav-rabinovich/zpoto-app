// screens/BookingDetailScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { getBooking, getStatusText, getStatusColor, formatBookingDate, isBookingActive, isBookingUpcoming, calculateBookingPrice } from '../services/api/bookings';

export default function BookingDetailScreen({ route, navigation }) {
  const bookingId = route?.params?.id || route?.params?.bookingId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token } = useAuth();

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await getBooking(bookingId);
      if (result.success) {
        setBooking(result.data);
      } else {
        console.error('Failed to load booking:', result.error);
        setBooking(null);
      }
    } catch (error) {
      console.error('Load booking error:', error);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    // שימוש בפונקציה מהשירות החדש
    return formatBookingDate(dateString) || '-';
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '-';
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} שעות ו-${minutes} דקות`;
  };

  const getBookingStatusText = (status) => {
    // שימוש בפונקציה מהשירות החדש
    return getStatusText(status) || status;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>טוען פרטי הזמנה...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>לא נמצאה הזמנה</Text>
      </View>
    );
  }

  const totalCost = booking.totalPriceCents ? (booking.totalPriceCents / 100).toFixed(2) : '0.00';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.header}>פרטי ההזמנה</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 מיקום החניה</Text>
          <Text style={styles.value}>{booking.parking?.address || 'לא זמין'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 עלות כוללת</Text>
          <Text style={styles.priceValue}>₪{totalCost}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ משך ההזמנה</Text>
          <Text style={styles.value}>{calculateDuration(booking.startTime, booking.endTime)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 תאריך התחלה</Text>
          <Text style={styles.value}>{formatDate(booking.startTime)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 תאריך סיום</Text>
          <Text style={styles.value}>{formatDate(booking.endTime)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 מספר רכב</Text>
          <Text style={styles.value}>{booking.vehicleNumber || 'לא צוין'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 אמצעי תשלום</Text>
          <Text style={styles.value}>{booking.paymentMethod || 'כרטיס אשראי'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 סטטוס</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusText}>{getBookingStatusText(booking.status)}</Text>
          </View>
        </View>

        {/* אינדיקטורים נוספים */}
        {isBookingActive(booking) && (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeText}>🟢 ההזמנה פעילה כעת</Text>
          </View>
        )}
        
        {!isBookingActive(booking) && isBookingUpcoming(booking) && (
          <View style={styles.upcomingIndicator}>
            <Text style={styles.upcomingText}>⏰ הזמנה עתידית</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// הפונקציה מוחלפת בשירות החדש

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: spacing.lg,
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: 16,
      color: colors.subtext,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
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
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.lg,
      textAlign: 'right',
    },
    section: {
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
      textAlign: 'right',
    },
    value: {
      fontSize: 15,
      color: colors.subtext,
      textAlign: 'right',
    },
    priceValue: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.primary,
      textAlign: 'right',
    },
    statusBadge: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: borderRadii.md,
      alignSelf: 'flex-start',
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
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
    
    // אינדיקטורים חדשים
    activeIndicator: {
      backgroundColor: '#E8F5E8',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadii.md,
      marginTop: spacing.md,
      alignSelf: 'flex-start',
    },
    activeText: {
      fontSize: 14,
      color: '#2E7D32',
      fontWeight: '600',
      textAlign: 'right',
    },
    upcomingIndicator: {
      backgroundColor: '#FFF3E0',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadii.md,
      marginTop: spacing.md,
      alignSelf: 'flex-start',
    },
    upcomingText: {
      fontSize: 14,
      color: '#F57C00',
      fontWeight: '600',
      textAlign: 'right',
    },
  });
}

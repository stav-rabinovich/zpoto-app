// screens/BookingDetailScreenNew.js - מסך פרטי הזמנה מחודש
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function BookingDetailScreen({ route, navigation }) {
  const bookingId = route?.params?.id || route?.params?.bookingId;
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    if (token && bookingId) {
      loadBooking();
    }
  }, [bookingId, token]);

  const loadBooking = async () => {
    if (!bookingId || !token) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // השרת מחזיר את הנתונים ישירות או בתוך data
      const bookingData = response.data?.data || response.data;
      
      if (!bookingData) {
        Alert.alert('שגיאה', 'ההזמנה לא נמצאה');
        navigation.goBack();
        return;
      }
      
      setBooking(bookingData);
    } catch (error) {
      console.error('Load booking error:', error);
      const errorMsg = error.response?.status === 404 
        ? 'ההזמנה לא נמצאה' 
        : error.response?.status === 400
        ? 'מזהה הזמנה לא תקין'
        : 'לא הצלחנו לטעון את פרטי ההזמנה';
      
      Alert.alert('שגיאה', errorMsg, [
        { text: 'אישור', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };
  const requestExtension = async () => {
    Alert.alert(
      'בקשת הארכה',
      'האם ברצונך לבקש הארכה של 30 דקות?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'בקש הארכה',
          onPress: async () => {
            setExtending(true);
            try {
              // שליחה לשרת - בקשת הארכה
              await api.post(`/api/bookings/${bookingId}/extend`, {
                minutes: 30
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              Alert.alert('הבקשה נשלחה', 'בעל החניה יקבל את הבקשה ויחליט האם לאשר');
              loadBooking();
            } catch (error) {
              console.error('Extension request error:', error);
              Alert.alert('שגיאה', 'לא הצלחנו לשלוח את הבקשה');
            } finally {
              setExtending(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.subtext }}>טוען...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.error, fontSize: 16 }}>הזמנה לא נמצאה</Text>
      </View>
    );
  }

  const parking = booking.parking || {};
  const isActive = booking.status === 'CONFIRMED' || booking.status === 'ACTIVE';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      {/* Header Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.title}>{parking.title || 'הזמנת חניה'}</Text>
          <View style={[
            styles.statusBadge,
            booking.status === 'CONFIRMED' && { backgroundColor: theme.colors.success },
            booking.status === 'PENDING' && { backgroundColor: theme.colors.warning },
            booking.status === 'CANCELED' && { backgroundColor: theme.colors.error },
          ]}>
            <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
          </View>
        </View>

        {/* Parking Details */}
        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>{parking.address || 'כתובת לא זמינה'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            משך: {calculateDuration(booking.startTime, booking.endTime)}
          </Text>
        </View>

        {parking.priceHr && (
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>₪{parking.priceHr}/שעה</Text>
          </View>
        )}
      </View>

      {/* Extension Button - only for active bookings */}
      {isActive && (
        <TouchableOpacity
          style={[styles.extensionButton, extending && { opacity: 0.6 }]}
          onPress={requestExtension}
          disabled={extending}
          activeOpacity={0.8}
        >
          {extending ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="time-outline" size={24} color="white" style={{ marginLeft: 12 }} />
              <Text style={styles.extensionButtonText}>בקש הארכה של 30 דקות</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={{ marginTop: 16, gap: 12 }}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Bookings')}
          activeOpacity={0.8}
        >
          <Ionicons name="list" size={20} color={theme.colors.primary} style={{ marginLeft: 8 }} />
          <Text style={styles.secondaryButtonText}>כל ההזמנות שלי</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Ionicons name="home" size={20} color={theme.colors.primary} style={{ marginLeft: 8 }} />
          <Text style={styles.secondaryButtonText}>חזרה לדף הבית</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getStatusText(status) {
  switch (status) {
    case 'PENDING': return 'ממתינה';
    case 'CONFIRMED': return 'מאושרת';
    case 'ACTIVE': return 'פעילה';
    case 'COMPLETED': return 'הושלמה';
    case 'CANCELED': return 'בוטלה';
    default: return status;
  }
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateDuration(start, end) {
  if (!start || !end) return '-';
  const diff = new Date(end) - new Date(start);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} שעות ו-${minutes} דקות`;
}

function makeStyles(theme) {
  const { colors, spacing } = theme;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    statusText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      gap: 12,
    },
    infoText: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    extensionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.warning,
      padding: 18,
      borderRadius: 12,
      marginTop: 8,
    },
    extensionButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

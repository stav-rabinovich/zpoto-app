// screens/BookingDetailScreenNew.js - מסך פרטי הזמנה מחודש
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { formatBookingDate, getStatusColor, isBookingActive } from '../services/api/bookings';
import { checkExtensionEligibility, isEligibleForExtension } from '../services/api/extensions';

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
  }, [token, bookingId]);

  // רענון נתונים אחרי הארכה
  useEffect(() => {
    const refreshData = route.params?.refreshData;
    if (refreshData && token && bookingId) {
      console.log('🔄 Refreshing booking data after extension');
      loadBooking();
      
      // ניקוי הפרמטר לאחר הרענון
      navigation.setParams({ refreshData: false });
    }
  }, [route.params?.refreshData, token, bookingId]);

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
              // 📝 LEGACY CODE - Old extension API (commented out)
              // await api.post(`/api/bookings/${bookingId}/extend`, {
              //   minutes: 30
              // }, {
              //   headers: { Authorization: `Bearer ${token}` }
              // });
              
              // 🔧 NEW: Use new extension API
              console.log(`🔍 Checking extension eligibility for booking #${bookingId}`);
              const result = await checkExtensionEligibility(bookingId);
              
              console.log(`✅ Extension check result:`, result);
              
              if (!result.success) {
                console.log(`❌ Extension check failed:`, result.error);
                throw new Error(result.error || 'Extension check failed');
              }
              
              if (!result.data.canExtend) {
                console.log(`❌ Extension not allowed:`, result.data.reason);
                let message = 'לא ניתן להאריך את החניה כרגע.';
                
                switch (result.data.reason) {
                  case 'BOOKING_NOT_ACTIVE':
                    message = 'החניה אינה פעילה כרגע.';
                    break;
                  case 'PARKING_OCCUPIED':
                    message = 'החניה תפוסה לאחר זמן ההארכה.';
                    break;
                  case 'OWNER_UNAVAILABLE':
                    message = result.data.message || 'החניה לא זמינה להארכה.\n\nבעל החניה הגדיר שעות פעילות מוגבלות לחניה זו.\n\nההארכה המבוקשת תחרוג מהשעות הפעילות שקבע בעל החניה.';
                    break;
                  case 'TOO_CLOSE_TO_END':
                    message = 'נשארו פחות מ-10 דקות - לא ניתן להאריך.';
                    break;
                  case 'UNAUTHORIZED':
                    message = 'אין הרשאה להאריך חניה זו.';
                    break;
                }
                
                // הצגת הודעה ידידותית למשתמש
                const alertTitle = result.data.reason === 'OWNER_UNAVAILABLE' ? 'הארכה לא זמינה' : 'לא ניתן להאריך';
                Alert.alert(alertTitle, message);
                return;
              }
              
              // מעבר לתשלום הארכה
              navigation.navigate('Payment', {
                type: 'extension',
                bookingId: booking.id,
                parkingId: booking.parking?.id,
                parkingTitle: booking.parking?.title || 'חניה',
                amount: result.data.extensionPrice,
                extensionMinutes: 30,
                newEndTime: result.data.newEndTime,
                description: `הארכת חניה ב-30 דקות - ${booking.parking?.title || 'חניה'}`
              });
            } catch (error) {
              console.error('Extension request error:', error);
              Alert.alert('שגיאה', error.message || 'לא הצלחנו לשלוח את הבקשה');
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

  // תיקון חישוב - שימוש בנתונים הנכונים מ-OperationalFee
  let parkingCost = 0;
  let operationalFee = 0;
  let totalCost = 0;
  let hasCoupon = false;
  let couponDiscount = 0;
  
  // בדיקה אם יש נתוני OperationalFee (הדרך הנכונה)
  if (booking.operationalFee) {
    parkingCost = booking.operationalFee.parkingCostCents / 100;
    operationalFee = booking.operationalFee.operationalFeeCents / 100;
    totalCost = booking.operationalFee.totalPaymentCents / 100;
  } else {
    // fallback - אם אין OperationalFee, נחשב בצורה פשוטה
    // נניח שהסכום הכולל כולל כבר דמי תפעול, אז נחלק אותו
    const totalAmount = booking.totalPriceCents ? (booking.totalPriceCents / 100) : 0;
    parkingCost = totalAmount / 1.1; // מחלקים ב-1.1 כדי לקבל את העלות הבסיסית
    operationalFee = parkingCost * 0.1; // 10% דמי תפעול
    totalCost = totalAmount;
  }
  
  // בדיקה אם יש שימוש בקופון
  if (booking.couponUsages && booking.couponUsages.length > 0) {
    const couponUsage = booking.couponUsages[0];
    hasCoupon = true;
    couponDiscount = couponUsage.discountAmountCents / 100;
  }
  
  console.log('💰 Fixed calculation using OperationalFee data:', {
    hasOperationalFee: !!booking.operationalFee,
    parkingCost,
    operationalFee,
    couponDiscount,
    totalCost,
    hasCoupon
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      {/* מלבן עליון עם פרטי ההזמנה */}
      <View style={styles.mainCard}>
        {/* שם החניה */}
        <Text style={styles.parkingTitle}>{parking.title || parking.address || 'חניה'}</Text>
        
        {/* סטטוס מאושרת */}
        <Text style={styles.approvedStatus}>מאושרת</Text>
        
        {/* תאריך ושעה */}
        <View style={styles.dateTimeSection}>
          <Text style={styles.dateTimeText}>
            {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
          </Text>
        </View>
        
        {/* עלות מעודכנת */}
        <View style={styles.costSection}>
          <Text style={styles.costLabel}>עלות:</Text>
          <Text style={styles.costValue}>₪{totalCost.toFixed(2)} סה"כ</Text>
        </View>
        
        {/* פירוט מחיר - תיקון חישוב */}
        <View style={styles.priceBreakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownValue}>₪{parkingCost.toFixed(2)}</Text>
            <Text style={styles.breakdownLabel}>עלות חניה (כולל הארכות):</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownValue}>₪{operationalFee.toFixed(2)}</Text>
            <Text style={styles.breakdownLabel}>דמי תפעול (10%):</Text>
          </View>
          {hasCoupon && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownValue, { color: '#4CAF50' }]}>-₪{couponDiscount.toFixed(2)}</Text>
              <Text style={[styles.breakdownLabel, { color: '#4CAF50' }]}>הנחת קופון:</Text>
            </View>
          )}
          <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8, marginTop: 8 }]}>
            <Text style={[styles.breakdownValue, { fontWeight: '700', color: '#2196F3' }]}>₪{totalCost.toFixed(2)}</Text>
            <Text style={[styles.breakdownLabel, { fontWeight: '600' }]}>סה"כ לתשלום:</Text>
          </View>
        </View>
        
        {/* פרטי קופון אם קיים */}
        {booking.couponUsages && booking.couponUsages.length > 0 && (
          <View style={styles.couponSection}>
            <View style={styles.couponBadge}>
              <Ionicons name="pricetag" size={16} color="#4CAF50" />
              <Text style={styles.couponText}>
                קופון {booking.couponUsages[0].coupon?.code} - חסכת ₪{(booking.couponUsages[0].discountAmountCents / 100).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* פרטים נוספים */}
      <View style={styles.detailsCard}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>{parking.address || 'כתובת לא זמינה'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            משך: {calculateDuration(booking.startTime, booking.endTime)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="car" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>רכב: {booking.licensePlate || 'לא צוין'}</Text>
        </View>
      </View>

      {/* Extension Button - for eligible active and upcoming bookings */}
      {isEligibleForExtension(booking) && (
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
    // מלבן עליון עם פרטי ההזמנה העיקריים
    mainCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 32,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    parkingTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    approvedStatus: {
      fontSize: 18,
      fontWeight: '600',
      color: '#4CAF50',
      textAlign: 'center',
      marginBottom: 20,
    },
    dateTimeSection: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    dateTimeText: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '500',
    },
    costSection: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    costLabel: {
      fontSize: 18,
      color: colors.subtext,
      fontWeight: '500',
    },
    costValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primary,
    },
    
    // סטיילים לתצוגת קופון
    couponSection: {
      marginTop: 16,
    },
    couponBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#E8F5E8',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      gap: 6,
    },
    couponText: {
      fontSize: 14,
      color: '#2E7D32',
      fontWeight: '600',
    },
    
    // סטיילים לפירוט מחיר
    priceBreakdown: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
    },
    breakdownTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    breakdownLabel: {
      fontSize: 14,
      color: colors.subtext,
      flex: 1,
      textAlign: 'right',
    },
    breakdownValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'left',
    },
    
    // כרטיס פרטים נוספים
    detailsCard: {
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
      backgroundColor: colors.primary,
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 16,
      marginTop: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    extensionButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 8,
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

// screens/OwnerPendingScreen.js - עכשיו מסך "חניות עתידיות"
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../services/api/owner';
// import { fetchPendingApprovalBookings, approveBookingRequest, rejectBookingRequest } from '../services/api/owner'; // COMMENTED OUT
import { formatBookingDate } from '../services/api/bookings';
// import { getStatusText, getStatusColor } from '../services/api/bookings'; // COMMENTED OUT
import api from '../utils/api';

export default function OwnerPendingScreen({ navigation }) {
  const theme = useTheme();
  const { isAuthenticated, handleUserBlocked, isLoggingOut, blockingInProgress, token } = useAuth();
  // const [pending, setPending] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // const [timers, setTimers] = useState({}); // {bookingId: timeLeftMs}
  // const [activeTab, setActiveTab] = useState('pending'); // 'pending' או 'upcoming'
  // const intervalRef = useRef(null);

  // בדיקת authentication בכניסה למסך
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('❌ Owner access denied - redirecting to home');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      return;
    }
  }, [isAuthenticated, navigation]);

  // בדיקת חסימה מיידית בכניסה למסך
  useEffect(() => {
    const checkBlocking = async () => {
      if (!isAuthenticated || isLoggingOut || blockingInProgress) {
        return;
      }
      
      // טעינה ראשונית שגם בודקת חסימה
      await load();
    };

    checkBlocking();
  }, [isAuthenticated, isLoggingOut, blockingInProgress, load]);

  /*
  // טעינת בקשות ממתינות - COMMENTED OUT
  const loadPending = useCallback(async () => {
    if (!isAuthenticated || isLoggingOut || blockingInProgress) {
      console.log('🔐 Skipping load - not authenticated, logging out, or blocking in progress');
      return;
    }

    try {
      const result = await fetchPendingApprovalBookings();
      if (result.success) {
        const sortedPending = result.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPending(sortedPending);
      } else {
        if (result.error?.response?.status === 403) {
          await handleUserBlocked(navigation);
          return;
        }
        if (!isLoggingOut) {
          console.log('⚠️ Failed to load bookings (non-blocking error):', result.error?.message || 'Unknown error');
        }
        setPending([]);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        await handleUserBlocked(navigation);
        return;
      }
      if (!isLoggingOut) {
        console.log('⚠️ Load pending bookings error (non-blocking):', error.message || 'Unknown error');
      }
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isLoggingOut, blockingInProgress, handleUserBlocked, navigation]);
  */


  // טעינת הזמנות עתידיות
  const loadUpcomingBookings = useCallback(async () => {
    if (!isAuthenticated || isLoggingOut || blockingInProgress) {
      return;
    }

    try {
      const response = await api.get('/api/owner/bookings/upcoming', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const bookings = response.data.data || [];
      const revenue = response.data.revenue || null;
      
      const sortedBookings = bookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setUpcomingBookings(sortedBookings);
      setRevenueData(revenue);
      
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('🚫 User blocked in upcoming bookings - using central handler');
        await handleUserBlocked(navigation);
        return;
      }
      
      console.error('Load upcoming bookings error:', error);
      setUpcomingBookings([]);
    }
  }, [isAuthenticated, isLoggingOut, blockingInProgress, handleUserBlocked, navigation, token]);

  // טעינה מאוחדת - רק הזמנות עתידיות
  const load = useCallback(async () => {
    setLoading(true);
    try {
      await loadUpcomingBookings();
    } finally {
      setLoading(false);
    }
  }, [loadUpcomingBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>טוען הזמנות עתידיות…</Text>
      </View>
    );
  }

  // רנדור הזמנה עתידית
  const renderUpcomingBooking = ({ item }) => {
    const startDate = new Date(item.startTime);
    const endDate = new Date(item.endTime);
    const now = new Date();
    const hoursUntil = Math.max(0, Math.floor((startDate - now) / (1000 * 60 * 60)));
    
    // חישוב משך ההזמנה
    const durationHours = Math.ceil((endDate - startDate) / (1000 * 60 * 60));
    // בעל החניה רואה את הסכום שהוא מקבל (אחרי עמלה, ללא דמי תפעול)
    const parkingCost = item.totalPriceCents ? (item.totalPriceCents / 100) : 0;
    const ownerAmount = item.netOwnerCents ? (item.netOwnerCents / 100) : (parkingCost * 0.85); // 85% אחרי עמלה
    
    return (
      <View style={styles.upcomingCard}>
        <View style={styles.cardHeader}>
          <View style={styles.bookingIdContainer}>
            <Text style={styles.title}>הזמנה #{item.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.statusText}>מאושרת</Text>
            </View>
          </View>
          <Text style={styles.amountText}>₪{ownerAmount.toFixed(2)}</Text>
        </View>
        
        {/* פרטי לקוח */}
        <View style={styles.customerSection}>
          <View style={styles.customerInfo}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.customerName}>{item.user?.name || 'לא ידוע'}</Text>
          </View>
          {item.user?.email && (
            <Text style={styles.customerEmail}>{item.user.email}</Text>
          )}
        </View>
        
        {/* פרטי חניה */}
        <View style={styles.parkingSection}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.parkingInfo}>{item.parking?.title || item.parking?.address}</Text>
        </View>
        
        {/* פרטי זמן */}
        <View style={styles.timeSection}>
          <View style={styles.timeRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.timeText}>
              {formatBookingDate(item.startTime)} - {formatBookingDate(item.endTime)}
            </Text>
          </View>
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.durationText}>{durationHours} שעות</Text>
          </View>
        </View>
        
        {/* אינדיקטור זמן עד ההזמנה */}
        {hoursUntil > 0 && (
          <View style={styles.timeUntilContainer}>
            <Ionicons name="hourglass-outline" size={16} color="#fff" />
            <Text style={styles.timeUntilText}>
              {hoursUntil < 24 ? `בעוד ${hoursUntil} שעות` : `בעוד ${Math.floor(hoursUntil / 24)} ימים`}
            </Text>
          </View>
        )}
        
        {/* כפתורי פעולה */}
        <View style={styles.actionsRow}>
          {item.licensePlate && (
            <View style={styles.licensePlateContainer}>
              <Ionicons name="car-outline" size={16} color="#6B7280" />
              <Text style={styles.licensePlateText}>{item.licensePlate}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* widget צפי הכנסות */}
      {revenueData && (
        <View style={styles.revenueWidget}>
          <Text style={styles.revenueTitle}>צפי הכנסות</Text>
          <View style={styles.revenueCards}>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueAmount}>₪{revenueData.total.toFixed(0)}</Text>
              <Text style={styles.revenueLabel}>סה"כ עתידי</Text>
              <Text style={styles.revenueSubtext}>{revenueData.bookingsCount} הזמנות</Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueAmount}>₪{revenueData.thisWeek.toFixed(0)}</Text>
              <Text style={styles.revenueLabel}>השבוע</Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueAmount}>₪{revenueData.thisMonth.toFixed(0)}</Text>
              <Text style={styles.revenueLabel}>החודש</Text>
            </View>
          </View>
        </View>
      )}

      {/* תוכן הזמנות עתידיות */}
      {upcomingBookings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={64} color="#94A3B8" />
          <Text style={styles.emptyTitle}>אין הזמנות עתידיות</Text>
          <Text style={styles.emptySubtitle}>הזמנות מאושרות יופיעו כאן</Text>
        </View>
      ) : (
        <FlatList
          data={upcomingBookings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUpcomingBooking}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ padding: 12 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  
  // כותרת - מעוצב עם צבעי המותג
  header: {
    backgroundColor: '#0B6AA8',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#0B6AA8',
  },
  
  // הזמנות עתידיות - עיצוב מינימליסטי עדין
  upcomingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0B6AA8',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  timeUntilContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B6AA8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginTop: 12,
    gap: 6,
    shadowColor: '#0B6AA8',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  timeUntilText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: '#0B6AA8',
  },
  phoneText: {
    color: '#0B6AA8',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Empty states
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // widget צפי הכנסות - עיצוב מותג עדין
  revenueWidget: {
    margin: 16,
    backgroundColor: '#F8FAFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0B6AA8',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  revenueTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B6AA8',
    marginBottom: 16,
    textAlign: 'center',
  },
  revenueCards: {
    flexDirection: 'row',
    gap: 8,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0F2FE',
    marginHorizontal: 4,
  },
  revenueAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B6AA8',
    marginBottom: 4,
  },
  revenueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  revenueSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  
  // כרטיסי הזמנות עתידיות מפורטים
  bookingIdContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  customerSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 22,
  },
  parkingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  parkingInfo: {
    fontSize: 14,
    color: '#1F2937',
  },
  timeSection: {
    marginTop: 8,
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    color: '#1F2937',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
  },
  licensePlateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  licensePlateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#f7f7fb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ececf1',
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  row: { fontSize: 14, color: '#333', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  approve: { backgroundColor: '#16a34a' },
  reject: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '600' },
  
  // טיימר
  timerContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    textAlign: 'center',
  },
  
  // כרטיס שפג זמנו
  expiredCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  expiredTimer: {
    backgroundColor: '#fee2e2',
    borderColor: '#f87171',
  },
  expiredTimerText: {
    color: '#dc2626',
  },
  
  // כפתורים מושבתים
  disabledBtn: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  disabledBtnText: {
    color: '#9ca3af',
  },
});

/*

COMMENTED OUT FUNCTIONS FOR FUTURE USE - קוד בקשות בהמתנה שמור להערה:

עדכון טיימרים כל שנייה:
useEffect(() => {
  if (pending.length > 0) {
    intervalRef.current = setInterval(() => {
      setTimers(prevTimers => {
        const newTimers = { ...prevTimers };
        let hasChanges = false;
        
        pending.forEach(booking => {
          if (booking.approvalExpiresAt) {
            const expiresAt = new Date(booking.approvalExpiresAt).getTime();
            const now = Date.now();
            const timeLeft = Math.max(0, expiresAt - now);
            
            if (newTimers[booking.id] !== timeLeft) {
              newTimers[booking.id] = timeLeft;
              hasChanges = true;
            }
            
            if (timeLeft === 0 && prevTimers[booking.id] > 0) {
              setTimeout(() => load(), 1000);
            }
          }
        });
        
        return hasChanges ? newTimers : prevTimers;
      });
    }, 1000);
  }
  
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, [pending, load]);

פונקציה לפורמט זמן שנותר:
const formatTimeLeft = (ms) => {
  if (ms <= 0) return '⏰ פג הזמן';
  
  const minutes = Math.floor(ms / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  if (minutes > 0) {
    return `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `⏱️ ${seconds}s`;
  }
};

פונקציות אישור ודחיית הזמנות:
async function approve(bookingId) {
  try {
    const result = await approveBookingRequest(bookingId);
    if (result.success) {
      Alert.alert('✅ אושר', 'ההזמנה אושרה בהצלחה! המשתמש יקבל התראה.');
      await load();
    } else {
      Alert.alert('❌ שגיאה', result.error || 'לא הצלחנו לאשר. נסה שוב.');
    }
  } catch (error) {
    console.log('⚠️ Approve booking error:', error.message || 'Unknown error');
    Alert.alert('❌ שגיאה', 'אירעה שגיאה באישור ההזמנה');
  }
}

async function reject(bookingId) {
  Alert.prompt(
    '❌ דחיית בקשה',
    'אנא ציין סיבה לדחייה (אופציונלי):',
    [
      { text: 'ביטול', style: 'cancel' },
      { 
        text: 'דחה', 
        onPress: async (reason) => {
          try {
            const result = await rejectBookingRequest(bookingId, reason || 'לא צוינה סיבה');
            if (result.success) {
              Alert.alert('❌ נדחה', 'ההזמנה נדחתה. המשתמש יקבל התראה.');
              await load();
            } else {
              Alert.alert('❌ שגיאה', result.error || 'לא הצלחנו לדחות. נסה שוב.');
            }
          } catch (error) {
            console.log('⚠️ Reject booking error:', error.message || 'Unknown error');
            Alert.alert('❌ שגיאה', 'אירעה שגיאה בדחיית ההזמנה');
          }
        }
      }
    ],
    'plain-text'
  );
}

רנדור פריטים ממתינים לאישור:
const renderPendingItem = ({ item }) => {
  const hours = Math.ceil((new Date(item.endTime) - new Date(item.startTime)) / (1000 * 60 * 60));
  const total = (item.totalPriceCents || 0) / 100;
  const timeLeft = timers[item.id] || 0;
  const isExpired = timeLeft <= 0;
  
  return JSX עם טיימר, כפתורי אישור/דחייה ופרטי הזמנה

*/

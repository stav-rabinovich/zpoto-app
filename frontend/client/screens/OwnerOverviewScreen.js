// screens/OwnerOverviewScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';


// צבעי Zpoto
const ZPOTO = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  border: '#C7DEFF',
};


export default function OwnerOverviewScreen({ navigation }) {
  const { user, isAuthenticated, isOwner, logout, handleUserBlocked, isLoggingOut, blockingInProgress } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Commission data
  const [commissionData, setCommissionData] = useState(null);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Bookings data for the selected month
  const [monthlyBookings, setMonthlyBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // בדיקת authentication
  useEffect(() => {
    if (!isAuthenticated || !isOwner) {
      console.log('❌ Owner access denied - redirecting to home');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      return;
    }
  }, [isAuthenticated, isOwner, navigation]);

  // טעינת עמלות חודשיות
  const loadCommissions = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    
    setCommissionsLoading(true);
    try {
      const response = await api.get(
        `/api/commissions/owner/${user.id}/commissions?year=${selectedMonth.year}&month=${selectedMonth.month}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      if (response.data.success) {
        setCommissionData(response.data.data);
        console.log('💰 Commission data loaded for overview:', response.data.data.summary);
      }
    } catch (error) {
      console.log('💰 Error loading commissions for overview:', error.message);
    } finally {
      setCommissionsLoading(false);
    }
  }, [isAuthenticated, user, selectedMonth]);

  // טעינת הזמנות החודש
  const loadMonthlyBookings = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    
    setBookingsLoading(true);
    try {
      const response = await api.get('/api/owner/bookings');
      
      if (response.data && Array.isArray(response.data.data)) {
        const allBookings = response.data.data;
        
        // סינון הזמנות לחודש הנבחר
        const monthlyFiltered = allBookings.filter(booking => {
          const bookingDate = new Date(booking.startTime);
          return bookingDate.getFullYear() === selectedMonth.year && 
                 bookingDate.getMonth() + 1 === selectedMonth.month;
        });
        
        // מיון לפי תאריך (החדשות ראשונות)
        monthlyFiltered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        setMonthlyBookings(monthlyFiltered);
        console.log(`📅 Loaded ${monthlyFiltered.length} bookings for ${selectedMonth.month}/${selectedMonth.year}`);
      }
    } catch (error) {
      console.log('📅 Error loading monthly bookings:', error.message);
      setMonthlyBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [isAuthenticated, user, selectedMonth]);

  useEffect(() => { 
    loadCommissions();
    loadMonthlyBookings();
  }, [loadCommissions, loadMonthlyBookings, selectedMonth]);

  // אם המשתמש לא מחובר או לא בעל חניה, לא מציג כלום
  if (!isAuthenticated || !isOwner) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* כותרת במרכז */}
      <Text style={styles.header}>הכנסות חודשיות</Text>

      {/* הכנסות חודשיות */}
      <View style={styles.revenueSection}>
        <View style={styles.revenueHeader}>
          <View style={styles.monthSelector}>
            <TouchableOpacity 
              onPress={() => setSelectedMonth(prev => {
                let newMonth = prev.month - 1;
                let newYear = prev.year;
                if (newMonth < 1) { newMonth = 12; newYear--; }
                return { year: newYear, month: newMonth };
              })}
              style={styles.monthButton}
            >
              <Ionicons name="chevron-back" size={20} color={ZPOTO.primary} />
            </TouchableOpacity>
            
            <Text style={styles.monthText}>
              {new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('he-IL', {
                month: 'long',
                year: 'numeric'
              })}
            </Text>
            
            <TouchableOpacity 
              onPress={() => setSelectedMonth(prev => {
                let newMonth = prev.month + 1;
                let newYear = prev.year;
                if (newMonth > 12) { newMonth = 1; newYear++; }
                return { year: newYear, month: newMonth };
              })}
              style={styles.monthButton}
            >
              <Ionicons name="chevron-forward" size={20} color={ZPOTO.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {commissionsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ZPOTO.primary} />
            <Text style={styles.loadingText}>טוען נתוני הכנסות...</Text>
          </View>
        ) : commissionData ? (
          <View style={styles.revenueCards}>
            <View style={styles.mainRevenueCard}>
              <Text style={styles.mainRevenueLabel}>נטו לתשלום</Text>
              <Text style={styles.mainRevenueValue}>₪{commissionData.summary.totalNetOwnerILS}</Text>
            </View>
            
            <View style={styles.secondaryCards}>
              <View style={styles.secondaryCard}>
                <Text style={styles.secondaryLabel}>עמלת זפוטו</Text>
                <Text style={styles.secondaryValue}>₪{commissionData.summary.totalCommissionILS}</Text>
              </View>
              <View style={styles.secondaryCard}>
                <Text style={styles.secondaryLabel}>הזמנות</Text>
                <Text style={styles.secondaryValue}>{commissionData.summary.count}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={ZPOTO.border} />
            <Text style={styles.emptyText}>אין הכנסות לחודש זה</Text>
          </View>
        )}

        {/* טיפ */}
        <View style={styles.tipContainer}>
          <Ionicons name="bulb-outline" size={16} color={ZPOTO.primary} />
          <Text style={styles.tipText}>
            טיפ: הורד מחיר ב־10% לשעות חלשות כדי למקסם תפוסה
          </Text>
        </View>
      </View>

      {/* הזמנות החודש */}
      <View style={styles.bookingsSection}>
        <Text style={styles.bookingsTitle}>הזמנות החודש</Text>
        
        {bookingsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={ZPOTO.primary} />
            <Text style={styles.loadingText}>טוען הזמנות...</Text>
          </View>
        ) : monthlyBookings.length > 0 ? (
          <View style={styles.bookingsList}>
            {monthlyBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingTitle}>
                    {booking.parking?.title || booking.parking?.address || 'הזמנה'}
                  </Text>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: getStatusColor(booking.status) 
                  }]}>
                    <Text style={styles.statusText}>
                      {getStatusText(booking.status)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.bookingDetails}>
                  <View style={styles.bookingRow}>
                    <Ionicons name="calendar" size={14} color="#666" />
                    <Text style={styles.bookingDetailText}>
                      {formatBookingDate(booking.startTime, booking.endTime)}
                    </Text>
                  </View>
                  
                  <View style={styles.bookingRow}>
                    <Ionicons name="cash" size={14} color="#666" />
                    <Text style={styles.bookingDetailText}>
                      ₪{((booking.totalPriceCents || 0) / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBookingsContainer}>
            <Ionicons name="calendar-outline" size={32} color="#ccc" />
            <Text style={styles.emptyBookingsText}>
              אין הזמנות לחודש זה
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// פונקציות עזר
const getStatusColor = (status) => {
  switch (status) {
    case 'CONFIRMED': return '#10b981';
    case 'COMPLETED': return '#059669';
    case 'PENDING': return '#f59e0b';
    case 'REJECTED': return '#ef4444';
    case 'CANCELED': return '#6b7280';
    default: return '#6b7280';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'CONFIRMED': return 'מאושרת';
    case 'COMPLETED': return 'הושלמה';
    case 'PENDING': return 'ממתינה';
    case 'REJECTED': return 'נדחתה';
    case 'CANCELED': return 'בוטלה';
    default: return status;
  }
};

const formatBookingDate = (startTime, endTime) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startDate = start.toLocaleDateString('he-IL');
    const startHour = start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const endHour = end.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    
    return `${startDate} ${startHour} - ${endHour}`;
  } catch {
    return 'תאריך לא זמין';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // כותרת ראשית – במרכז
  header: { fontSize: 20, fontWeight: '700', margin: 16, textAlign: 'center' },

  // Loading
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // הכנסות חודשיות
  revenueSection: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  revenueTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${ZPOTO.primary}08`,
    borderRadius: 12,
    padding: 4,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: ZPOTO.primary,
    minWidth: 120,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  revenueCards: {
    gap: 16,
  },
  mainRevenueCard: {
    backgroundColor: `${ZPOTO.primary}10`,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${ZPOTO.primary}20`,
  },
  mainRevenueLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  mainRevenueValue: {
    fontSize: 36,
    fontWeight: '800',
    color: ZPOTO.primary,
  },
  secondaryCards: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  secondaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${ZPOTO.primary}05`,
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    marginStart: 8,
    flex: 1,
  },

  // הזמנות החודש
  bookingsSection: {
    margin: 16,
    marginTop: 8,
  },
  bookingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  bookingsList: {
    gap: 8,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginEnd: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  bookingDetails: {
    gap: 4,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyBookingsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyBookingsText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});

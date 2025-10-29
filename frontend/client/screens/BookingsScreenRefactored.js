/**
 * BookingsScreen - גרסה מחודשת עם Hooks חדשים
 * דוגמה לשימוש ב-AppContext ו-custom hooks
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Hooks חדשים
import { useApp } from '../contexts/AppContext';
import { useScreenState } from '../hooks/useScreenState';
import { useBookingTimer } from '../hooks/useBookingTimer';
import { useAuth } from '../contexts/AuthContext';

// Services
import { getMyBookings } from '../services/api/bookings';

export default function BookingsScreenRefactored() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { token } = useAuth();
  
  // שימוש ב-AppContext לstate משותף
  const { activeBooking, setActiveBookingData } = useApp();
  
  // שימוש ב-useScreenState לניהול loading/refreshing
  const { 
    loading, 
    refreshing, 
    error, 
    executeWithLoading, 
    executeWithRefreshing 
  } = useScreenState('BookingsScreen');
  
  // State מקומי
  const [bookings, setBookings] = React.useState([]);
  
  // שימוש ב-useBookingTimer לטיימרים
  const { 
    timers, 
    formatTimeLeft, 
    isBookingActive, 
    isBookingUpcoming 
  } = useBookingTimer(bookings);
  
  // טעינת הזמנות
  const loadBookings = useCallback(async () => {
    if (!token) return;
    
    const response = await getMyBookings();
    if (response.success) {
      setBookings(response.data);
      
      // עדכון הזמנה פעילה ב-AppContext
      const activeBookingData = response.data.find(isBookingActive);
      if (activeBookingData) {
        setActiveBookingData(activeBookingData);
      }
    }
  }, [token, setActiveBookingData, isBookingActive]);
  
  // טעינה ראשונית
  useEffect(() => {
    executeWithLoading(loadBookings);
  }, [executeWithLoading, loadBookings]);
  
  // רענון
  const handleRefresh = useCallback(() => {
    executeWithRefreshing(loadBookings);
  }, [executeWithRefreshing, loadBookings]);
  
  // ניווט לפרטי הזמנה
  const navigateToBookingDetail = useCallback((booking) => {
    navigation.navigate('BookingDetail', { id: booking.id });
  }, [navigation]);
  
  // רינדור פריט הזמנה
  const renderBookingItem = useCallback(({ item: booking }) => {
    const timeLeft = timers[booking.id];
    const active = isBookingActive(booking);
    const upcoming = isBookingUpcoming(booking);
    
    return (
      <TouchableOpacity
        style={[
          styles.bookingCard,
          active && styles.activeBookingCard,
          upcoming && styles.upcomingBookingCard
        ]}
        onPress={() => navigateToBookingDetail(booking)}
      >
        <View style={styles.bookingHeader}>
          <Text style={styles.parkingTitle}>
            {booking.parking?.title || 'חניה'}
          </Text>
          <View style={[
            styles.statusBadge,
            active && styles.activeStatusBadge,
            upcoming && styles.upcomingStatusBadge
          ]}>
            <Text style={styles.statusText}>
              {active ? 'פעיל' : upcoming ? 'עתידי' : 'הסתיים'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.address}>
          {booking.parking?.address}
        </Text>
        
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>
            {formatTimeLeft(timeLeft)}
          </Text>
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={theme.colors.subtext} 
          />
        </View>
      </TouchableOpacity>
    );
  }, [timers, isBookingActive, isBookingUpcoming, navigateToBookingDetail, formatTimeLeft, theme.colors.subtext]);
  
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => executeWithLoading(loadBookings)}
        >
          <Text style={styles.retryButtonText}>נסה שוב</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>טוען הזמנות...</Text>
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.subtext} />
              <Text style={styles.emptyText}>אין הזמנות</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  activeBookingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#28A745'
  },
  upcomingBookingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  parkingTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#6C757D'
  },
  activeStatusBadge: {
    backgroundColor: '#28A745'
  },
  upcomingStatusBadge: {
    backgroundColor: '#FFC107'
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  address: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 12
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingText: {
    fontSize: 16,
    color: '#6C757D'
  },
  emptyText: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 8
  }
};

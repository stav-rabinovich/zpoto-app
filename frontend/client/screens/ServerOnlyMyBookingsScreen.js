/**
 * מסך ההזמנות שלי - Server-Only Architecture
 * כל הנתונים מהשרת, אין שמירה מקומית כלל
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import dayjs from 'dayjs';
import 'dayjs/locale/he';

import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from '../hooks/useOfflineMode';
import useServerOnlyBookings from '../hooks/useServerOnlyBookings';
import BookingErrorScreen from '../components/bookings/BookingErrorScreen';
import OfflineScreen from '../components/offline/OfflineScreen';

dayjs.locale('he');

const FILTER_OPTIONS = [
  { key: 'all', label: 'הכל', icon: 'list-outline' },
  { key: 'active', label: 'פעילות', icon: 'time-outline' },
  { key: 'past', label: 'עברו', icon: 'checkmark-circle-outline' },
  { key: 'cancelled', label: 'בוטלו', icon: 'close-circle-outline' },
];

export default function ServerOnlyMyBookingsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  
  const { user, isAuthenticated } = useAuthContext();
  const { isFullyOnline, isOfflineMode, retryConnection } = useOfflineMode();
  
  const {
    bookings,
    loading,
    refreshing,
    error,
    loadBookings,
    refreshBookings,
    cancelBooking,
    getFilteredBookings,
    getBookingStats,
    hasActiveBooking,
    getCurrentBooking,
    isEmpty,
    isOnline,
    canCreateBooking,
    statusMessage
  } = useServerOnlyBookings();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  // טעינה ראשונית
  useEffect(() => {
    if (isAuthenticated && isFullyOnline) {
      loadBookings();
    }
  }, [isAuthenticated, isFullyOnline, loadBookings]);

  /**
   * רענון הזמנות
   */
  const handleRefresh = useCallback(async () => {
    if (!isFullyOnline) {
      Alert.alert('אין חיבור לשרת', 'בדוק את החיבור לאינטרנט ונסה שוב.');
      return;
    }
    
    await refreshBookings();
  }, [isFullyOnline, refreshBookings]);

  /**
   * ביטול הזמנה
   */
  const handleCancelBooking = useCallback(async (booking) => {
    if (!isFullyOnline) {
      Alert.alert('אין חיבור לשרת', 'ביטול הזמנה דורש חיבור לאינטרנט.');
      return;
    }

    Alert.alert(
      'ביטול הזמנה',
      `האם אתה בטוח שברצונך לבטל את ההזמנה ב${booking.parking?.title || 'חניה'}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, בטל',
          style: 'destructive',
          onPress: async () => {
            setCancellingBookingId(booking.id);
            
            try {
              const result = await cancelBooking(booking.id);
              
              if (result.success) {
                Alert.alert('הזמנה בוטלה', 'ההזמנה בוטלה בהצלחה.');
              } else {
                Alert.alert('שגיאה', result.error);
              }
            } catch (error) {
              Alert.alert('שגיאה', 'אירעה שגיאה בביטול ההזמנה.');
            } finally {
              setCancellingBookingId(null);
            }
          }
        }
      ]
    );
  }, [isFullyOnline, cancelBooking]);

  /**
   * פתיחת פרטי הזמנה
   */
  const handleBookingPress = useCallback((booking) => {
    navigation.navigate('BookingDetails', { bookingId: booking.id });
  }, [navigation]);

  /**
   * יצירת הזמנה חדשה
   */
  const handleCreateBooking = useCallback(() => {
    if (!canCreateBooking) {
      if (!isAuthenticated) {
        navigation.navigate('Login');
      } else {
        Alert.alert('אין חיבור לשרת', 'יצירת הזמנה דורשת חיבור לאינטרנט.');
      }
      return;
    }
    
    navigation.navigate('SearchParking');
  }, [canCreateBooking, isAuthenticated, navigation]);

  /**
   * רנדור פריט הזמנה
   */
  const renderBookingItem = useCallback(({ item: booking }) => {
    const isActive = booking.status === 'confirmed' && new Date(booking.endTime) > new Date();
    const isPast = new Date(booking.endTime) <= new Date();
    const isCancelled = booking.status === 'cancelled';
    const isCancelling = cancellingBookingId === booking.id;
    
    const statusColor = isCancelled ? colors.error :
                       isActive ? colors.success :
                       isPast ? colors.subtext :
                       colors.warning;

    const statusText = isCancelled ? 'בוטלה' :
                      isActive ? 'פעילה' :
                      isPast ? 'הסתיימה' :
                      'ממתינה';

    return (
      <TouchableOpacity
        style={[styles.bookingItem, { backgroundColor: colors.surface }]}
        onPress={() => handleBookingPress(booking)}
        disabled={isCancelling}
      >
        {/* כותרת וסטטוס */}
        <View style={styles.bookingHeader}>
          <View style={styles.bookingTitle}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={[styles.bookingTitleText, { color: colors.text }]}>
              {booking.parking?.title || 'חניה'}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* זמנים */}
        <View style={styles.bookingTime}>
          <Ionicons name="time-outline" size={16} color={colors.subtext} />
          <Text style={[styles.timeText, { color: colors.subtext }]}>
            {dayjs(booking.startTime).format('DD/MM/YYYY HH:mm')} - {dayjs(booking.endTime).format('HH:mm')}
          </Text>
        </View>

        {/* רכב ומחיר */}
        <View style={styles.bookingDetails}>
          <View style={styles.vehicleInfo}>
            <Ionicons name="car-outline" size={16} color={colors.subtext} />
            <Text style={[styles.vehicleText, { color: colors.subtext }]}>
              {booking.vehicle?.licensePlate || 'רכב'}
            </Text>
          </View>
          
          <View style={styles.priceInfo}>
            <Ionicons name="card-outline" size={16} color={colors.success} />
            <Text style={[styles.priceText, { color: colors.success }]}>
              ₪{booking.totalPrice || 0}
            </Text>
          </View>
        </View>

        {/* פעולות */}
        <View style={styles.bookingActions}>
          {isActive && !isCancelling && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.error }]}
              onPress={() => handleCancelBooking(booking)}
            >
              <Ionicons name="close-outline" size={16} color={colors.error} />
              <Text style={[styles.cancelButtonText, { color: colors.error }]}>
                בטל
              </Text>
            </TouchableOpacity>
          )}
          
          {isCancelling && (
            <View style={styles.cancellingIndicator}>
              <Text style={[styles.cancellingText, { color: colors.subtext }]}>
                מבטל...
              </Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.detailsButton}>
            <Text style={[styles.detailsButtonText, { color: colors.primary }]}>
              פרטים
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [colors, cancellingBookingId, handleBookingPress, handleCancelBooking]);

  /**
   * רנדור פילטר
   */
  const renderFilterButton = useCallback(({ item: filter }) => {
    const isSelected = selectedFilter === filter.key;
    const filteredBookings = getFilteredBookings(filter.key);
    
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: colors.surface },
          isSelected && { backgroundColor: colors.primary }
        ]}
        onPress={() => setSelectedFilter(filter.key)}
      >
        <Ionicons 
          name={filter.icon} 
          size={18} 
          color={isSelected ? '#fff' : colors.subtext} 
        />
        <Text style={[
          styles.filterText,
          { color: isSelected ? '#fff' : colors.subtext }
        ]}>
          {filter.label}
        </Text>
        {filteredBookings.length > 0 && (
          <View style={[
            styles.filterBadge,
            { backgroundColor: isSelected ? '#fff' : colors.primary }
          ]}>
            <Text style={[
              styles.filterBadgeText,
              { color: isSelected ? colors.primary : '#fff' }
            ]}>
              {filteredBookings.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedFilter, colors, getFilteredBookings]);

  // בדיקת הרשאות
  if (!isAuthenticated) {
    return (
      <BookingErrorScreen
        type="auth"
        onRetry={() => navigation.navigate('Login')}
        customActions={[
          {
            text: 'התחבר',
            icon: 'log-in-outline',
            primary: true,
            onPress: () => navigation.navigate('Login')
          }
        ]}
      />
    );
  }

  // מסך offline
  if (isOfflineMode) {
    return (
      <OfflineScreen
        title="אין חיבור לאינטרנט"
        message="צפייה בהזמנות דורשת חיבור לאינטרנט. בדוק את החיבור ונסה שוב."
        onRetry={retryConnection}
        retryText="נסה שוב"
      />
    );
  }

  // מסך שגיאה בטעינה
  if (error && !loading) {
    return (
      <BookingErrorScreen
        type="load_failed"
        error={error}
        onRetry={handleRefresh}
        onGoBack={() => navigation.goBack()}
        onGoHome={() => navigation.navigate('Home')}
      />
    );
  }

  // מסך ריק
  if (isEmpty && !loading && !error) {
    return (
      <BookingErrorScreen
        type="empty"
        customActions={[
          {
            text: 'חפש חניה',
            icon: 'search-outline',
            primary: true,
            onPress: handleCreateBooking
          }
        ]}
      />
    );
  }

  const filteredBookings = getFilteredBookings(selectedFilter);
  const stats = getBookingStats();

  return (
    <View style={styles.container}>
      {/* כותרת */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          ההזמנות שלי
        </Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateBooking}
          disabled={!canCreateBooking}
        >
          <Ionicons 
            name="add" 
            size={24} 
            color={canCreateBooking ? colors.primary : colors.subtext} 
          />
        </TouchableOpacity>
      </View>

      {/* סטטיסטיקות */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {stats.total}
          </Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>
            סה"כ
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {stats.active}
          </Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>
            פעילות
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            ₪{stats.totalSpent}
          </Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>
            הוצאו
          </Text>
        </View>
      </View>

      {/* פילטרים */}
      <FlatList
        data={FILTER_OPTIONS}
        renderItem={renderFilterButton}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      />

      {/* רשימת הזמנות */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.subtext} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {selectedFilter === 'all' ? 'אין הזמנות' : `אין הזמנות ${FILTER_OPTIONS.find(f => f.key === selectedFilter)?.label}`}
            </Text>
          </View>
        )}
      />

      {/* אינדיקטור מצב */}
      {!isOnline && (
        <View style={[styles.statusBar, { backgroundColor: colors.warning }]}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.statusBarText}>
            אין חיבור לשרת - הנתונים עלולים להיות לא עדכניים
          </Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    addButton: {
      padding: 8,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 20,
      marginHorizontal: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    filtersContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 6,
    },
    filterBadge: {
      marginLeft: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    listContainer: {
      padding: 16,
    },
    bookingItem: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    bookingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    bookingTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    bookingTitleText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 6,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    bookingTime: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    timeText: {
      fontSize: 14,
      marginLeft: 6,
    },
    bookingDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    vehicleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    vehicleText: {
      fontSize: 14,
      marginLeft: 4,
    },
    priceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    priceText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 4,
    },
    bookingActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
    },
    cancelButtonText: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 4,
    },
    cancellingIndicator: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    cancellingText: {
      fontSize: 12,
      fontStyle: 'italic',
    },
    detailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailsButtonText: {
      fontSize: 14,
      fontWeight: '500',
      marginRight: 4,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      marginTop: 16,
      textAlign: 'center',
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    statusBarText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 6,
    },
  });
}

/**
 * Hook לניהול הזמנות Server-Only - אין שמירה מקומית כלל
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from './useOfflineMode';
import { bookingsAPI } from '../utils/server-only-api';
import optimizedAPI from '../utils/optimized-api';

export const useServerOnlyBookings = () => {
  const { user, isAuthenticated } = useAuthContext();
  const { isFullyOnline, handleFailedRequest } = useOfflineMode();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // טעינת הזמנות מהשרת
  useEffect(() => {
    if (isAuthenticated && isFullyOnline) {
      loadBookings();
    }
  }, [isAuthenticated, isFullyOnline]);

  /**
   * טעינת הזמנות מהשרת בלבד
   */
  const loadBookings = useCallback(async () => {
    if (!isAuthenticated || !isFullyOnline) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📋 Loading bookings from server...');
      
      const response = await optimizedAPI.getUserBookings(user?.id);
      setBookings(response.data || []);
      
      console.log(`✅ Loaded ${response.data?.length || 0} bookings from server`);
    } catch (error) {
      console.error('❌ Failed to load bookings:', error);
      setError(error.message || 'שגיאה בטעינת הזמנות');
      
      // אין fallback מקומי - רק הודעת שגיאה
      if (!isFullyOnline) {
        setError('אין חיבור לשרת. בדוק את החיבור ונסה שוב.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * רענון הזמנות
   */
  const refreshBookings = useCallback(async () => {
    if (!isAuthenticated || !isFullyOnline) {
      return { success: false, error: 'אין חיבור לשרת' };
    }

    setRefreshing(true);
    setError(null);

    try {
      console.log('🔄 Refreshing bookings from server...');
      
      // ניקוי cache
      if (user?.id) {
        optimizedAPI.clearCache(`user_bookings:${user.id}`);
      }
      
      const response = await optimizedAPI.getUserBookings(user?.id, { forceRefresh: true });
      setBookings(response.data || []);
      
      console.log(`✅ Refreshed ${response.data?.length || 0} bookings`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to refresh bookings:', error);
      const errorMessage = error.message || 'שגיאה ברענון הזמנות';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * יצירת הזמנה חדשה - רק בשרת
   */
  const createBooking = useCallback(async (bookingData) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. יצירת הזמנה דורשת חיבור לאינטרנט.' 
      };
    }

    try {
      console.log('🚗 Creating booking on server...', bookingData);
      
      const response = await bookingsAPI.create(bookingData);
      const newBooking = response.data;
      
      // עדכון רשימת ההזמנות
      setBookings(prev => [newBooking, ...prev]);
      
      // ניקוי cache רלוונטי
      if (user?.id) {
        optimizedAPI.clearCache(`user_bookings:${user.id}`);
        optimizedAPI.clearCache(`user_stats:${user.id}`);
      }
      
      console.log('✅ Booking created successfully:', newBooking.id);
      return { success: true, data: newBooking };
      
    } catch (error) {
      console.error('❌ Failed to create booking:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה ביצירת ההזמנה';
      
      // אין שמירה מקומית - רק החזרת שגיאה
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * ביטול הזמנה - רק בשרת
   */
  const cancelBooking = useCallback(async (bookingId) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת. ביטול הזמנה דורש חיבור לאינטרנט.' 
      };
    }

    try {
      console.log('❌ Cancelling booking on server:', bookingId);
      
      const response = await bookingsAPI.cancel(bookingId);
      const updatedBooking = response.data;
      
      // עדכון רשימת ההזמנות
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId ? updatedBooking : booking
        )
      );
      
      // ניקוי cache רלוונטי
      if (user?.id) {
        optimizedAPI.clearCache(`user_bookings:${user.id}`);
        optimizedAPI.clearCache(`booking:${bookingId}`);
      }
      
      console.log('✅ Booking cancelled successfully');
      return { success: true, data: updatedBooking };
      
    } catch (error) {
      console.error('❌ Failed to cancel booking:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בביטול ההזמנה';
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline, user?.id]);

  /**
   * קבלת הזמנה ספציפית
   */
  const getBooking = useCallback(async (bookingId) => {
    if (!isAuthenticated || !isFullyOnline) {
      return { 
        success: false, 
        error: 'אין חיבור לשרת' 
      };
    }

    try {
      console.log('🔍 Getting booking from server:', bookingId);
      
      const response = await bookingsAPI.get(bookingId);
      
      console.log('✅ Booking retrieved successfully');
      return { success: true, data: response.data };
      
    } catch (error) {
      console.error('❌ Failed to get booking:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בטעינת ההזמנה';
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, isFullyOnline]);

  /**
   * סינון הזמנות
   */
  const getFilteredBookings = useCallback((filter = 'all') => {
    const now = new Date();
    
    switch (filter) {
      case 'active':
        return bookings.filter(booking => 
          booking.status === 'confirmed' && new Date(booking.endTime) > now
        );
      case 'past':
        return bookings.filter(booking => 
          new Date(booking.endTime) <= now
        );
      case 'cancelled':
        return bookings.filter(booking => 
          booking.status === 'cancelled'
        );
      case 'pending':
        return bookings.filter(booking => 
          booking.status === 'pending'
        );
      default:
        return bookings;
    }
  }, [bookings]);

  /**
   * סטטיסטיקות הזמנות
   */
  const getBookingStats = useCallback(() => {
    const now = new Date();
    
    return {
      total: bookings.length,
      active: bookings.filter(b => 
        b.status === 'confirmed' && new Date(b.endTime) > now
      ).length,
      past: bookings.filter(b => 
        new Date(b.endTime) <= now
      ).length,
      cancelled: bookings.filter(b => 
        b.status === 'cancelled'
      ).length,
      pending: bookings.filter(b => 
        b.status === 'pending'
      ).length,
      totalSpent: bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0)
    };
  }, [bookings]);

  /**
   * בדיקה אם יש הזמנה פעילה
   */
  const hasActiveBooking = useCallback(() => {
    const now = new Date();
    return bookings.some(booking => 
      booking.status === 'confirmed' && 
      new Date(booking.startTime) <= now && 
      new Date(booking.endTime) > now
    );
  }, [bookings]);

  /**
   * קבלת הזמנה פעילה נוכחית
   */
  const getCurrentBooking = useCallback(() => {
    const now = new Date();
    return bookings.find(booking => 
      booking.status === 'confirmed' && 
      new Date(booking.startTime) <= now && 
      new Date(booking.endTime) > now
    ) || null;
  }, [bookings]);

  return {
    // נתונים
    bookings,
    loading,
    refreshing,
    error,
    
    // פעולות
    loadBookings,
    refreshBookings,
    createBooking,
    cancelBooking,
    getBooking,
    
    // פילטרים וסטטיסטיקות
    getFilteredBookings,
    getBookingStats,
    hasActiveBooking,
    getCurrentBooking,
    
    // מצב
    isEmpty: bookings.length === 0,
    isOnline: isFullyOnline,
    canCreateBooking: isAuthenticated && isFullyOnline,
    
    // הודעות
    statusMessage: !isAuthenticated ? 'נדרשת התחברות' :
                  !isFullyOnline ? 'אין חיבור לשרת' :
                  loading ? 'טוען הזמנות...' :
                  error ? error :
                  bookings.length === 0 ? 'אין הזמנות' :
                  `${bookings.length} הזמנות`
  };
};

export default useServerOnlyBookings;

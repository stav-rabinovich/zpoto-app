import { isOnline, savePendingAction, cacheData, getCachedItem } from './fallback';
import api from '../utils/api';

/**
 * Wrapper לשירותי API עם תמיכה ב-fallback אוטומטי
 */

/**
 * ביצוע קריאת API עם fallback אוטומטי
 * @param {string} endpoint - נקודת הקצה
 * @param {Object} options - אפשרויות הקריאה
 * @returns {Promise} תוצאת הקריאה
 */
export const apiWithFallback = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    data = null,
    cacheKey = null,
    cacheTTL = 60, // דקות
    fallbackToCache = true,
    saveOfflineActions = true
  } = options;

  const online = await isOnline();

  // אם אין חיבור
  if (!online) {
    // עבור GET requests - נסה לקבל מהמטמון
    if (method === 'GET' && fallbackToCache && cacheKey) {
      const cachedData = await getCachedItem(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          message: 'נתונים מהמטמון - ייתכן שלא עדכניים'
        };
      }
    }

    // עבור פעולות כתיבה - שמור לביצוע מאוחר יותר
    if (method !== 'GET' && saveOfflineActions) {
      const saveResult = await savePendingAction({
        type: 'api_call',
        endpoint,
        method,
        data,
        timestamp: new Date().toISOString()
      });

      if (saveResult.success) {
        return {
          success: true,
          data: null,
          pending: true,
          actionId: saveResult.actionId,
          message: 'הפעולה נשמרה לביצוע כשיחזור החיבור'
        };
      }
    }

    return {
      success: false,
      error: 'אין חיבור לאינטרנט',
      offline: true
    };
  }

  // יש חיבור - בצע קריאה רגילה
  try {
    const response = await api({
      url: endpoint,
      method,
      data
    });

    // שמור במטמון אם זה GET request
    if (method === 'GET' && cacheKey && response.data) {
      const ttlMs = cacheTTL * 60 * 1000; // המרה למילישניות
      await cacheData(cacheKey, response.data, ttlMs);
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('API call failed:', error);

    // אם זה GET request ונכשל, נסה מהמטמון
    if (method === 'GET' && fallbackToCache && cacheKey) {
      const cachedData = await getCachedItem(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          warning: 'השרת לא זמין - נתונים מהמטמון'
        };
      }
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'שגיאה בקריאה לשרת'
    };
  }
};

/**
 * Wrapper לשירותי הזמנות עם fallback
 */
export const bookingsApiWithFallback = {
  getUserBookings: () => apiWithFallback('/api/bookings', {
    method: 'GET',
    cacheKey: 'user_bookings',
    cacheTTL: 30
  }),

  getBooking: (id) => apiWithFallback(`/api/bookings/${id}`, {
    method: 'GET',
    cacheKey: `booking_${id}`,
    cacheTTL: 60
  }),

  createBooking: (data) => apiWithFallback('/api/bookings', {
    method: 'POST',
    data
  }),

  updateBookingStatus: (id, status) => apiWithFallback(`/api/bookings/${id}/status`, {
    method: 'PATCH',
    data: { status }
  })
};

/**
 * Wrapper לשירותי רכבים עם fallback
 */
export const vehiclesApiWithFallback = {
  getUserVehicles: () => apiWithFallback('/api/vehicles', {
    method: 'GET',
    cacheKey: 'user_vehicles',
    cacheTTL: 60
  }),

  createVehicle: (data) => apiWithFallback('/api/vehicles', {
    method: 'POST',
    data
  }),

  updateVehicle: (id, data) => apiWithFallback(`/api/vehicles/${id}`, {
    method: 'PUT',
    data
  }),

  deleteVehicle: (id) => apiWithFallback(`/api/vehicles/${id}`, {
    method: 'DELETE'
  }),

  setDefaultVehicle: (id) => apiWithFallback(`/api/vehicles/${id}/default`, {
    method: 'PATCH'
  })
};

/**
 * Wrapper לשירותי פרופיל עם fallback
 */
export const profileApiWithFallback = {
  getUserProfile: () => apiWithFallback('/api/profile', {
    method: 'GET',
    cacheKey: 'user_profile',
    cacheTTL: 120
  }),

  updateUserProfile: (data) => apiWithFallback('/api/profile', {
    method: 'PUT',
    data
  }),

  getUserStats: () => apiWithFallback('/api/profile/stats', {
    method: 'GET',
    cacheKey: 'user_stats',
    cacheTTL: 60
  })
};

/**
 * Wrapper לשירותי בעל חניה עם fallback
 */
export const ownerApiWithFallback = {
  getOwnerParkings: () => apiWithFallback('/api/owner/parkings', {
    method: 'GET',
    cacheKey: 'owner_parkings',
    cacheTTL: 60
  }),

  getOwnerBookings: () => apiWithFallback('/api/owner/bookings', {
    method: 'GET',
    cacheKey: 'owner_bookings',
    cacheTTL: 30
  }),

  getParkingStats: (parkingId, options = {}) => {
    const params = new URLSearchParams();
    if (options.days) params.append('days', options.days);
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);
    
    const queryString = params.toString();
    const url = `/api/owner/stats/${parkingId}${queryString ? `?${queryString}` : ''}`;
    
    return apiWithFallback(url, {
      method: 'GET',
      cacheKey: `parking_stats_${parkingId}_${options.days || 30}`,
      cacheTTL: 30
    });
  },

  updateOwnerParking: (parkingId, data) => apiWithFallback(`/api/owner/parkings/${parkingId}`, {
    method: 'PATCH',
    data
  }),

  updateBookingStatus: (bookingId, status) => apiWithFallback(`/api/owner/bookings/${bookingId}/status`, {
    method: 'PATCH',
    data: { status }
  })
};

/**
 * פונקציה כללית לניקוי מטמון ספציפי
 * @param {string} pattern - תבנית למפתחות למחיקה
 * @returns {Promise} תוצאת הניקוי
 */
export const clearCachePattern = async (pattern) => {
  try {
    const { getCachedData } = await import('./fallback');
    const cachedData = await getCachedData();
    
    let clearedCount = 0;
    const updatedCache = {};
    
    for (const [key, value] of Object.entries(cachedData)) {
      if (key.includes(pattern)) {
        clearedCount++;
      } else {
        updatedCache[key] = value;
      }
    }
    
    if (clearedCount > 0) {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('fallback_cached_data', JSON.stringify(updatedCache));
    }
    
    return { success: true, clearedCount };
  } catch (error) {
    console.error('Failed to clear cache pattern:', error);
    return { success: false, error: error.message };
  }
};

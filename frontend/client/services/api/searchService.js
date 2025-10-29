import * as SecureStore from 'expo-secure-store';
import api from '../../utils/api';
import { getDeviceId } from '../../utils/deviceId';

/**
 * שירותי API לחיפושים ומקומות
 */

/**
 * קבלת חיפושים אחרונים (Anonymous - ללא authentication)
 * @param {number} limit - מספר התוצאות המקסימלי (אופציונלי)
 * @returns {Promise} רשימת חיפושים אחרונים
 */
export const getRecentSearches = async (limit = 10) => {
  try {
    const deviceId = await getDeviceId();
    const response = await api.get(`/api/anonymous/recent-searches?deviceId=${encodeURIComponent(deviceId)}&limit=${limit}`);
    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    console.error('Failed to fetch anonymous recent searches:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת חיפושים אחרונים',
      data: []
    };
  }
};

/**
 * שמירת חיפוש חדש (Anonymous - ללא authentication)
 * @param {string} query - מחרוזת החיפוש
 * @param {number} lat - קו רוחב (אופציונלי)
 * @param {number} lng - קו אורך (אופציונלי)
 * @returns {Promise} תוצאה
 */
export const saveRecentSearch = async (query, lat = null, lng = null) => {
  try {
    if (!query?.trim()) {
      return {
        success: false,
        error: 'מחרוזת חיפוש נדרשת'
      };
    }

    const deviceId = await getDeviceId();
    const requestBody = {
      deviceId,
      query: query.trim(),
      ...(lat !== null && { lat }),
      ...(lng !== null && { lng })
    };

    const response = await api.post('/api/anonymous/recent-searches', requestBody);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to save anonymous recent search:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בשמירת חיפוש'
    };
  }
};

/**
 * מחיקת כל החיפושים האחרונים (Anonymous - ללא authentication)
 * @returns {Promise} תוצאה
 */
export const clearRecentSearches = async () => {
  try {
    const deviceId = await getDeviceId();
    const response = await api.delete(`/api/anonymous/recent-searches?deviceId=${encodeURIComponent(deviceId)}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to clear anonymous recent searches:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה במחיקת חיפושים אחרונים'
    };
  }
};

/**
 * מחיקת חיפוש ספציפי (Anonymous - ללא authentication)
 * @param {number} searchId - מזהה החיפוש למחיקה
 * @returns {Promise} תוצאה
 */
export const deleteRecentSearch = async (searchId) => {
  try {
    if (!searchId) {
      return {
        success: false,
        error: 'מזהה חיפוש נדרש'
      };
    }

    const deviceId = await getDeviceId();
    const response = await api.delete(`/api/anonymous/recent-searches/${searchId}?deviceId=${encodeURIComponent(deviceId)}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to delete anonymous recent search:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה במחיקת חיפוש'
    };
  }
};

/**
 * קבלת הזמנות פעילות - רק למשתמשים מחוברים
 * @returns {Promise} רשימת הזמנות פעילות
 */
export const getActiveBookings = async () => {
  try {
    // בדיקה אם יש משתמש מחובר
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) {
      // אין משתמש מחובר - השתמש ב-Anonymous API
      console.log('No user logged in - using anonymous API for active bookings');
      const deviceId = await getDeviceId();
      const response = await api.get(`/api/anonymous/bookings/active?deviceId=${encodeURIComponent(deviceId)}`);
      return {
        success: true,
        data: response.data.data || []
      };
    }

    // משתמש מחובר - השתמש ב-authenticated API
    console.log('User logged in - using authenticated API for active bookings');
    const response = await api.get('/api/bookings/active');
    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    // אם זו שגיאת חסימה - לא מדפיסים כשגיאה
    if (error.response?.status === 403 || error.isUserBlocked) {
      console.log('🚫 User blocked - getActiveBookings failed (this is normal)');
    } else {
      console.error('Failed to fetch active bookings:', error);
    }
    
    // אם זו שגיאת authentication, החזר תוצאה ריקה במקום שגיאה
    if (error.response?.status === 401) {
      console.log('Authentication failed - returning empty bookings');
      return {
        success: true,
        data: [],
        message: 'User not authenticated'
      };
    }
    
    // אם זו שגיאת חסימה, החזר אינדיקציה מיוחדת
    if (error.response?.status === 403 || error.isUserBlocked) {
      console.log('User blocked - indicating in response');
      return {
        success: false,
        isUserBlocked: true,
        error: 'המשתמש חסום על ידי המנהל',
        data: []
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת הזמנות פעילות',
      data: []
    };
  }
};

/**
 * קבלת סטטוס בעל חניה - רק למשתמשים מחוברים
 * @param {string} email - אימייל המשתמש
 * @returns {Promise} סטטוס בעל חניה
 */
export const getOwnerStatus = async (email) => {
  try {
    // בדיקה אם יש email
    if (!email) {
      console.log('No email provided - returning none status');
      return {
        success: true,
        data: { status: 'none' },
        message: 'No email provided'
      };
    }

    const response = await api.get(`/api/owner/status?email=${encodeURIComponent(email)}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch owner status:', error);
    
    // אם זו שגיאת authentication, החזר סטטוס 'none'
    if (error.response?.status === 401) {
      console.log('Authentication failed - returning none status');
      return {
        success: true,
        data: { status: 'none' },
        message: 'User not authenticated'
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בבדיקת סטטוס בעל חניה',
      data: { status: 'none' }
    };
  }
};

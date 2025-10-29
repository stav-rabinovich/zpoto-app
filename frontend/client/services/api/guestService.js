import axios from 'axios';
import { API_BASE } from '../../consts';
import { getDeviceId } from '../../utils/deviceId';

// יצירת API client ללא authentication למשתמשים אנונימיים
const anonymousApi = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * שירותי API למשתמשים אנונימיים - מקומות שמורים ומועדפים
 * עובד עם Device ID ללא צורך באימות
 */

/**
 * קבלת מקומות שמורים (Anonymous - ללא authentication)
 * @returns {Promise} רשימת מקומות שמורים
 */
export const getSavedPlaces = async () => {
  try {
    const deviceId = await getDeviceId();
    const response = await anonymousApi.get(`/api/anonymous/saved-places?deviceId=${encodeURIComponent(deviceId)}`);
    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    console.error('Failed to fetch anonymous saved places:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת מקומות שמורים',
      data: []
    };
  }
};

/**
 * שמירת מקום חדש עבור guest (Anonymous - ללא authentication)
 * @param {Object} place - פרטי המקום לשמירה
 * @param {string} place.name - שם המקום
 * @param {string} place.address - כתובת המקום
 * @param {number} place.lat - קו רוחב
 * @param {number} place.lng - קו אורך
 * @param {string} [place.type] - סוג המקום (אופציונלי)
 * @returns {Promise} תוצאה
 */
export const savePlaceForGuest = async (place) => {
  try {
    if (!place || !place.name || !place.address || place.lat === undefined || place.lng === undefined) {
      return {
        success: false,
        error: 'פרטי המקום חסרים (שם, כתובת, קואורדינטות נדרשים)'
      };
    }

    const deviceId = await getDeviceId();
    const requestBody = {
      deviceId,
      name: place.name.trim(),
      address: place.address.trim(),
      lat: place.lat,
      lng: place.lng,
      type: place.type || 'custom' // השרת מצפה ל: home, work, או custom
    };

    const response = await anonymousApi.post('/api/anonymous/saved-places', requestBody);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to save anonymous place:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בשמירת המקום'
    };
  }
};

/**
 * מחיקת מקום שמור (Anonymous - ללא authentication)
 * @param {number} placeId - מזהה המקום למחיקה
 * @returns {Promise} תוצאה
 */
export const deleteSavedPlace = async (placeId) => {
  try {
    if (!placeId) {
      return {
        success: false,
        error: 'מזהה מקום נדרש'
      };
    }

    const deviceId = await getDeviceId();
    const response = await anonymousApi.delete(`/api/anonymous/saved-places/${placeId}?deviceId=${encodeURIComponent(deviceId)}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to delete anonymous saved place:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה במחיקת המקום'
    };
  }
};

/**
 * מחיקת כל המקומות השמורים (Anonymous - ללא authentication)
 * @returns {Promise} תוצאה
 */
export const clearSavedPlaces = async () => {
  try {
    const deviceId = await getDeviceId();
    const response = await anonymousApi.delete(`/api/anonymous/saved-places?deviceId=${encodeURIComponent(deviceId)}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to clear anonymous saved places:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה במחיקת כל המקומות'
    };
  }
};

/**
 * קבלת מועדפים (Anonymous - ללא authentication)
 * @returns {Promise} רשימת מועדפים
 */
export const getAnonymousFavorites = async () => {
  try {
    const deviceId = await getDeviceId();
    const response = await anonymousApi.get(`/api/anonymous/favorites?deviceId=${encodeURIComponent(deviceId)}`);
    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    console.error('Failed to fetch anonymous favorites:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת המועדפים',
      data: []
    };
  }
};

/**
 * הוספת מועדף (Anonymous - ללא authentication)
 * @param {number} parkingId - מזהה החניה
 * @returns {Promise} תוצאה
 */
export const addAnonymousFavorite = async (parkingId) => {
  try {
    console.log('🚀 addAnonymousFavorite called with parkingId:', parkingId, 'type:', typeof parkingId);
    
    if (!parkingId || typeof parkingId !== 'number') {
      console.log('❌ Invalid parkingId:', parkingId);
      return {
        success: false,
        error: 'מזהה חניה תקין נדרש'
      };
    }

    const deviceId = await getDeviceId();
    console.log('📱 Device ID:', deviceId);
    
    const payload = {
      deviceId,
      parkingId
    };
    console.log('📦 Sending payload:', payload);
    console.log('🌐 API URL:', '/api/anonymous/favorites');
    
    const response = await anonymousApi.post('/api/anonymous/favorites', payload);
    console.log('✅ Server response:', response.data);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Failed to add anonymous favorite:', error);
    console.error('❌ Error details:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בהוספת מועדף'
    };
  }
};

/**
 * הסרת מועדף (Anonymous - ללא authentication)
 * @param {number} parkingId - מזהה החניה
 * @returns {Promise} תוצאה
 */
export const removeAnonymousFavorite = async (parkingId) => {
  try {
    if (!parkingId || typeof parkingId !== 'number') {
      return {
        success: false,
        error: 'מזהה חניה תקין נדרש'
      };
    }

    const deviceId = await getDeviceId();
    const response = await anonymousApi.delete(`/api/anonymous/favorites/${parkingId}?deviceId=${encodeURIComponent(deviceId)}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to remove anonymous favorite:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בהסרת מועדף'
    };
  }
};

// Export legacy functions for backward compatibility (will be removed later)
export const getUserFavorites = getAnonymousFavorites;
export const addFavorite = addAnonymousFavorite;
export const removeFavorite = removeAnonymousFavorite;

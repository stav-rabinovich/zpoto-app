import api from '../../utils/api';
import * as SecureStore from 'expo-secure-store';
import { getAnonymousFavorites, addAnonymousFavorite, removeAnonymousFavorite, getSavedPlaces as getAnonymousSavedPlaces } from './guestService';
import { isValidResponse, validateFavorites } from '../../utils/validation';

/**
 * שירותי API למשתמשים - פרופיל ומועדפים
 */

/**
 * קבלת מועדפים של המשתמש (מחובר או אנונימי)
 * @returns {Promise} רשימת מועדפים
 */
export const getUserFavorites = async () => {
  try {
    // בדיקה אם יש token - אם אין, נעבור ישירות לאנונימי
    const token = await SecureStore.getItemAsync('userToken');
    
    if (!token) {
      console.log('🔄 No token found, using anonymous favorites directly');
      const result = await getAnonymousFavorites();
      console.log('📊 getUserFavorites - anonymous result:', result);
      return result;
    }
    
    console.log('🔍 getUserFavorites - trying authenticated API with token');
    
    const response = await api.get('/api/favorites');
    
    console.log('📊 getUserFavorites - authenticated response:', response.data);
    
    const favorites = response.data?.data || [];
    const validatedFavorites = validateFavorites(favorites);
    
    console.log('✅ getUserFavorites - authenticated favorites:', validatedFavorites);
    
    return {
      success: true,
      data: validatedFavorites
    };
  } catch (error) {
    // אם המשתמש לא מחובר, נסה לטעון מועדפים אנונימיים
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('🔄 User not authenticated, falling back to anonymous favorites');
      
      // אם יש טוקן לא תקין, נמחק אותו
      if (error.response?.status === 401) {
        console.log('🧹 Clearing invalid token from storage');
        try {
          await SecureStore.deleteItemAsync('userToken');
        } catch (deleteError) {
          console.warn('Failed to delete invalid token:', deleteError);
        }
      }
      
      try {
        const result = await getAnonymousFavorites();
        console.log('📊 getUserFavorites - anonymous fallback result:', result);
        return result;
      } catch (fallbackError) {
        console.error('Failed to fetch anonymous favorites:', fallbackError);
        return {
          success: false,
          error: 'שגיאה בטעינת המועדפים',
          data: []
        };
      }
    }
    
    console.error('Failed to fetch user favorites from server:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת המועדפים',
      data: []
    };
  }
};

/**
 * הוספת מועדף (מחובר או אנונימי)
 * @param {number} parkingId - מזהה החניה
 * @returns {Promise} תוצאה
 */
export const addFavorite = async (parkingId) => {
  try {
    // בדיקה אם יש token - אם אין, נעבור ישירות לאנונימי
    const token = await SecureStore.getItemAsync('userToken');
    
    if (!token) {
      console.log('🔄 No token found, using anonymous favorites directly');
      const result = await addAnonymousFavorite(parkingId);
      console.log('📊 addFavorite - anonymous result:', result);
      return result;
    }
    
    console.log('🔍 addFavorite - trying authenticated API with token:', parkingId);
    
    const response = await api.post('/api/favorites', { parkingId });
    
    console.log('✅ addFavorite - authenticated response:', response.data);
    
    return {
      success: true,
      data: response.data?.data
    };
  } catch (error) {
    // אם המשתמש לא מחובר, נסה להוסיף למועדפים אנונימיים
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('🔄 User not authenticated, falling back to anonymous add favorite');
      
      // אם יש טוקן לא תקין, נמחק אותו
      if (error.response?.status === 401) {
        console.log('🧹 Clearing invalid token from storage');
        try {
          await SecureStore.deleteItemAsync('userToken');
        } catch (deleteError) {
          console.warn('Failed to delete invalid token:', deleteError);
        }
      }
      
      try {
        const result = await addAnonymousFavorite(parkingId);
        console.log('✅ addFavorite - anonymous fallback result:', result);
        return result;
      } catch (fallbackError) {
        console.error('Failed to add anonymous favorite:', fallbackError);
        return {
          success: false,
          error: 'שגיאה בהוספת מועדף',
        };
      }
    }
    
    console.error('Failed to add favorite to server:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בהוספת מועדף'
    };
  }
};

/**
 * הסרת מועדף (מחובר או אנונימי)
 * @param {number} parkingId - מזהה החניה
 * @returns {Promise} תוצאה
 */
export const removeFavorite = async (parkingId) => {
  try {
    // בדיקה אם יש token - אם אין, נעבור ישירות לאנונימי
    const token = await SecureStore.getItemAsync('userToken');
    
    if (!token) {
      console.log('🔄 No token found, using anonymous favorites directly');
      const result = await removeAnonymousFavorite(parkingId);
      console.log('📊 removeFavorite - anonymous result:', result);
      return result;
    }
    
    console.log('🔍 removeFavorite - trying authenticated API with token:', parkingId);
    
    const response = await api.delete(`/api/favorites/${parkingId}`);
    
    console.log('✅ removeFavorite - authenticated response:', response.data);
    
    return {
      success: true,
      message: response.data?.message || 'מועדף הוסר בהצלחה'
    };
  } catch (error) {
    // אם המשתמש לא מחובר, נסה להסיר מהמועדפים האנונימיים
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('🔄 User not authenticated, falling back to anonymous favorites');
      
      // אם יש טוקן לא תקין, נמחק אותו
      if (error.response?.status === 401) {
        console.log('🧹 Clearing invalid token from storage');
        try {
          await SecureStore.deleteItemAsync('userToken');
        } catch (deleteError) {
          console.warn('Failed to delete invalid token:', deleteError);
        }
      }
      
      try {
        const result = await removeAnonymousFavorite(parkingId);
        console.log('📊 removeFavorite - anonymous fallback result:', result);
        return result;
      } catch (fallbackError) {
        console.error('Failed to remove anonymous favorite:', fallbackError);
        return {
          success: false,
          error: 'שגיאה בהסרת מועדף'
        };
      }
    }
    
    console.error('Failed to remove favorite from server:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בהסרת מועדף'
    };
  }
};

/**
 * קבלת מקומות שמורים
 * @returns {Promise} רשימת מקומות שמורים
 */
export const getSavedPlaces = async () => {
  try {
    return await getAnonymousSavedPlaces();
  } catch (error) {
    console.error('Failed to fetch saved places:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת מקומות שמורים',
      data: []
    };
  }
};

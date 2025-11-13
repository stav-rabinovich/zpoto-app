import api from '../../utils/api';

/**
 * שירותי API להעדפות משתמש
 */

/**
 * קבלת העדפות המשתמש
 * @returns {Promise} העדפות המשתמש
 */
export const getUserPreferences = async () => {
  try {
    const response = await api.get('/api/user/preferences/');
    return {
      success: true,
      data: response.data.data || {}
    };
  } catch (error) {
    console.error('Failed to fetch user preferences:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת העדפות',
      data: {}
    };
  }
};

/**
 * עדכון העדפות המשתמש
 * @param {Object} preferences - העדפות לעדכון
 * @param {boolean} preferences.showOnlyCompatibleParkings - האם להציג רק חניות תואמות
 * @returns {Promise} תוצאת העדכון
 */
export const updateUserPreferences = async (preferences) => {
  try {
    const response = await api.patch('/api/user/preferences/', preferences);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בעדכון העדפות',
      data: null
    };
  }
};

/**
 * פונקציות עזר להעדפות
 */

/**
 * קבלת העדפת סינון ברירת מחדל
 * @returns {boolean} ברירת מחדל לסינון
 */
export const getDefaultFilterPreference = () => false;

/**
 * ולידציה של העדפות משתמש
 * @param {Object} preferences - העדפות לוולידציה
 * @returns {boolean} האם ההעדפות תקינות
 */
export const validateUserPreferences = (preferences) => {
  if (!preferences || typeof preferences !== 'object') {
    return false;
  }

  // בדיקת showOnlyCompatibleParkings
  if (preferences.showOnlyCompatibleParkings !== undefined) {
    if (typeof preferences.showOnlyCompatibleParkings !== 'boolean') {
      return false;
    }
  }

  return true;
};

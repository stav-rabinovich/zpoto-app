import { Alert } from 'react-native';
import { clearInvalidToken } from '../services/api/tokenManager';

/**
 * טיפול חכם בשגיאות API
 */

/**
 * טיפול בשגיאות authentication
 * @param {Error} error - השגיאה
 * @param {string} context - הקונטקסט שבו התרחשה השגיאה
 * @returns {boolean} האם השגיאה טופלה
 */
export const handleAuthError = async (error, context = '') => {
  const status = error.response?.status;
  
  if (status === 401) {
    console.log(`🔄 Auth error in ${context}: Invalid token, cleaning up`);
    await clearInvalidToken();
    return true; // השגיאה טופלה
  }
  
  if (status === 403) {
    console.log(`🚫 Auth error in ${context}: Access forbidden (user might be blocked)`);
    return true; // השגיאה טופלה
  }
  
  return false; // השגיאה לא טופלה
};

/**
 * הצגת הודעת שגיאה למשתמש (רק לשגיאות חמורות)
 * @param {Error} error - השגיאה
 * @param {string} userMessage - הודעה למשתמש
 * @param {string} context - הקונטקסט
 */
export const showUserError = (error, userMessage, context = '') => {
  const status = error.response?.status;
  
  // לא נציג שגיאות auth למשתמש - זה נורמלי
  if (status === 401 || status === 403) {
    return;
  }
  
  // רק שגיאות אמיתיות יוצגו למשתמש
  if (status >= 500 || !status) {
    Alert.alert(
      'שגיאה',
      userMessage || 'אירעה שגיאה. אנא נסה שוב.',
      [{ text: 'אישור' }]
    );
    console.error(`❌ User error in ${context}:`, error.message);
  }
};

/**
 * לוגיקה מאוחדת לטיפול בשגיאות API
 * @param {Error} error - השגיאה
 * @param {string} context - הקונטקסט
 * @param {string} userMessage - הודעה למשתמש
 * @returns {boolean} האם השגיאה טופלה
 */
export const handleAPIError = async (error, context = '', userMessage = '') => {
  // קודם ננסה לטפל בשגיאות auth
  const authHandled = await handleAuthError(error, context);
  
  if (authHandled) {
    return true;
  }
  
  // אם זו לא שגיאת auth, נציג למשתמש אם צריך
  if (userMessage) {
    showUserError(error, userMessage, context);
  }
  
  return false;
};

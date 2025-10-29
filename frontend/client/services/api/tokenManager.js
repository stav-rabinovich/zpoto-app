import * as SecureStore from 'expo-secure-store';
import api from '../../utils/api';

/**
 * מנהל טוקנים - מונע שגיאות authentication
 */

/**
 * בדיקת תקינות הטוקן הנוכחי
 * @returns {Promise<boolean>} האם הטוקן תקין
 */
export const validateCurrentToken = async () => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    
    if (!token) {
      console.log('🔍 TokenManager: No token found');
      return false;
    }
    
    console.log('🔍 TokenManager: Validating existing token...');
    
    // נסה לגשת לAPI קיים לבדיקת הטוקן
    const response = await api.get('/api/bookings');
    
    if (response.status === 200) {
      console.log('✅ TokenManager: Token is valid');
      return true;
    }
    
    console.log('❌ TokenManager: Token validation failed');
    return false;
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('🧹 TokenManager: Token is invalid, cleaning up...');
      await clearInvalidToken();
      return false;
    }
    
    console.warn('⚠️ TokenManager: Validation error (might be network):', error.message);
    // אם זו שגיאת רשת, נניח שהטוקן בסדר
    return true;
  }
};

/**
 * ניקוי טוקן לא תקין
 */
export const clearInvalidToken = async () => {
  try {
    console.log('🧹 TokenManager: Clearing invalid token...');
    await SecureStore.deleteItemAsync('userToken');
    console.log('✅ TokenManager: Invalid token cleared');
  } catch (error) {
    console.warn('❌ TokenManager: Failed to clear token:', error);
  }
};

/**
 * איתחול מנהל הטוקנים - יקרא בעת טעינת האפליקציה
 */
export const initializeTokenManager = async () => {
  console.log('🚀 TokenManager: Initializing...');
  
  const isValid = await validateCurrentToken();
  
  if (!isValid) {
    console.log('🔄 TokenManager: No valid token - user will use anonymous mode');
  } else {
    console.log('✅ TokenManager: User has valid token');
  }
  
  return isValid;
};

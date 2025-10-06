import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

/**
 * כלי לתיקון בעיות אימות
 */

/**
 * ניקוי מלא של נתוני אימות
 */
export const clearAuthData = async () => {
  try {
    console.log('🧹 מנקה נתוני אימות...');
    
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('user');
    
    // נקה גם נתונים ישנים אם קיימים
    const oldKeys = ['profile', 'token', 'authToken', 'currentUser'];
    for (const key of oldKeys) {
      await AsyncStorage.removeItem(key);
    }
    
    console.log('✅ נתוני האימות נוקו');
    return { success: true };
  } catch (error) {
    console.error('❌ שגיאה בניקוי נתוני אימות:', error);
    return { success: false, error: error.message };
  }
};

/**
 * התחברות עם נתונים חדשים
 */
export const freshLogin = async (email = 'test@example.com', password = '123456') => {
  try {
    console.log('🔐 מתחבר עם נתונים חדשים...');
    
    // נקה נתונים ישנים
    await clearAuthData();
    
    // התחבר מחדש
    const response = await api.post('/api/auth/login', { email, password });
    
    if (response.data) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('✅ התחברות הצליחה:', response.data.user.email);
      return { 
        success: true, 
        user: response.data.user,
        token: response.data.token 
      };
    }
    
    return { success: false, error: 'לא התקבלה תגובה מהשרת' };
  } catch (error) {
    console.error('❌ שגיאה בהתחברות:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};

/**
 * בדיקת מצב אימות נוכחי
 */
export const checkAuthStatus = async () => {
  try {
    console.log('🔍 בודק מצב אימות...');
    
    const token = await AsyncStorage.getItem('userToken');
    const userStr = await AsyncStorage.getItem('user');
    
    const status = {
      hasToken: !!token,
      hasUser: !!userStr,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      user: userStr ? JSON.parse(userStr) : null,
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 מצב אימות:', status);
    
    // בדיקה אם הטוקן עובד
    if (token) {
      try {
        const response = await api.get('/health');
        status.serverReachable = true;
        
        const apiResponse = await api.get('/api/bookings');
        status.tokenValid = true;
        status.apiWorking = true;
      } catch (error) {
        status.tokenValid = false;
        status.apiWorking = false;
        status.lastError = error.response?.data?.error || error.message;
      }
    }
    
    return status;
  } catch (error) {
    console.error('❌ שגיאה בבדיקת מצב אימות:', error);
    return { 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * תיקון מהיר של בעיות אימות
 */
export const quickAuthFix = async () => {
  console.log('🔧 מתחיל תיקון מהיר של אימות...');
  
  // 1. בדוק מצב נוכחי
  const currentStatus = await checkAuthStatus();
  console.log('📋 מצב נוכחי:', currentStatus);
  
  // 2. אם הטוקן לא תקין, התחבר מחדש
  if (!currentStatus.tokenValid) {
    console.log('🔄 הטוקן לא תקין, מתחבר מחדש...');
    const loginResult = await freshLogin();
    
    if (loginResult.success) {
      console.log('✅ תיקון הושלם בהצלחה');
      return { 
        success: true, 
        message: 'האימות תוקן בהצלחה',
        user: loginResult.user
      };
    } else {
      console.log('❌ התחברות נכשלה');
      return {
        success: false,
        error: 'לא ניתן להתחבר מחדש: ' + loginResult.error
      };
    }
  } else {
    console.log('✅ האימות תקין');
    return {
      success: true,
      message: 'האימות כבר תקין',
      user: currentStatus.user
    };
  }
};

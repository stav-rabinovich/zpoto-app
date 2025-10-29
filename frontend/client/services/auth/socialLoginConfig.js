// Conditional imports לטיפול בשגיאות native modules
let GoogleSignin = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  console.warn('⚠️ Google Sign-in module לא זמין:', e.message);
}

let Settings = null;
try {
  Settings = require('react-native-fbsdk-next').Settings;
} catch (e) {
  console.warn('⚠️ Facebook SDK module לא זמין:', e.message);
}

/**
 * קונפיגורציה ל-Social Login providers
 * מכיל את כל ההגדרות הנדרשות לGoogle, Facebook ו-Apple
 */

/**
 * קונפיגורציה של Google Sign-In
 */
export const configureGoogleSignIn = () => {
  if (!GoogleSignin) {
    console.warn('⚠️ Google Sign-In לא זמין - מדלג על קונפיגורציה');
    return;
  }
  
  GoogleSignin.configure({
    // TODO: החלף ב-Web Client ID שלך מ-Google Cloud Console
    webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
    
    // TODO: החלף ב-iOS Client ID שלך (אופציונלי)
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    
    // בקש גישה לפרופיל ואימייל
    scopes: ['profile', 'email'],
    
    // בקש גישה ל-offline (refresh token)
    offlineAccess: true,
    
    // בקש ID token (נדרש לאימות בשרת)
    forceCodeForRefreshToken: true,
  });
  
  console.log('✅ Google Sign-In configured');
};

/**
 * קונפיגורציה של Facebook SDK
 */
export const configureFacebookSDK = () => {
  if (!Settings) {
    console.warn('⚠️ Facebook SDK לא זמין - מדלג על קונפיגורציה');
    return;
  }
  
  // TODO: החלף ב-App ID שלך מ-Facebook Developers
  Settings.setAppID('YOUR_FACEBOOK_APP_ID');
  
  // TODO: החלף ב-App Name שלך
  Settings.setAppName('Zpoto');
  
  // הפעל logging למצב פיתוח
  if (__DEV__) {
    Settings.setLogLevel('verbose');
  }
  
  // אתחול SDK
  Settings.initializeSDK();
  
  console.log('✅ Facebook SDK configured');
};

/**
 * אתחול כל ה-Social Login providers
 */
export const initializeSocialLogin = () => {
  try {
    configureGoogleSignIn();
    configureFacebookSDK();
    console.log('🔐 All social login providers initialized');
  } catch (error) {
    console.error('❌ Failed to initialize social login:', error);
  }
};

/**
 * הגדרות נוספות לפיתוח
 */
export const SOCIAL_LOGIN_CONFIG = {
  // Google
  google: {
    // TODO: עדכן עם הנתונים האמיתיים שלך
    webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  },
  
  // Facebook  
  facebook: {
    // TODO: עדכן עם הנתונים האמיתיים שלך
    appId: 'YOUR_FACEBOOK_APP_ID',
    appName: 'Zpoto',
  },
  
  // Apple (לא דורש קונפיגורציה נוספת)
  apple: {
    // Apple Sign-In עובד אוטומטית עם Bundle ID של האפליקציה
    supported: true,
  }
};

export default {
  initializeSocialLogin,
  configureGoogleSignIn,
  configureFacebookSDK,
  SOCIAL_LOGIN_CONFIG,
};

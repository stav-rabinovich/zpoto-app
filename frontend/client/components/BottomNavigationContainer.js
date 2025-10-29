// components/BottomNavigationContainer.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import BottomNavigation from './BottomNavigation';

// רשימת מסכים שבהם הסרגל יוצג
const SCREENS_WITH_BOTTOM_NAV = [
  'Home',
  'Profile', 
  'Bookings',
  'Favorites',
  'AdvancedSearch', // אופציונלי
];

// רשימת מסכים שבהם הסרגל לא יוצג (לבטיחות)
const SCREENS_WITHOUT_BOTTOM_NAV = [
  // מסכי התחברות ורישום
  'Login',
  'Register',
  
  // מסכי פעולה
  'BookingDetail',
  'BookingScreen', 
  'Payment',
  
  // מסכי הגדרות
  'NotificationSettings',
  'Notifications',
  
  // מסכי בעלי חניה (כל מה שמתחיל ב-Owner)
  'OwnerIntro',
  'OwnerDashboard',
  'OwnerApply',
  'OwnerPending',
  'OwnerOverview',
  'OwnerMyListings',
  'OwnerListingForm',
  'OwnerListingDetail',
  'OwnerAvailability',
  'OwnerAnalytics',
  'OwnerSettings',
  'OwnerPricing',
  
  // מסכי מערכת
  'Debug',
  'Migration',
  'MigrationTest',
  'LegacyCleanup',
];

/**
 * קומפוננט מכיל לסרגל הניווט התחתון
 * אחראי על מעקב אחרי המסך הנוכחי וקביעה מתי להציג את הסרגל
 */
const BottomNavigationContainer = () => {
  const navigation = useNavigation();
  const [currentScreen, setCurrentScreen] = useState('Home');
  
  // מעקב אחרי שינויי מסכים
  // פתרון לבעיית useRoute() שלא עובד מחוץ לקונטקסט של Navigator
  useEffect(() => {
    // קבלת המסך הנוכחי בטעינה ראשונית
    const state = navigation.getState();
    if (state && state.routes && state.routes.length > 0) {
      const currentRoute = state.routes[state.index];
      if (currentRoute && currentRoute.name) {
        setCurrentScreen(currentRoute.name);
      }
    }
    
    // האזנה לשינויי מסכים
    const unsubscribe = navigation.addListener('state', (e) => {
      const state = e.data.state;
      if (state && state.routes && state.routes.length > 0) {
        const currentRoute = state.routes[state.index];
        if (currentRoute && currentRoute.name) {
          setCurrentScreen(currentRoute.name);
        }
      }
    });
    
    return unsubscribe;
  }, [navigation]);
  
  // בדיקה האם להציג את הסרגל (מאופטם עם useMemo)
  const showBottomNav = useMemo(() => {
    // בדיקת בטיחות - אם אין מסך נוכחי, לא להציג
    if (!currentScreen || typeof currentScreen !== 'string') {
      return false;
    }
    
    // בדיקה מפורשת - אם המסך ברשימה השחורה, לא להציג
    if (SCREENS_WITHOUT_BOTTOM_NAV.includes(currentScreen)) {
      return false;
    }
    
    // בדיקה מפורשת - אם המסך ברשימה הלבנה, להציג
    if (SCREENS_WITH_BOTTOM_NAV.includes(currentScreen)) {
      return true;
    }
    
    // בדיקות נוספות לפי דפוסים
    
    // כל מסך שמתחיל ב-Owner - לא להציג
    if (currentScreen.startsWith('Owner')) {
      return false;
    }
    
    // כל מסך שמתחיל ב-ServerOnly - לא להציג  
    if (currentScreen.startsWith('ServerOnly')) {
      return false;
    }
    
    // ברירת מחדל - לא להציג (בטוח יותר)
    return false;
  }, [currentScreen]);
  
  
  // הצגת הסרגל רק אם צריך - עם העברת currentScreen
  return showBottomNav ? <BottomNavigation currentScreen={currentScreen} /> : null;
};

export default React.memo(BottomNavigationContainer);

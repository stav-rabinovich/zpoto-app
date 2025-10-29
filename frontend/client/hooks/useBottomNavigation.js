// hooks/useBottomNavigation.js
import { useRoute } from '@react-navigation/native';
import { useMemo } from 'react';

// רשימת מסכים עם סרגל תחתון
const SCREENS_WITH_BOTTOM_NAV = [
  'Home',
  'Profile', 
  'Bookings',
  'Favorites',
  'SearchResults',
  'AdvancedSearch',
];

// רשימת מסכים ללא סרגל תחתון
const SCREENS_WITHOUT_BOTTOM_NAV = [
  // מסכי התחברות
  'Login',
  'Register',
  
  // מסכי פעולה
  'BookingDetail',
  'BookingScreen', 
  'Payment',
  
  // מסכי הגדרות
  'NotificationSettings',
  'Notifications',
];

/**
 * Hook לניהול מצב הסרגל התחתון
 * @returns {Object} מידע על מצב הסרגל
 */
export const useBottomNavigation = () => {
  const route = useRoute();
  
  const navigationState = useMemo(() => {
    const currentScreen = route.name;
    
    // בדיקה האם להציג את הסרגל
    const shouldShow = (() => {
      // בדיקה מפורשת - רשימה שחורה
      if (SCREENS_WITHOUT_BOTTOM_NAV.includes(currentScreen)) {
        return false;
      }
      
      // בדיקה מפורשת - רשימה לבנה
      if (SCREENS_WITH_BOTTOM_NAV.includes(currentScreen)) {
        return true;
      }
      
      // בדיקות דפוסים
      if (currentScreen.startsWith('Owner')) {
        return false;
      }
      
      if (currentScreen.startsWith('ServerOnly')) {
        return false;
      }
      
      // ברירת מחדל
      return false;
    })();
    
    // זיהוי סוג המסך
    const screenType = (() => {
      if (currentScreen.startsWith('Owner')) return 'owner';
      if (currentScreen.startsWith('ServerOnly')) return 'system';
      if (['Login', 'Register'].includes(currentScreen)) return 'auth';
      if (['BookingDetail', 'BookingScreen', 'Payment'].includes(currentScreen)) return 'action';
      if (SCREENS_WITH_BOTTOM_NAV.includes(currentScreen)) return 'main';
      return 'other';
    })();
    
    return {
      currentScreen,
      shouldShow,
      screenType,
      isMainScreen: SCREENS_WITH_BOTTOM_NAV.includes(currentScreen),
      isOwnerScreen: currentScreen.startsWith('Owner'),
      isAuthScreen: ['Login', 'Register'].includes(currentScreen),
      isActionScreen: ['BookingDetail', 'BookingScreen', 'Payment'].includes(currentScreen),
    };
  }, [route.name]);
  
  return navigationState;
};

/**
 * Hook לבדיקה מהירה האם להציג את הסרגל
 * @returns {boolean} האם להציג את הסרגל
 */
export const useShouldShowBottomNav = () => {
  const { shouldShow } = useBottomNavigation();
  return shouldShow;
};

/**
 * Hook לקבלת מידע על הכפתור הפעיל
 * @returns {string|null} שם הכפתור הפעיל או null
 */
export const useActiveBottomNavButton = () => {
  const route = useRoute();
  
  const activeButton = useMemo(() => {
    const currentScreen = route.name;
    
    switch (currentScreen) {
      case 'Home':
        return 'search';
      case 'Profile':
        return 'profile';
      case 'Bookings':
        return 'bookings';
      case 'Favorites':
        return 'favorites';
      case 'SearchResults':
      case 'AdvancedSearch':
        return null; // אין כפתור פעיל במסכי חיפוש
      default:
        return null;
    }
  }, [route.name]);
  
  return activeButton;
};

export default useBottomNavigation;

// utils/navigationHelpers.js
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { createImmediateSearchTimes, formatForAPI } from './timezone';

/**
 * פונקציית חיפוש סביבי משותפת
 * @param {Object} navigation - React Navigation object
 * @param {number} radiusMeters - רדיוס החיפוש במטרים (ברירת מחדל: 700)
 * @param {boolean} isImmediate - האם זה חיפוש מיידי (ברירת מחדל: false)
 * @param {number} immediateDurationHours - משך החיפוש המיידי בשעות (ברירת מחדל: 2.5)
 */
export const handleNearMeSearch = async (navigation, radiusMeters = 700, isImmediate = false, immediateDurationHours = 2.5) => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // בקשת הרשאות מיקום
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'נדרשת הרשאת מיקום', 
        'כדי למצוא חניה סביבך, אפשר הרשאת מיקום למכשיר.'
      );
      return false;
    }
    
    // קבלת המיקום הנוכחי
    const pos = await Location.getCurrentPositionAsync({ 
      accuracy: Location.Accuracy.Balanced 
    });
    
    const coords = { 
      latitude: pos.coords.latitude, 
      longitude: pos.coords.longitude 
    };
    
    // הכנת פרמטרים לחיפוש
    const searchParams = { 
      coords, 
      radiusMeters,
      searchType: isImmediate ? 'immediate' : 'general'
    };
    
    // אם זה חיפוש מיידי, הוסף זמנים
    if (isImmediate) {
      // שימוש בפונקציית העזר ליצירת זמנים מיידים
      const timeData = createImmediateSearchTimes(immediateDurationHours);
      
      searchParams.startDate = timeData.startTime; // כבר ב-UTC
      searchParams.endDate = timeData.endTime;     // כבר ב-UTC
      searchParams.minDurationHours = immediateDurationHours;
      searchParams.isImmediate = true;
      
      console.log('🚀 Immediate search params:', {
        location: `${coords.latitude}, ${coords.longitude}`,
        radius: `${radiusMeters}m`,
        duration: `${immediateDurationHours} hours`,
        timeRange: `${new Date(timeData.startTime).toLocaleTimeString('he-IL')} - ${new Date(timeData.endTime).toLocaleTimeString('he-IL')}`,
        startUTC: timeData.startTime,
        endUTC: timeData.endTime
      });
    }
    
    // ניווט לתוצאות חיפוש
    navigation.navigate('SearchResults', searchParams);
    
    return true;
  } catch (error) {
    console.error('Near me search error:', error);
    Alert.alert(
      'שגיאה באיתור מיקום', 
      'לא הצלחנו לאתר את המיקום שלך כרגע.'
    );
    return false;
  }
};

/**
 * פונקציית ניווט לפרופיל עם AuthGate
 * @param {Object} navigation - React Navigation object
 * @param {Function} attemptProfileAccess - AuthGate function
 * @param {string} source - מקור הלחיצה לצורכי tracking
 */
export const handleProfileNavigation = async (navigation, attemptProfileAccess, source = 'unknown') => {
  try {
    // בדיקה אם כבר במסך הנוכחי
    const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];
    if (currentRoute?.name === 'Profile') {
      return true; // כבר במסך - לא לעשות כלום
    }
    
    await attemptProfileAccess(
      () => {
        // אם המשתמש מחובר, נווט ישירות לפרופיל (ללא היסטוריה)
        navigation.reset({
          index: 0,
          routes: [{ name: 'Profile' }],
        });
      },
      source // מקור הלחיצה
    );
    return true;
  } catch (error) {
    console.error('Profile navigation error:', error);
    return false;
  }
};

/**
 * פונקציות ניווט פשוטות עם Haptic feedback
 */
export const navigationActions = {
  /**
   * ניווט להזמנות (ללא היסטוריה)
   */
  goToBookings: async (navigation) => {
    try {
      // בדיקה אם כבר במסך הנוכחי
      const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];
      if (currentRoute?.name === 'Bookings') {
        return true; // כבר במסך - לא לעשות כלום
      }
      
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Bookings' }],
      });
      return true;
    } catch (error) {
      console.error('Bookings navigation error:', error);
      return false;
    }
  },

  /**
   * ניווט למועדפים (ללא היסטוריה)
   */
  goToFavorites: async (navigation) => {
    try {
      // בדיקה אם כבר במסך הנוכחי
      const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];
      if (currentRoute?.name === 'Favorites') {
        return true; // כבר במסך - לא לעשות כלום
      }
      
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Favorites' }],
      });
      return true;
    } catch (error) {
      console.error('Favorites navigation error:', error);
      return false;
    }
  },

  /**
   * ניווט לדף הבית (חיפוש) (ללא היסטוריה)
   */
  goToHome: async (navigation) => {
    try {
      // בדיקה אם כבר במסך הנוכחי
      const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];
      if (currentRoute?.name === 'Home') {
        return true; // כבר במסך - לא לעשות כלום
      }
      
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      return true;
    } catch (error) {
      console.error('Home navigation error:', error);
      return false;
    }
  },

  /**
   * ניווט לחיפוש מתקדם
   */
  goToAdvancedSearch: async (navigation, mode = 'future') => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('AdvancedSearch', { mode });
      return true;
    } catch (error) {
      console.error('Advanced search navigation error:', error);
      return false;
    }
  },
};

/**
 * בדיקה האם מסך מסוים פעיל
 * @param {Object} route - React Navigation route object
 * @param {string} screenName - שם המסך לבדיקה
 * @returns {boolean}
 */
export const isScreenActive = (route, screenName) => {
  return route.name === screenName;
};

/**
 * קבלת צבע כפתור לפי מצב פעיל/לא פעיל
 * @param {boolean} isActive - האם הכפתור פעיל
 * @param {string} activeColor - צבע כשפעיל
 * @param {string} inactiveColor - צבע כשלא פעיל
 * @returns {string}
 */
export const getButtonColor = (isActive, activeColor, inactiveColor) => {
  return isActive ? activeColor : inactiveColor;
};

export default {
  handleNearMeSearch,
  handleProfileNavigation,
  navigationActions,
  isScreenActive,
  getButtonColor,
};

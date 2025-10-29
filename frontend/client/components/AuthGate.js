// components/AuthGate.js
// Authentication Gate - מחליט מתי נדרשת התחברות לפעולה מסוימת

import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useNavigationContext } from '../contexts/NavigationContext';

/**
 * Authentication Gate - בודק אם פעולה דורשת התחברות
 * 
 * אסטרטגיה:
 * - לקוחות (Guest Users): שוטטות חופשית, התחברות רק לפני הזמנת חניה
 * - בעלי חניה: התחברות רק אחרי אישור באדמין
 */

// פעולות שדורשות התחברות
const ACTIONS_REQUIRING_AUTH = {
  // פעולות של לקוחות
  BOOK_PARKING: 'book_parking',           // הזמנת חניה
  VIEW_BOOKINGS: 'view_bookings',         // צפייה בהזמנות
  MANAGE_PROFILE: 'manage_profile',       // ניהול פרופיל
  
  // פעולות של בעלי חניה
  SUBMIT_OWNER_REQUEST: 'submit_owner_request',    // הגשת בקשת בעלות
  MANAGE_PARKINGS: 'manage_parkings',              // ניהול חניות
  VIEW_EARNINGS: 'view_earnings',                  // צפייה ברווחים
};

// פעולות שלא דורשות התחברות (Anonymous)
const GUEST_ALLOWED_ACTIONS = [
  'browse_app',           // שוטטות באפליקציה
  'search_parking',       // חיפוש חניות
  'view_parking_details', // צפייה בפרטי חניה
  'save_favorites',       // שמירת מועדפים (עם Device ID)
  'save_searches',        // שמירת חיפושים (עם Device ID)
  'view_map',             // צפייה במפה
  'navigation_to_parking', // ניווט לחניה
];

/**
 * Hook לשימוש ב-AuthGate
 */
export const useAuthGate = () => {
  const { user, isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const { setIntendedDestination, createProfileDestination, createBookingDestination, createBookingsDestination } = useNavigationContext();

  /**
   * בודק אם פעולה דורשת התחברות
   * @param {string} action - הפעולה שרוצים לבצע
   * @returns {boolean} - האם נדרשת התחברות
   */
  const requiresAuth = (action) => {
    // פעולות שלא דורשות התחברות
    if (GUEST_ALLOWED_ACTIONS.includes(action)) {
      return false;
    }
    
    // פעולות שדורשות התחברות
    return Object.values(ACTIONS_REQUIRING_AUTH).includes(action);
  };

  /**
   * מנסה לבצע פעולה עם שמירת כוונת ניווט חכמה
   * @param {string} action - הפעולה
   * @param {Function} onSuccess - מה לעשות אם הפעולה מותרת
   * @param {Object} navigationData - נתוני ניווט לשמירה (optional)
   * @param {Function} onAuthRequired - מה לעשות אם נדרשת התחברות (optional)
   * @returns {boolean} - האם הפעולה מותרת
   */
  const attemptActionWithNavigation = async (action, onSuccess, navigationData = null, onAuthRequired = null) => {
    console.log('🚪 AuthGate attempting action:', action);
    
    // אם הפעולה לא דורשת התחברות - בצע אותה
    if (!requiresAuth(action)) {
      console.log('✅ AuthGate: Action does not require auth, allowing:', action);
      onSuccess?.();
      return true;
    }

    // אם המשתמש מחובר - בצע את הפעולה
    console.log('🚪 AuthGate check - isAuthenticated:', isAuthenticated, 'user exists:', !!user);
    if (isAuthenticated && user) {
      console.log('✅ AuthGate: User is authenticated, allowing action:', action);
      onSuccess?.();
      return true;
    }

    // אם נדרשת התחברות והמשתמש לא מחובר - שמור כוונת ניווט
    if (navigationData) {
      await setIntendedDestination(navigationData);
      console.log('🎯 AuthGate: Saved navigation intent for action:', action);
    }

    // אם נדרשת התחברות והמשתמש לא מחובר
    console.log('❌ AuthGate: Authentication required for action:', action);
    if (onAuthRequired) {
      onAuthRequired();
    } else {
      showAuthRequiredDialog(action);
    }
    
    return false;
  };

  /**
   * מנסה לבצע פעולה - גרסה מקורית לתאימות לאחור
   * @param {string} action - הפעולה
   * @param {Function} onSuccess - מה לעשות אם הפעולה מותרת
   * @param {Function} onAuthRequired - מה לעשות אם נדרשת התחברות (optional)
   * @returns {boolean} - האם הפעולה מותרת
   */
  const attemptAction = (action, onSuccess, onAuthRequired = null) => {
    // אם הפעולה לא דורשת התחברות - בצע אותה
    if (!requiresAuth(action)) {
      onSuccess?.();
      return true;
    }

    // אם המשתמש מחובר - בצע את הפעולה
    if (isAuthenticated && user) {
      onSuccess?.();
      return true;
    }

    // אם נדרשת התחברות והמשתמש לא מחובר
    if (onAuthRequired) {
      onAuthRequired();
    } else {
      showAuthRequiredDialog(action);
    }
    
    return false;
  };

  /**
   * פונקציות עזר לפעולות נפוצות עם שמירת כוונת ניווט
   */
  const attemptProfileAccess = async (onSuccess, source = 'unknown') => {
    // אם זה מכפתור ה-header, לא נשמור destination - נחזור לדף הבית אחרי התחברות
    const shouldSaveDestination = source !== 'header_button';
    const navigationData = shouldSaveDestination ? createProfileDestination(source) : null;
    
    return await attemptActionWithNavigation(
      ACTIONS_REQUIRING_AUTH.MANAGE_PROFILE,
      onSuccess,
      navigationData
    );
  };

  const attemptBookingAction = async (onSuccess, parkingData, bookingDetails = {}) => {
    const navigationData = createBookingDestination(parkingData, bookingDetails);
    return await attemptActionWithNavigation(
      ACTIONS_REQUIRING_AUTH.BOOK_PARKING,
      onSuccess,
      navigationData
    );
  };

  const attemptViewBookings = async (onSuccess) => {
    const navigationData = createBookingsDestination();
    return await attemptActionWithNavigation(
      ACTIONS_REQUIRING_AUTH.VIEW_BOOKINGS,
      onSuccess,
      navigationData
    );
  };

  /**
   * מציג דיאלוג שמסביר למה נדרשת התחברות
   * @param {string} action - הפעולה שנחסמה
   */
  const showAuthRequiredDialog = (action) => {
    let title = 'נדרשת התחברות';
    let message = '';

    switch (action) {
      case ACTIONS_REQUIRING_AUTH.BOOK_PARKING:
        message = 'כדי להזמין חניה, עליך להתחבר או להירשם למערכת.';
        break;
      case ACTIONS_REQUIRING_AUTH.VIEW_BOOKINGS:
        message = 'כדי לצפות בהזמנות שלך, עליך להתחבר למערכת.';
        break;
      case ACTIONS_REQUIRING_AUTH.MANAGE_PROFILE:
        message = 'כדי לנהל את הפרופיל שלך, עליך להתחבר למערכת.';
        break;
      case ACTIONS_REQUIRING_AUTH.SUBMIT_OWNER_REQUEST:
        message = 'כדי להגיש בקשה להיות בעל חניה, עליך להתחבר או להירשם.';
        break;
      case ACTIONS_REQUIRING_AUTH.MANAGE_PARKINGS:
        message = 'כדי לנהל את החניות שלך, עליך להתחבר כבעל חניה מאושר.';
        break;
      case ACTIONS_REQUIRING_AUTH.VIEW_EARNINGS:
        message = 'כדי לצפות ברווחים, עליך להתחבר כבעל חניה מאושר.';
        break;
      default:
        message = 'הפעולה הזו דורשת התחברות למערכת.';
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: 'בטל',
          style: 'cancel'
        },
        {
          text: 'התחבר',
          onPress: () => {
            // ניווט למסך התחברות
            try {
              navigation.navigate('Login');
            } catch (error) {
              // אם יש בעיה עם הניווט, נסה לנווט למסך ServerOnlyLogin
              try {
                navigation.navigate('ServerOnlyLogin');
              } catch (fallbackError) {
                console.error('Failed to navigate to login screen:', fallbackError);
                Alert.alert('שגיאה', 'לא הצלחנו לפתוח את מסך ההתחברות');
              }
            }
          }
        }
      ]
    );
  };

  return {
    // Original functions (for backward compatibility)
    requiresAuth,
    attemptAction,
    showAuthRequiredDialog,
    
    // New smart navigation functions
    attemptActionWithNavigation,
    attemptProfileAccess,
    attemptBookingAction,
    attemptViewBookings,
    
    // State
    isAuthenticated,
    user,
    
    // Constants
    ACTIONS_REQUIRING_AUTH,
    GUEST_ALLOWED_ACTIONS
  };
};

/**
 * AuthGate Component - עוטף קומפוננט ובודק אם נדרשת התחברות
 */
export const AuthGate = ({ 
  action, 
  children, 
  fallback = null,
  showDialog = true 
}) => {
  const { requiresAuth, isAuthenticated, showAuthRequiredDialog } = useAuthGate();

  // אם הפעולה לא דורשת התחברות או המשתמש מחובר - הצג את הקומפוננט
  if (!requiresAuth(action) || isAuthenticated) {
    return children;
  }

  // אם נדרשת התחברות והמשתמש לא מחובר
  if (showDialog) {
    showAuthRequiredDialog(action);
  }

  // הצג fallback או null
  return fallback;
};

/**
 * HOC לעטיפת קומפוננט עם AuthGate
 */
export const withAuthGate = (WrappedComponent, action) => {
  return (props) => {
    const { attemptAction } = useAuthGate();
    
    const handleAction = () => {
      return attemptAction(
        action,
        () => {
          // הפעולה מותרת - המשך כרגיל
        }
      );
    };

    return (
      <WrappedComponent 
        {...props} 
        isActionAllowed={handleAction}
        authAction={action}
      />
    );
  };
};

export default AuthGate;

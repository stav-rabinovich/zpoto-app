import React, { createContext, useState, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
// Updated to use SecureStore instead of AsyncStorage

const NavigationContext = createContext({});

/**
 * NavigationContext - מנהל את מצב הניווט והמשכיות לאחר התחברות
 * מטרה: לשמור את הנקודה שבה המשתמש עצר ולהחזיר אותו לשם לאחר התחברות
 */
export const NavigationProvider = ({ children }) => {
  const [pendingNavigation, setPendingNavigation] = useState(null);

  /**
   * שמירת יעד מיועד לאחר התחברות
   * @param {Object} navigationData - נתוני הניווט
   * @param {string} navigationData.screen - שם המסך
   * @param {Object} navigationData.params - פרמטרים למסך
   * @param {string} navigationData.action - סוג הפעולה (profile, booking, etc.)
   * @param {Object} navigationData.context - הקשר נוסף (booking details, etc.)
   */
  const setIntendedDestination = async (navigationData) => {
    try {
      console.log('🎯 NavigationContext: Setting intended destination:', navigationData);
      
      const destination = {
        ...navigationData,
        timestamp: Date.now()
      };
      
      // שמירה ב-state לגישה מיידית
      setPendingNavigation(destination);
      
      // שמירה ב-SecureStore לעמידות
      await SecureStore.setItemAsync('pendingNavigation', JSON.stringify(destination));
      
      return true;
    } catch (error) {
      console.error('Failed to set intended destination:', error);
      return false;
    }
  };

  /**
   * קבלת היעד המיועד
   */
  const getIntendedDestination = async () => {
    try {
      // קודם נבדוק ב-state
      if (pendingNavigation) {
        return pendingNavigation;
      }
      
      // אם לא, נבדוק ב-SecureStore
      const stored = await SecureStore.getItemAsync('pendingNavigation');
      if (stored) {
        const destination = JSON.parse(stored);
        setPendingNavigation(destination);
        return destination;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get intended destination:', error);
      return null;
    }
  };

  /**
   * ביצוע הניווט המיועד לאחר התחברות
   * @param {Object} navigation - React Navigation object
   */
  const executeIntendedNavigation = async (navigation) => {
    try {
      const destination = await getIntendedDestination();
      
      if (!destination) {
        console.log('🎯 NavigationContext: No pending navigation found');
        return false;
      }
      
      console.log('🎯 NavigationContext: Executing intended navigation:', destination);
      
      // ביצוע הניווט עם איפוס ה-stack
      if (destination.screen) {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Home' },
            { name: destination.screen, params: destination.params || {} }
          ],
        });
      }
      
      // ניקוי הניווט המיועד
      await clearIntendedDestination();
      
      return true;
    } catch (error) {
      console.error('Failed to execute intended navigation:', error);
      return false;
    }
  };

  /**
   * ניקוי הניווט המיועד
   */
  const clearIntendedDestination = async () => {
    try {
      setPendingNavigation(null);
      await SecureStore.deleteItemAsync('pendingNavigation');
      console.log('🎯 NavigationContext: Cleared intended destination');
    } catch (error) {
      console.error('Failed to clear intended destination:', error);
    }
  };

  /**
   * בדיקה אם יש ניווט מיועד
   */
  const hasIntendedDestination = () => {
    return !!pendingNavigation;
  };

  /**
   * יצירת נתוני ניווט לפרופיל
   */
  const createProfileDestination = (source = 'unknown') => ({
    screen: 'Profile',
    action: 'view_profile',
    context: { source },
    params: {}
  });

  /**
   * יצירת נתוני ניווט להזמנה
   */
  const createBookingDestination = (parkingData, bookingDetails = {}) => ({
    screen: 'BookingScreen',
    action: 'book_parking',
    context: { 
      parking: parkingData,
      booking: bookingDetails
    },
    params: {
      parking: parkingData,
      ...bookingDetails
    }
  });

  /**
   * יצירת נתוני ניווט להזמנות
   */
  const createBookingsDestination = () => ({
    screen: 'Bookings',
    action: 'view_bookings',
    context: {},
    params: {}
  });

  const value = {
    // State
    pendingNavigation,
    hasIntendedDestination: hasIntendedDestination(),
    
    // Actions
    setIntendedDestination,
    getIntendedDestination,
    executeIntendedNavigation,
    clearIntendedDestination,
    
    // Helpers
    createProfileDestination,
    createBookingDestination,
    createBookingsDestination,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
};

export default NavigationContext;

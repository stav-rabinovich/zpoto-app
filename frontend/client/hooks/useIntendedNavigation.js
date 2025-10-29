import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/ServerOnlyAuthContext';

/**
 * Hook לניהול ניווט מיועד לאחר התחברות
 * מטפל בחזרה לנקודה המדויקת שבה המשתמש עצר
 */
export const useIntendedNavigation = () => {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const {
    setIntendedDestination,
    executeIntendedNavigation,
    clearIntendedDestination,
    hasIntendedDestination,
    createProfileDestination,
    createBookingDestination,
    createBookingsDestination,
  } = useNavigationContext();

  /**
   * ביצוע ניווט מיועד כשהמשתמש מתחבר
   */
  useEffect(() => {
    if (isAuthenticated && hasIntendedDestination) {
      console.log('🎯 useIntendedNavigation: User authenticated, executing intended navigation');
      
      // המתנה קצרה לוודא שהמסכים נטענו
      const timer = setTimeout(() => {
        executeIntendedNavigation(navigation);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasIntendedDestination, navigation, executeIntendedNavigation]);

  /**
   * ניווט לפרופיל עם שמירת כוונה
   */
  const navigateToProfile = async (source = 'unknown') => {
    if (isAuthenticated) {
      // אם המשתמש מחובר, נווט ישירות
      navigation.navigate('Profile');
      return true;
    }

    // אם לא מחובר, שמור כוונה ונווט להתחברות
    const destination = createProfileDestination(source);
    const success = await setIntendedDestination(destination);
    
    if (success) {
      console.log('🎯 Profile navigation intent saved, redirecting to login');
      navigation.navigate('Login');
      return true;
    }

    return false;
  };

  /**
   * ניווט להזמנה עם שמירת כוונה
   */
  const navigateToBooking = async (parkingData, bookingDetails = {}) => {
    if (isAuthenticated) {
      // אם המשתמש מחובר, נווט ישירות
      navigation.navigate('Booking', { parking: parkingData, ...bookingDetails });
      return true;
    }

    // אם לא מחובר, שמור כוונה ונווט להתחברות
    const destination = createBookingDestination(parkingData, bookingDetails);
    const success = await setIntendedDestination(destination);
    
    if (success) {
      console.log('🎯 Booking navigation intent saved, redirecting to login');
      navigation.navigate('Login');
      return true;
    }

    return false;
  };

  /**
   * ניווט להזמנות עם שמירת כוונה
   */
  const navigateToBookings = async () => {
    if (isAuthenticated) {
      // אם המשתמש מחובר, נווט ישירות
      navigation.navigate('Bookings');
      return true;
    }

    // אם לא מחובר, שמור כוונה ונווט להתחברות
    const destination = createBookingsDestination();
    const success = await setIntendedDestination(destination);
    
    if (success) {
      console.log('🎯 Bookings navigation intent saved, redirecting to login');
      navigation.navigate('Login');
      return true;
    }

    return false;
  };

  /**
   * ניקוי כוונת ניווט (למקרה של ביטול)
   */
  const cancelIntendedNavigation = async () => {
    await clearIntendedDestination();
    console.log('🎯 Intended navigation cancelled');
  };

  return {
    // Navigation functions
    navigateToProfile,
    navigateToBooking,
    navigateToBookings,
    
    // Utility functions
    cancelIntendedNavigation,
    
    // State
    hasIntendedDestination,
    isAuthenticated,
  };
};

export default useIntendedNavigation;

// hooks/useAuthGate.js
// Hook פשוט לבדיקת authentication - יוכל להתרחב בעתיד

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

// פעולות שדורשות התחברות
const ACTIONS_REQUIRING_AUTH = {
  BOOK_PARKING: 'book_parking',
  VIEW_BOOKINGS: 'view_bookings',
  MANAGE_PROFILE: 'manage_profile',
  SUBMIT_OWNER_REQUEST: 'submit_owner_request',
  MANAGE_PARKINGS: 'manage_parkings',
  VIEW_EARNINGS: 'view_earnings'
};

export const useAuthGate = () => {
  const { isAuthenticated, user } = useAuth();
  const navigation = useNavigation();
  const [shouldShowGate, setShouldShowGate] = useState(false);

  // כרגע פשוט מחזיר את סטטוס ההתחברות
  // בעתיד נוכל להוסיף לוגיקה מורכבת יותר
  useEffect(() => {
    setShouldShowGate(!isAuthenticated);
  }, [isAuthenticated]);

  const openGate = () => {
    // פונקציה לפתיחת המחסום - כרגע ריקה
    // בעתיד נוכל להוסיף ניווט למסך התחברות
    console.log('Auth gate opened');
  };

  // פונקציה לניסיון ביצוע פעולה שדורשת התחברות
  const attemptAction = (action, onSuccess) => {
    if (isAuthenticated) {
      // המשתמש מחובר - בצע הפעולה
      onSuccess && onSuccess();
    } else {
      // המשתמש לא מחובר - הצג הודעה
      let message = '';
      switch (action) {
        case ACTIONS_REQUIRING_AUTH.BOOK_PARKING:
          message = 'כדי להזמין חניה, עליך להתחבר או להירשם למערכת.';
          break;
        case ACTIONS_REQUIRING_AUTH.VIEW_BOOKINGS:
          message = 'כדי לצפות בהזמנות שלך, עליך להתחבר למערכת.';
          break;
        default:
          message = 'כדי לבצע פעולה זו, עליך להתחבר למערכת.';
      }
      
      Alert.alert('נדרשת התחברות', message, [
        { text: 'ביטול', style: 'cancel' },
        { text: 'התחבר', onPress: () => {
          try {
            navigation.navigate('Login');
          } catch (error) {
            console.error('Navigation to login failed:', error);
            // fallback - נסה מסכים אחרים
            try {
              navigation.navigate('Auth', { screen: 'Login' });
            } catch (fallbackError) {
              console.error('Fallback navigation failed:', fallbackError);
            }
          }
        }}
      ]);
    }
  };

  return {
    isAuthenticated,
    user,
    shouldShowGate,
    openGate,
    attemptAction,
    ACTIONS_REQUIRING_AUTH
  };
};

export default useAuthGate;

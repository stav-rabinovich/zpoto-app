// components/AuthGateExamples.js
// דוגמאות לשימוש ב-AuthGate

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useAuthGate, AuthGate, ACTIONS_REQUIRING_AUTH } from './AuthGate';

/**
 * דוגמא 1: שימוש ב-useAuthGate Hook
 */
export const BookParkingButton = ({ parking, onBook }) => {
  const { attemptAction } = useAuthGate();

  const handleBookPress = () => {
    attemptAction(
      ACTIONS_REQUIRING_AUTH.BOOK_PARKING,
      () => {
        // המשתמש מחובר - בצע הזמנה
        onBook(parking);
      },
      () => {
        // צריך התחברות - הדיאלוג כבר יוצג אוטומטית
        console.log('User needs to login to book parking');
      }
    );
  };

  return (
    <TouchableOpacity onPress={handleBookPress}>
      <Text>הזמן עכשיו</Text>
    </TouchableOpacity>
  );
};

/**
 * דוגמא 2: שימוש ב-AuthGate Component
 */
export const ViewBookingsButton = ({ onPress }) => {
  return (
    <AuthGate 
      action={ACTIONS_REQUIRING_AUTH.VIEW_BOOKINGS}
      fallback={
        <Text>עליך להתחבר כדי לצפות בהזמנות</Text>
      }
    >
      <TouchableOpacity onPress={onPress}>
        <Text>ההזמנות שלי</Text>
      </TouchableOpacity>
    </AuthGate>
  );
};

/**
 * דוגמא 3: פעולה שלא דורשת התחברות
 */
export const SearchParkingButton = ({ onPress }) => {
  // חיפוש חניות לא דורש התחברות - יעבד תמיד
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>חפש חניות</Text>
    </TouchableOpacity>
  );
};

/**
 * דוגמא 4: שימוש בהזמנת חניה במסך SearchResults
 */
export const ParkingCard = ({ parking }) => {
  const { attemptAction, ACTIONS_REQUIRING_AUTH } = useAuthGate();

  const handleBooking = () => {
    attemptAction(
      ACTIONS_REQUIRING_AUTH.BOOK_PARKING,
      () => {
        // המשתמש מחובר - נווט למסך הזמנה
        navigation.navigate('Booking', { 
          spot: parking 
        });
      }
    );
  };

  const handleFavorite = () => {
    // שמירת מועדפים לא דורשת התחברות - עובד עם Device ID
    // הפעולה הזו תמיד תעבוד
    addToFavorites(parking);
  };

  return (
    <View>
      <TouchableOpacity onPress={handleBooking}>
        <Text>הזמן עכשיו</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleFavorite}>
        <Text>הוסף למועדפים</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * דוגמא 5: בקשת בעלות חניה
 */
export const OwnerRequestButton = () => {
  const { attemptAction, ACTIONS_REQUIRING_AUTH } = useAuthGate();

  const handleOwnerRequest = () => {
    attemptAction(
      ACTIONS_REQUIRING_AUTH.SUBMIT_OWNER_REQUEST,
      () => {
        // המשתמש מחובר - נווט למסך בקשת בעלות
        navigation.navigate('OwnerRequest');
      }
    );
  };

  return (
    <TouchableOpacity onPress={handleOwnerRequest}>
      <Text>הגש בקשת בעלות</Text>
    </TouchableOpacity>
  );
};

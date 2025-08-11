// App.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './navigationRef';
import * as Notifications from 'expo-notifications';

// מסכי חיפוש והזמנות
import HomeScreen from './screens/HomeScreen';
import SearchResultsScreen from './screens/SearchResultsScreen';
import BookingScreen from './screens/BookingScreen';
import BookingsScreen from './screens/BookingsScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdvancedSearchScreen from './screens/AdvancedSearchScreen';

// מסכי בעלי חניה
import OwnerIntroScreen from './screens/OwnerIntroScreen';
import OwnerDashboardScreen from './screens/OwnerDashboardScreen';
import OwnerListingFormScreen from './screens/OwnerListingFormScreen';
import OwnerAnalyticsScreen from './screens/OwnerAnalyticsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        const data = response.notification.request.content.data;
        if (data?.bookingId) {
          navigationRef.current?.navigate('Booking', { bookingId: data.bookingId });
        } else {
          navigationRef.current?.navigate('Bookings');
        }
      } catch (e) {
        console.warn('Notification nav error', e);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {/* עטפנו את כל ה-Screen בתוך Fragment כדי למנוע טקסט/רווחים כילדים של ה-Navigator */}
        <>
          {/* מסכי חיפוש והזמנות */}
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Zpoto' }} />
          <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: 'תוצאות חיפוש' }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'הזמנה' }} />
          <Stack.Screen name="Bookings" component={BookingsScreen} options={{ title: 'ההזמנות שלי' }} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'מועדפים' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'הפרופיל שלי' }} />
          <Stack.Screen name="AdvancedSearch" component={AdvancedSearchScreen} options={{ title: 'חיפוש מתקדם' }} />

          {/* מסכי בעלי חניה */}
          <Stack.Screen name="OwnerIntro" component={OwnerIntroScreen} options={{ title: 'בעלי חניה' }} />
          <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} options={{ title: 'לוח בקרה – בעלי חניה' }} />
          <Stack.Screen name="OwnerListingForm" component={OwnerListingFormScreen} options={{ title: 'טופס חניה' }} />
          <Stack.Screen name="OwnerAnalytics" component={OwnerAnalyticsScreen} options={{ title: 'סטטיסטיקות חניה' }} />
        </>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

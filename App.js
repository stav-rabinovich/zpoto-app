// App.js
import React, { useEffect, useMemo } from 'react';
import { View, Pressable, Platform, Text, TextInput, I18nManager } from 'react-native';
import { NavigationContainer, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
import {
  createStackNavigator,
  CardStyleInterpolators,
  HeaderStyleInterpolators,
  TransitionSpecs,
} from '@react-navigation/stack';
import { navigationRef } from '../navigationRef';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme, createText } from '@shopify/restyle';
import { theme } from '../theme/zpotoThemeRestyle';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens(true);

// ===== RTL BOOT (פעם אחת) =====
(function rtlBootOnce() {
  try {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.swapLeftAndRightInRTL(true);
      I18nManager.forceRTL(true); // דורש Reload מלא פעם אחת
    }
  } catch {}
})();

// ===== ברירת מחדל לטקסטים: ימין + RTL =====
(function ensureRTLTextDefaults() {
  const base = { textAlign: 'right', writingDirection: 'rtl' };
  if (!Text.defaultProps) Text.defaultProps = {};
  if (!TextInput.defaultProps) TextInput.defaultProps = {};
  const toArr = (s) => (Array.isArray(s) ? s : s ? [s] : []);
  Text.defaultProps.style = [...toArr(Text.defaultProps.style), base];
  TextInput.defaultProps.style = [...toArr(TextInput.defaultProps.style), base];
})();

const RText = createText();

// מסכים
import HomeScreen from '../screens/HomeScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import BookingScreen from '../screens/BookingScreen';
import BookingsScreen from '../screens/BookingsScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdvancedSearchScreen from '../screens/AdvancedSearchScreen';

import OwnerIntroScreen from '../screens/OwnerIntroScreen';
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import OwnerListingFormScreen from '../screens/OwnerListingFormScreen';
import OwnerOverviewScreen from '../screens/OwnerOverviewScreen';
import OwnerPendingScreen from '../screens/OwnerPendingScreen';
import OwnerListingDetailScreen from '../screens/OwnerListingDetailScreen';

// Stack (JS)
const Stack = createStackNavigator();

const navTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.bg,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.secondary,
  },
};

function ZpGradientHeader({ navigation, route, options, back }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const title = options.title ?? route.name;
  const canGoBack = navigation?.canGoBack?.() && back;
  const HEADER_HEIGHT = 56;
  const isRTL = I18nManager.isRTL;

  const handleBack = async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    navigation.goBack();
  };

  // מיקום כפתורים בהתאם לכיוון
  const backBtnPos = { position: 'absolute', [isRTL ? 'right' : 'left']: 6, top: insets.top + 6, zIndex: 10 };
  const profileBtnPos = { position: 'absolute', [isRTL ? 'left' : 'right']: 12, top: insets.top + 6, zIndex: 10 };

  // חץ הפוך שביקשת
  const backIconName = isRTL ? 'chevron-back' : 'chevron-forward';

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingTop: insets.top,
        paddingHorizontal: 12,
        height: insets.top + HEADER_HEIGHT,
        justifyContent: 'center',
      }}
    >
      {/* Back */}
      {canGoBack ? (
        <View style={backBtnPos}>
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            android_ripple={{ color: 'rgba(255,255,255,0.15)', radius: 18 }}
            style={{ padding: 8, borderRadius: 999 }}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
          >
            <Ionicons name={backIconName} size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

      {/* Profile */}
      <View style={profileBtnPos}>
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', radius: 18 }}
          style={{ padding: 6, borderRadius: 999 }}
          accessibilityRole="button"
          accessibilityLabel="פרופיל"
        >
          <Ionicons name="person-circle" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* כותרת במרכז */}
      <View style={{ alignItems: 'center' }} pointerEvents="none">
        <RText variant="h2" style={{ color: '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>
          {title}
        </RText>
      </View>
    </LinearGradient>
  );
}

export default function App() {
  // ניווט מהתראות
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data || {};
        if (data.bookingId) navigationRef.current?.navigate('BookingDetail', { bookingId: data.bookingId });
        else navigationRef.current?.navigate('Bookings');
      } catch (e) { console.warn('Notification nav error', e); }
    });
    return () => sub.remove();
  }, []);

  const screenOptions = useMemo(
    () => ({
      header: (props) => <ZpGradientHeader {...props} />,
      contentStyle: { backgroundColor: theme.colors.bg },

      // ✅ גרירה מימין לשמאל
      gestureEnabled: true,
      gestureDirection: 'horizontal-inverted',
      // להפוך את האנימציה ל"חלקה" במיוחד בסוף הגרירה
      cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      headerStyleInterpolator: HeaderStyleInterpolators.forUIKit,
      transitionSpec: {
        open: TransitionSpecs.TransitionIOSSpec,
        close: TransitionSpecs.TransitionIOSSpec,
      },
      // להשאיר את המסך הקודם מחובר למניעת פליקר בקצה הסגירה
      detachPreviousScreen: false,
      cardOverlayEnabled: false,

      animationEnabled: true,
      headerBackTitleVisible: false,
    }),
    []
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        <ThemeProvider theme={theme}>
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <View style={{ flex: 1 }}>
              <Stack.Navigator screenOptions={screenOptions}>
                <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Zpoto' }} />
                <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: 'תוצאות חיפוש' }} />
                <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'הזמנה' }} />
                <Stack.Screen name="Bookings" component={BookingsScreen} options={{ title: 'ההזמנות שלי' }} />
                <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'פרטי הזמנה' }} />
                <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'מועדפים' }} />
                <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'הפרופיל שלי' }} />
                <Stack.Screen name="AdvancedSearch" component={AdvancedSearchScreen} options={{ title: 'חניה עתידית' }} />

                <Stack.Screen name="OwnerIntro" component={OwnerIntroScreen} options={{ title: 'בעלי חניה' }} />
                <Stack.Screen name="OwnerOverview" component={OwnerOverviewScreen} options={{ title: 'סקירה כללית' }} />
                <Stack.Screen name="OwnerPending" component={OwnerPendingScreen} options={{ title: 'בקשות בהמתנה' }} />
                <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} options={{ title: 'ניהול החניות' }} />
                <Stack.Screen name="OwnerListingForm" component={OwnerListingFormScreen} options={{ title: 'טופס חניה' }} />
                <Stack.Screen name="OwnerListingDetail" component={OwnerListingDetailScreen} options={{ title: 'דוח חניה' }} />
              </Stack.Navigator>
            </View>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

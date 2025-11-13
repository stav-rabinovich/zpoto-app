// App.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Platform, Text, TextInput, I18nManager, AppState } from 'react-native';
import { NavigationContainer, DefaultTheme as NavDefaultTheme, useNavigation } from '@react-navigation/native';
import {
  createStackNavigator,
  CardStyleInterpolators,
  HeaderStyleInterpolators,
  TransitionSpecs,
} from '@react-navigation/stack';
import { navigationRef } from './navigationRef';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme, createText } from '@shopify/restyle';
import { theme } from './theme/zpotoThemeRestyle';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { initializeSocialLogin } from './services/auth/socialLoginConfig';
import { initializeTokenManager } from './services/api/tokenManager';
import NavigationWrapper from './components/NavigationWrapper';
import { useAuth } from './contexts/AuthContext';
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

// קומפוננטת כפתור בעלי חניה בסרגל העליון
const OwnerButton = () => {
  const { isAuthenticated, user } = useAuth();
  const navigation = useNavigation();
  const [ownerStatus, setOwnerStatus] = useState('none');

  // בדיקת סטטוס בעל חניה
  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (isAuthenticated && user?.email) {
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/owner/status`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            setOwnerStatus(data.status || 'none');
          } else {
            setOwnerStatus('none');
          }
        } catch (error) {
          // שגיאת רשת - פשוט נשאיר none ללא לוג
          setOwnerStatus('none');
        }
      } else {
        setOwnerStatus('none');
      }
    };

    checkOwnerStatus();
  }, [isAuthenticated, user]);

  const handleOwnerPress = () => {
    navigation.navigate('OwnerIntro');
  };

  // בחירת אייקון לפי סטטוס
  const getIcon = () => {
    if (ownerStatus === 'approved') return 'home';
    if (isAuthenticated) return 'business';
    return 'cash';
  };

  return (
    <Pressable
      onPress={handleOwnerPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      android_ripple={{ color: 'rgba(255,255,255,0.2)', radius: 18 }}
      style={{ padding: 6, borderRadius: 999 }}
      accessibilityRole="button"
      accessibilityLabel="בעלי חניה"
    >
      <Ionicons name={getIcon()} size={24} color="#FFFFFF" />
    </Pressable>
  );
};


// Auth - Updated to use fixed AuthContext
import { AuthProvider } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { AppProvider } from './contexts/AppContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

// מסכים
import HomeScreen from './screens/HomeScreen';
import SearchResultsScreen from './screens/SearchResultsScreen';
import BookingScreen from './screens/BookingScreen';
import PaymentScreen from './screens/PaymentScreen';
import BookingsScreen from './screens/BookingsScreen';
import BookingDetailScreen from './screens/BookingDetailScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdvancedSearchScreen from './screens/AdvancedSearchScreen';

import OwnerIntroScreen from './screens/OwnerIntroScreen';
import OwnerDashboardScreen from './screens/OwnerDashboardScreen';
import OwnerListingFormScreen from './screens/OwnerListingFormScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import OwnerOverviewScreen from './screens/OwnerOverviewScreen';
import OwnerPendingScreen from './screens/OwnerPendingScreen';
import OwnerSettingsScreen from './screens/OwnerSettingsScreen';
import OwnerListingDetailScreen from './screens/OwnerListingDetailScreen';
import OwnerAvailabilityScreen from './screens/OwnerAvailabilityScreen';
import OwnerPricingScreen from './screens/OwnerPricingScreen';
import OwnerApplyScreen from './screens/OwnerApplyScreen';
import OwnerCommissionsScreen from './screens/OwnerCommissionsScreen';

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

      {/* כפתור בעלי חניה */}
      <View style={{ 
        position: 'absolute', 
        right: 16, 
        top: insets.top + 8, 
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <OwnerButton />
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

      // ✅ אנימציה חלקה עם גרירה מימין לשמאל (RTL)
      gestureEnabled: true,
      gestureDirection: 'horizontal-inverted', // הפוך לRTL
      // אנימציה חלקה מצד ימין (RTL)
      cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      headerStyleInterpolator: HeaderStyleInterpolators.forFade,
      transitionSpec: {
        open: TransitionSpecs.FadeInFromBottomAndroidSpec,
        close: TransitionSpecs.FadeOutToBottomAndroidSpec,
      },
      // מסך חלק ונקי
      detachPreviousScreen: true,
      cardOverlayEnabled: false,

      animationEnabled: true,
      headerBackTitleVisible: false,
    }),
    [theme]
  );

  // אפשרויות מיוחדות לעמודים ראשיים (סרגל תחתון) - מעבר מהאמצע
  const mainScreenOptions = useMemo(
    () => ({
      header: (props) => <ZpGradientHeader {...props} />,
      contentStyle: { backgroundColor: theme.colors.bg },

      // ✅ גרירה RTL אבל מעבר מהאמצע
      gestureEnabled: true,
      gestureDirection: 'horizontal-inverted', // הפוך לRTL
      // אנימציה מהאמצע לעמודים ראשיים
      cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
      headerStyleInterpolator: HeaderStyleInterpolators.forFade,
      transitionSpec: {
        open: TransitionSpecs.FadeInFromBottomAndroidSpec,
        close: TransitionSpecs.FadeOutToBottomAndroidSpec,
      },
      // מסך חלק ונקי
      detachPreviousScreen: true,
      cardOverlayEnabled: false,

      animationEnabled: true,
    }),
    [theme]
  );

  // אתחול Social Login בהפעלה
  React.useEffect(() => {
    initializeSocialLogin();
  }, []);

  // אתחול מנהל טוקנים בהפעלה
  React.useEffect(() => {
    initializeTokenManager().catch(console.warn);
  }, []);

  // טיפול נכון בAppState כדי למנוע מסך שחור
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('AppState changed to:', nextAppState);
      // כאן ניתן להוסיף לוגיקה נוספת אם נדרש
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <AppProvider>
              <NavigationProvider>
              <StatusBar style="light" backgroundColor="transparent" translucent hidden={false} />
              <NavigationContainer ref={navigationRef} theme={navTheme}>
                <NavigationWrapper>
                  <Stack.Navigator screenOptions={screenOptions} initialRouteName="Home">
                  {/* עמודים ראשיים - מעבר מהאמצע */}
                  <Stack.Screen name="Home" component={HomeScreen} options={{ ...mainScreenOptions, title: 'Zpoto' }} />
                  <Stack.Screen name="Bookings" component={BookingsScreen} options={{ ...mainScreenOptions, title: 'ההזמנות שלי' }} />
                  <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ ...mainScreenOptions, title: 'מועדפים' }} />
                  <Stack.Screen name="Profile" component={ProfileScreen} options={{ ...mainScreenOptions, title: 'הפרופיל שלי' }} />
                  
                  {/* עמודים משניים - מעבר מהצד */}
                  <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'התחברות' }} />
                  <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'הרשמה' }} />
                  <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: 'תוצאות חיפוש' }} />
                  <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'הזמנה' }} />
                  <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'תשלום' }} />
                  <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'פרטי הזמנה' }} />
                  <Stack.Screen name="AdvancedSearch" component={AdvancedSearchScreen} options={{ title: 'חניה עתידית' }} />

                  {/* Owner Screens */}
                  <Stack.Screen name="OwnerIntro" component={OwnerIntroScreen} options={{ title: 'בעלי חניה' }} />
                  <Stack.Screen name="OwnerApply" component={OwnerApplyScreen} options={{ title: 'הגשת בקשה' }} />
                  <Stack.Screen name="OwnerOverview" component={OwnerOverviewScreen} options={{ title: 'סקירה כללית' }} />
                  <Stack.Screen name="OwnerPending" component={OwnerPendingScreen} options={{ title: 'חניות עתידיות' }}/>
                  <Stack.Screen name="OwnerSettings" component={OwnerSettingsScreen} options={{ title: 'הגדרות' }} />
                  <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} options={{ title: 'ניהול החניות' }} />
                  <Stack.Screen name="OwnerListingForm" component={OwnerListingFormScreen} options={{ title: 'טופס חניה' }} />
                  <Stack.Screen name="OwnerListingDetail" component={OwnerListingDetailScreen} options={{ title: 'דוח חניה' }} />
                  <Stack.Screen name="OwnerAvailability" component={OwnerAvailabilityScreen} options={{ title: 'זמינות חניה' }} />
                  <Stack.Screen name="OwnerPricing" component={OwnerPricingScreen} options={{ title: 'עריכת מחירון' }} />
                  <Stack.Screen name="OwnerCommissions" component={OwnerCommissionsScreen} options={{ title: 'הכנסות והעמלות' }} />
                  <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'התראות' }} />
                  <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'הגדרות התראות' }} />
                </Stack.Navigator>
                </NavigationWrapper>
              </NavigationContainer>
              </NavigationProvider>
            </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
  );
}

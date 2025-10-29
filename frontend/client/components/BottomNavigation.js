// components/BottomNavigation.js
import React, { useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Hook לניהול פונקציות הכפתורים
import { useAuthGate } from './AuthGate';
import { 
  handleNearMeSearch, 
  handleProfileNavigation, 
  navigationActions
} from '../utils/navigationHelpers';

/**
 * קומפוננט סרגל ניווט תחתון
 * @param {string} currentScreen - שם המסך הנוכחי לקביעת הכפתור הפעיל
 */
const BottomNavigation = ({ currentScreen = 'Home' }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { attemptProfileAccess } = useAuthGate();

  const styles = makeStyles(theme, insets);

  // פונקציות הכפתורים - משתמשות בhelpers החדשים (מאופטמות עם useCallback)
  const handleNearMe = useCallback(() => handleNearMeSearch(navigation, 700, true, 2.5), [navigation]); // חיפוש מיידי ל-2.5 שעות
  const handleProfilePress = useCallback(() => handleProfileNavigation(navigation, attemptProfileAccess, 'bottom_navigation_profile'), [navigation, attemptProfileAccess]);
  const handleSearchPress = useCallback(() => navigationActions.goToHome(navigation), [navigation]);
  const handleBookingsPress = useCallback(() => navigationActions.goToBookings(navigation), [navigation]);
  const handleFavoritesPress = useCallback(() => navigationActions.goToFavorites(navigation), [navigation]);

  // בדיקה איזה כפתור פעיל - משתמש ב-currentScreen prop (מאופטם עם useCallback)
  const isActive = useCallback((screenName) => currentScreen === screenName, [currentScreen]);

  // הגדרת הכפתורים (מאופטם עם useMemo) - סדר חדש עם מעבר צבעים
  const buttons = useMemo(() => [
    {
      id: 'search',
      icon: 'search',
      label: 'חיפוש',
      onPress: handleSearchPress,
      color: '#A47BFF', // סגול (gradientEnd)
      isActive: isActive('Home'),
    },
    {
      id: 'favorites',
      icon: 'heart',
      label: 'מועדפים',
      onPress: handleFavoritesPress,
      color: '#8B7AFF', // מעבר בין סגול לתכלת
      isActive: isActive('Favorites'),
    },
    {
      id: 'nearby',
      icon: 'navigate',
      label: 'סביבי',
      onPress: handleNearMe,
      color: theme.colors.primary,
      isActive: false, // כפתור סביבי לא נשאר פעיל
      isSpecial: true, // כפתור מיוחד באמצע
    },
    {
      id: 'bookings',
      icon: 'calendar-outline',
      label: 'הזמנות',
      onPress: handleBookingsPress,
      color: '#7BA6FF', // מעבר בין תכלת לסגול
      isActive: isActive('Bookings'),
    },
    {
      id: 'profile',
      icon: 'person-circle',
      label: 'פרופיל',
      onPress: handleProfilePress,
      color: '#6FD6FF', // תכלת (gradientStart)
      isActive: isActive('Profile'),
    },
  ], [handleProfilePress, handleBookingsPress, handleNearMe, handleFavoritesPress, handleSearchPress, isActive, theme.colors]);

  const renderButton = (button) => {
    const buttonStyle = [
      styles.button,
      button.isSpecial && styles.specialButton,
      button.isActive && styles.activeButton,
    ];

    const iconColor = button.isActive 
      ? button.color // צבע המותג כשפעיל
      : button.isSpecial 
        ? '#FFFFFF' // לבן לכפתור סביבי
        : '#9CA3AF'; // אפור כשלא פעיל

    const textColor = button.isActive 
      ? button.color // צבע המותג כשפעיל
      : button.isSpecial 
        ? '#FFFFFF' // לבן לכפתור סביבי
        : '#9CA3AF'; // אפור כשלא פעיל

    const textStyle = [
      styles.buttonText,
      button.isSpecial && styles.specialButtonText,
      button.isActive && styles.activeButtonText,
      { color: textColor }, // צבע דינמי
    ];

    return (
      <TouchableOpacity
        key={button.id}
        style={buttonStyle}
        onPress={button.onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={button.label}
      >
        <View style={[
          styles.buttonInner,
          button.isSpecial && styles.specialButtonInner,
          button.isActive && styles.activeButtonInner,
        ]}>
          {button.isSpecial && (
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <Ionicons
            name={button.icon}
            size={button.isSpecial ? 26 : 22}
            color={iconColor}
            style={styles.buttonIcon}
          />
          <Text style={textStyle} numberOfLines={1}>
            {button.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {buttons.map(renderButton)}
      </View>
    </View>
  );
};

const makeStyles = (theme, insets) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Math.max(insets.bottom, 2),
    paddingTop: 2,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    // הוספת גובה קבוע לחישוב padding - מוקטן עוד יותר
    minHeight: 50 + Math.max(insets.bottom, 6),
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  specialButton: {
    // כפתור סביבי מיוחד - קצת יותר גדול
    transform: [{ scale: 1.1 }],
    marginHorizontal: 8,
  },
  activeButton: {
    backgroundColor: 'transparent', // רקע שקוף במקום צבעוני
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34, // גובה מינימלי מופחת עוד יותר
  },
  specialButtonInner: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    overflow: 'hidden', // חשוב לגרדיאנט
    minWidth: 60,
  },
  activeButtonInner: {
    // כבר יש רקע מהכפתור הפעיל
  },
  buttonIcon: {
    marginBottom: 2,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  specialButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeButtonText: {
    color: theme.colors.text, // צבע טקסט רגיל במקום לבן
    fontWeight: '700',
  },
});

export default React.memo(BottomNavigation);

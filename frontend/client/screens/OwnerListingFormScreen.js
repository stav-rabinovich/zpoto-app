// [MOBILE] screens/OwnerListingFormScreen.js - טופס פשוט לבקשת אישור
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Alert,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shopify/restyle';
import ZpButton from '../components/ui/ZpButton';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function OwnerListingFormScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { isAuthenticated, user, token } = useAuth();
  
  // זיהוי אם זו בקשה ראשונית או הוספת חניה
  const isInitialRequest = route?.params?.isInitialRequest || false;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');

  // טעינת פרטי המשתמש מהפרופיל
  useEffect(() => {
    (async () => {
      try {
        // טעינה מהשרת
        if (token) {
          const response = await api.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userData = response.data;
          
          if (userData.name) setFullName(userData.name);
          if (userData.email) setEmail(userData.email);
          if (userData.phone) setPhone(userData.phone);
        }
        
        // גיבוי מ-AsyncStorage
        const profileRaw = await AsyncStorage.getItem('profile');
        if (profileRaw) {
          const profile = JSON.parse(profileRaw);
          if (!fullName && profile.name) setFullName(profile.name);
          if (!email && profile.email) setEmail(profile.email);
          if (!phone && profile.phone) setPhone(profile.phone);
        }
      } catch (error) {
        console.log('Error loading profile:', error);
      }
    })();
  }, [token]);

  // --- שליחת בקשה ---
  async function submitRequest() {
    try {
      if (!isAuthenticated) {
        Alert.alert('נדרשת התחברות', 'יש להתחבר כדי להגיש בקשה', [
          { text: 'ביטול', style: 'cancel' },
          { text: 'התחבר', onPress: () => navigation.navigate('Login') }
        ]);
        return;
      }

      // בדיקות
      if (!fullName.trim()) return Alert.alert('חסר מידע', 'שם מלא חובה');
      if (!phone.trim()) return Alert.alert('חסר מידע', 'טלפון חובה');
      if (!email.trim()) return Alert.alert('חסר מידע', 'אימייל חובה');
      if (!fullAddress.trim()) return Alert.alert('חסר מידע', 'כתובת חובה');
      if (!city.trim()) return Alert.alert('חסר מידע', 'עיר חובה');

      // הכנת נתוני אונבורדינג בסיסיים - רק מה שהלקוח מילא
      const onboardingData = {
        fullName,
        phone,
        email,
        fullAddress,
        city,
      };

      // שליחה לשרת
      console.log('🚀 Sending listing request:', {
        fullAddress,
        city,
        address: `${fullAddress}, ${city}`,
        phone,
        lat: 32.0853,
        lng: 34.7818,
        onboarding: JSON.stringify(onboardingData),
      });

      const response = await api.post('/api/owner/listing-requests', {
        title: `חניה ב${city}`,
        fullAddress,
        city,
        address: `${fullAddress}, ${city}`,
        phone,
        lat: 32.0853, // ברירת מחדל - תל אביב
        lng: 34.7818,
        priceHr: 0, // ברירת מחדל
        onboarding: JSON.stringify(onboardingData),
      });

      console.log('✅ Server response:', response.data);

      if (response.data) {
        Alert.alert('הבקשה נשלחה', 'בקשתך נקלטה וממתינה לאישור מנהל.', [
          { text: 'אישור', onPress: () => navigation.navigate('OwnerPending') }
        ]);
      }
    } catch (e) {
      console.error('Submit error:', e);
      console.error('Error response:', e.response?.data);
      console.error('Error status:', e.response?.status);
      
      let errorMsg = 'לא הצלחנו לשלוח את הבקשה. נסה שוב.';
      
      if (e.response?.status === 401) {
        errorMsg = 'נדרשת התחברות מחדש';
        Alert.alert('שגיאת אימות', errorMsg, [
          { text: 'ביטול', style: 'cancel' },
          { text: 'התחבר', onPress: () => navigation.navigate('Login') }
        ]);
        return;
      } else if (e.response?.status === 404) {
        errorMsg = 'המשתמש לא נמצא במערכת';
      } else if (e.response?.status === 400) {
        errorMsg = e.response?.data?.error || 'נתונים לא תקינים';
      } else if (e.response?.status >= 500) {
        errorMsg = 'שגיאה בשרת. נסה שוב מאוחר יותר.';
      } else if (e.message?.includes('Network') || e.code === 'ECONNABORTED') {
        errorMsg = 'בעיה בחיבור לשרת. בדוק את החיבור לאינטרנט.';
      } else {
        errorMsg = e.response?.data?.error || e.message || errorMsg;
      }
      
      Alert.alert('שגיאה', errorMsg);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>
        {isInitialRequest ? 'הגשת בקשה להיות בעל חניה' : 'הוספת חניה חדשה'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>שם מלא *</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="שם פרטי ושם משפחה"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
        />

        <Text style={[styles.label, { marginTop: theme.spacing.md }]}>טלפון *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="050-1234567"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { marginTop: theme.spacing.md }]}>אימייל *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="example@email.com"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <Text style={styles.label}>כתובת מלאה *</Text>
        <TextInput
          style={styles.input}
          value={fullAddress}
          onChangeText={setFullAddress}
          placeholder="לדוגמה: רחוב הרצל 12"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
        />

        <Text style={[styles.label, { marginTop: theme.spacing.md }]}>עיר *</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="לדוגמה: תל אביב"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
        />

        {isInitialRequest && (
          <Text style={[styles.hint, { marginTop: theme.spacing.md }]}>
            הפרטים שמילאת יתמלאו אוטומטית בטופס האונבורדינג. המנהל ישלים את הפרטים הנוספים (פרטי בנק, סוג חניה, מסמכים וכו').
          </Text>
        )}
      </View>

      {/* כפתור שליחה */}
      <View style={styles.buttonRow}>
        <ZpButton 
          title={isInitialRequest ? "שליחת בקשה לאישור" : "הוסף חניה"} 
          onPress={submitRequest} 
          style={styles.ctaButton} 
        />
      </View>

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: { padding: spacing.lg, backgroundColor: colors.bg, alignItems: 'flex-start' },
    header: { fontSize: 20, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center', color: colors.text, alignSelf: 'stretch' },
    card: {
      backgroundColor: colors.surface, borderRadius: borderRadii.md, padding: spacing.lg, marginBottom: spacing.md,
      borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 }, elevation: 2, alignSelf: 'stretch', alignItems: 'flex-start',
    },
    label: { fontSize: 14, fontWeight: '700', marginTop: spacing.sm, marginBottom: 6, color: colors.text, textAlign: 'left', alignSelf: 'stretch' },
    input: {
      height: 52, borderRadius: borderRadii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      paddingHorizontal: 12, fontSize: 15, color: colors.text, textAlign: 'right', alignSelf: 'stretch',
    },
    hint: { fontSize: 12, color: colors.subtext, marginTop: 4, textAlign: 'left', alignSelf: 'stretch' },
    buttonRow: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
    ctaButton: { width: '96%', alignSelf: 'center' },
  });
}

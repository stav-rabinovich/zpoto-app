// [MOBILE] screens/OwnerListingFormScreen.js - טופס פשוט לבקשת אישור
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Alert,
  ScrollView
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import ZpButton from '../components/ui/ZpButton';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function OwnerListingFormScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { isAuthenticated, user, token, handleUserBlocked } = useAuth();
  
  // זיהוי אם זו בקשה ראשונית או הוספת חניה
  const isInitialRequest = route?.params?.isInitialRequest || false;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullAddress, setFullAddress] = useState(''); // כתובת מלאה כולל עיר

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
        
        // הסרנו גיבוי AsyncStorage - רק שרת
      } catch (error) {
        console.log('Error loading profile:', error);
        
        // אם המשתמש חסום - טיפול מרכזי
        if (error.response?.status === 403) {
          console.log('🚫 User blocked in listing form profile load - using central handler');
          await handleUserBlocked(navigation);
          return;
        }
      }
    })();
  }, [token, handleUserBlocked, navigation]);

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
      if (!fullAddress.trim()) return Alert.alert('חסר מידע', 'כתובת מלאה חובה (כולל עיר)');
      
      // וודא שיש פסיק בכתובת (כלומר יש עיר)
      if (!fullAddress.includes(',')) return Alert.alert('חסר מידע', 'יש להזין כתובת מלאה כולל עיר (למשל: רוטשילד 21, תל אביב)');

      // פיצול הכתובת לרחוב ועיר לתאימות לאחור
      const addressParts = fullAddress.split(',');
      const streetAddress = addressParts.slice(0, -1).join(',').trim();
      const city = addressParts[addressParts.length - 1].trim();

      // הכנת נתוני אונבורדינג בסיסיים - רק מה שהלקוח מילא
      const onboardingData = {
        fullName,
        phone,
        email,
        fullAddress: streetAddress,
        city,
      };

      // שליחה לשרת
      console.log('🚀 Sending listing request:', {
        fullAddress: streetAddress,
        city,
        address: fullAddress, // הכתובת המלאה כפי שהמשתמש הזין
        phone,
        lat: 32.0853,
        lng: 34.7818,
        onboarding: JSON.stringify(onboardingData),
      });

      const response = await api.post('/api/owner/listing-requests', {
        title: `חניה ב${city}`,
        fullAddress: streetAddress,
        city,
        address: fullAddress, // הכתובת המלאה כפי שהמשתמש הזין
        phone,
        lat: 32.0853, // ברירת מחדל - תל אביב
        lng: 34.7818,
        pricing: JSON.stringify({ hour1: 10, hour2: 10, hour3: 10 }), // מחירון ברירת מחדל
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
      
      // בדיקה אם המשתמש חסום
      if (e.response?.status === 403) {
        console.log('🚫 User blocked during submit - using central handler');
        await handleUserBlocked(navigation);
        return;
      }
      
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
        
        <Text style={styles.label}>כתובת החניה המלאה *</Text>
        <TextInput
          style={styles.input}
          value={fullAddress}
          onChangeText={setFullAddress}
          placeholder="רחוב ומספר בית, עיר - לדוגמה: רוטשילד 21, תל אביב"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
          multiline={true}
          numberOfLines={2}
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

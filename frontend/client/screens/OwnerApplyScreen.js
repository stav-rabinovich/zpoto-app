// screens/OwnerApplyScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@shopify/restyle';
import api from '../utils/api';
import ZpButton from '../components/ui/ZpButton';
import { useAuth } from '../contexts/AuthContext';

function emailValid(email) {
  if (!email) return false;
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}

export default function OwnerApplyScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { user, isAuthenticated } = useAuth();

  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-fill פרטים עבור משתמשים מחוברים
  useEffect(() => {
    const loadUserData = async () => {
      if (isAuthenticated && user) {
        console.log('📋 Auto-filling form for authenticated user:', user.email);
        
        // מילוי אוטומטי של פרטים קיימים
        setName(user.name || '');
        setEmail(user.email || '');
        
        // ניסיון לטעון פרטים נוספים מהפרופיל
        try {
          const profileResponse = await api.get('/api/profile');
          if (profileResponse.data.success && profileResponse.data.data) {
            const profile = profileResponse.data.data;
            setPhone(profile.phone || '');
            // לא ממלאים כתובת ועיר אוטומטית כי זה ספציפי לחניה
          }
        } catch (error) {
          console.log('Could not load profile data for auto-fill:', error);
        }
      }
      setLoading(false);
    };
    
    loadUserData();
  }, [isAuthenticated, user]);

  const submit = useCallback(async () => {
    if (submitting) return;
    
    // אין צורך בהתחברות - בעלי חניות ממלאים טופס ללא התחברות

    if (!name.trim())  { Alert.alert('שגיאה', 'נא להזין שם מלא.'); return; }
    if (!emailValid(email)) { Alert.alert('שגיאה', 'אימייל לא תקין.'); return; }
    if (!phone.trim()) { Alert.alert('שגיאה', 'נא להזין טלפון.'); return; }
    if (!address.trim()) { Alert.alert('שגיאה', 'נא להזין כתובת מלאה.'); return; }
    if (!city.trim()) { Alert.alert('שגיאה', 'נא להזין עיר.'); return; }

    try {
      setSubmitting(true);

      // בדיקה ראשונה: האם כבר יש בקשה עם פרטים אלה?
      console.log('🔍 Checking for existing requests...');
      const checkResponse = await api.post('/api/owner/check-existing', {
        email: email.trim(),
        phone: phone.trim()
      });

      if (checkResponse.data.exists) {
        console.log('⚠️ Existing request found:', checkResponse.data);
        Alert.alert(
          'בקשה קיימת',
          checkResponse.data.message || 'כבר קיימת בקשה עם פרטים אלה',
          [{ text: 'הבנתי', onPress: () => navigation.replace('OwnerIntro') }]
        );
        return;
      }

      // אם אין בקשה קיימת - ממשיכים כרגיל
      console.log('✅ No existing request found, proceeding with new application');
      
      // הערה חשובה: המערכת תקשר את הבקשה למשתמש הקיים אם הוא מחובר
      const requestData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim()
      };
      
      if (isAuthenticated) {
        console.log('📝 Submitting owner request for authenticated user');
        // הבקשה תאוגד אוטומטית עם המשתמש הקיים
      }
      
      await api.post('/api/owner/apply', requestData);
      
      const successMessage = isAuthenticated 
        ? `הבקשה נשלחה בהצלחה! הנתונים שלך כמחפש חניה נשמרו.\n\nנעדכן אותך לאחר אישור הבקשה.`
        : 'הבקשה נשלחה בהצלחה! נעדכן אותך לאחר האישור.';
      
      Alert.alert('בקשה נשלחה', successMessage, [
        { text: 'אשר', onPress: () => navigation.replace('OwnerIntro') }
      ]);
    } catch (error) {
      console.error('Submit error:', error);
      if (error.response?.status === 400 && error.response?.data?.error === 'Missing email or phone') {
        Alert.alert('שגיאה', 'נא למלא אימייל וטלפון');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בשליחת הבקשה.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [name, email, phone, address, city, navigation, submitting, isAuthenticated]);

  if (loading) {
    return (
      <View style={[styles.wrap, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.label, { marginTop: 16, textAlign: 'center' }]}>טוען נתונים...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.select({ ios:'padding' })}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>בקשה להיות בעל/ת חניה</Text>

        <View style={styles.card}>
          <Text style={styles.label}>שם מלא</Text>
          <TextInput
            style={[styles.input, isAuthenticated && user?.name && { backgroundColor: theme.colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="לדוגמה: ישראל ישראלי"
            placeholderTextColor={theme.colors.subtext}
            editable={!(isAuthenticated && user?.name)} // לא ניתן לעריכה אם מילוי אוטומטי
          />

          <Text style={styles.label}>אימייל</Text>
          <TextInput
            style={[styles.input, isAuthenticated && user?.email && { backgroundColor: theme.colors.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.subtext}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!(isAuthenticated && user?.email)} // לא ניתן לעריכה אם מילוי אוטומטי
          />

          <Text style={styles.label}>טלפון <Text style={{ color: theme.colors.error }}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="050-0000000 (חובה)"
            placeholderTextColor={theme.colors.subtext}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>כתובת מלאה</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="רחוב, מספר בית"
            placeholderTextColor={theme.colors.subtext}
          />

          <Text style={styles.label}>עיר</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="תל אביב, חיפה, ירושלים..."
            placeholderTextColor={theme.colors.subtext}
          />
        </View>

        <ZpButton
          title={submitting ? 'שולח…' : 'שלח בקשה'}
          onPress={submit}
          disabled={submitting}
          leftIcon={submitting ? <ActivityIndicator color="#fff" /> : null}
        />

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    wrap:{ padding: spacing.lg, backgroundColor: colors.bg },
    header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginBottom: spacing.md, color: colors.text },

    card:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth:1, borderColor: colors.border,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },

    label:{ fontSize:13, color: colors.subtext, marginTop:6, marginBottom:6 },

    input:{
      height:48,
      borderRadius: borderRadii.sm,
      borderWidth:1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal:12,
      fontSize:15,
      color: colors.text,
      marginBottom:8,
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
  });
}

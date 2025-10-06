// screens/OwnerApplyScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shopify/restyle';
import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import api from '../utils/api';
import ZpButton from '../components/ui/ZpButton';

const PROFILE_KEY = 'profile';
const OWNER_APP_KEY = 'owner_application';

function emailValid(email) {
  if (!email) return false;
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}

export default function OwnerApplyScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { isAuthenticated, user } = useAuthContext();

  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.name) setName(p.name);
        if (p.email) setEmail(p.email);
      }
    })();
  }, []);

  const submit = useCallback(async () => {
    if (submitting) return;
    
    // אין צורך בהתחברות - בעלי חניות ממלאים טופס ללא התחברות

    if (!name.trim())  { Alert.alert('שגיאה', 'נא להזין שם מלא.'); return; }
    if (!emailValid(email)) { Alert.alert('שגיאה', 'אימייל לא תקין.'); return; }
    if (!phone.trim()) { Alert.alert('שגיאה', 'נא להזין טלפון.'); return; }
    if (!address.trim()) { Alert.alert('שגיאה', 'נא להזין כתובת חניה.'); return; }

    try {
      setSubmitting(true);

      // שמירה מקומית (לתצוגה מיידית)
      const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);
      const prev = profileRaw ? JSON.parse(profileRaw) : {};

      const profile = {
        ...prev,
        name: name.trim(),
        email: email.trim(),
        owner_status: 'pending',
        roles: Array.isArray(prev.roles)
          ? Array.from(new Set([...prev.roles, 'owner']))
          : ['seeker', 'owner'],
      };

      const application = {
        id: `oa-${Date.now()}`,
        name: profile.name,
        email: profile.email,
        phone: phone.trim(),
        address: address.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      await Promise.all([
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)),
        AsyncStorage.setItem(OWNER_APP_KEY, JSON.stringify(application)),
      ]);

      // שליחה לשרת - בקשה פשוטה עם פרטי הבעלים
      await api.post('/api/owner/listing-requests', {
        title: `חניה של ${name.trim()}`,
        address: address.trim(),
        lat: 32.0853, // ברירת מחדל - תל אביב (ניתן לשנות בעתיד)
        lng: 34.7818,
        priceHr: 15, // ברירת מחדל
        description: `בקשה מ-${name.trim()}`,
        phone: phone.trim()
      });

      Alert.alert('הבקשה נשלחה', 'נעדכן אותך לאחר האישור.', [
        { text: 'אשר', onPress: () => navigation.replace('OwnerIntro') }
      ]);
    } catch (e) {
      console.error('owner apply error', e);
      const errorMsg = e.response?.data?.error || 'לא ניתן לשלוח כעת, נסה שוב.';
      Alert.alert('שגיאה', errorMsg);
    } finally {
      setSubmitting(false);
    }
  }, [name, email, phone, address, navigation, submitting, isAuthenticated]);

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.select({ ios:'padding' })}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>בקשה להיות בעל/ת חניה</Text>

        <View style={styles.card}>
          <Text style={styles.label}>שם מלא</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="לדוגמה: ישראל ישראלי"
            placeholderTextColor={theme.colors.subtext}
          />

          <Text style={styles.label}>אימייל</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.subtext}
            keyboardType="email-address"
            autoCapitalize="none"
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

          <Text style={styles.label}>כתובת חניה (ראשית)</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="רחוב, מספר, עיר"
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

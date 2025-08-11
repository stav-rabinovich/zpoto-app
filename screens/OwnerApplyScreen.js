// screens/OwnerApplyScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'profile';
const OWNER_APP_KEY = 'owner_application';

function emailValid(email) {
  if (!email) return false;
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}

export default function OwnerApplyScreen({ navigation }) {
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
    if (!name.trim())  { Alert.alert('שגיאה', 'נא להזין שם מלא.'); return; }
    if (!emailValid(email)) { Alert.alert('שגיאה', 'אימייל לא תקין.'); return; }
    if (!phone.trim()) { Alert.alert('שגיאה', 'נא להזין טלפון.'); return; }
    if (!address.trim()) { Alert.alert('שגיאה', 'נא להזין כתובת חניה.'); return; }

    try {
      setSubmitting(true);

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

      Alert.alert('הבקשה נשלחה', 'נעדכן אותך לאחר האישור.', [
        { text: 'אשר', onPress: () => navigation.replace('OwnerIntro') }
      ]);
    } catch (e) {
      console.warn('owner apply error', e);
      Alert.alert('שגיאה', 'לא ניתן לשלוח כעת, נסה שוב.');
    } finally {
      setSubmitting(false);
    }
  }, [name, email, phone, address, navigation, submitting]);

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.select({ ios:'padding' })}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.header}>בקשה להיות בעל/ת חניה</Text>

        <View style={styles.card}>
          <Text style={styles.label}>שם מלא</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="לדוגמה: ישראל ישראלי" />

          <Text style={styles.label}>אימייל</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>טלפון</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="050-0000000" keyboardType="phone-pad" />

          <Text style={styles.label}>כתובת חניה (ראשית)</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="רחוב, מספר, עיר" />
        </View>

        <TouchableOpacity style={[styles.primary, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
          {submitting ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={[styles.primaryText, { marginStart: 8 }]}>שולח…</Text>
            </>
          ) : (
            <Text style={styles.primaryText}>שלח בקשה</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 14 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap:{ padding:14, backgroundColor:'#f6f9fc' },
  header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:12 },
  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:'#ecf1f7' },
  label:{ fontSize:13, color:'#555', marginTop:6, marginBottom:6 },
  input:{ height:48, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fff', paddingHorizontal:12, fontSize:15 },
  primary:{ backgroundColor:'#00C6FF', paddingVertical:14, borderRadius:12, alignItems:'center', flexDirection:'row', justifyContent:'center' },
  primaryText:{ color:'#fff', fontWeight:'800' },
});

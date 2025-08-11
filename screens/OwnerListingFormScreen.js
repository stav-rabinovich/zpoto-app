// screens/OwnerListingFormScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import * as listingsRepo from '../data/listingsRepo';

export default function OwnerListingFormScreen({ route, navigation }) {
  const listingId = route?.params?.id || `l_${Date.now()}`;

  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [pricePerHour, setPricePerHour] = useState('12');
  const [approvalManual, setApprovalManual] = useState(false); // מתג אישור ידני

  useEffect(() => {
    (async () => {
      if (!route?.params?.id) return;
      const existing = await listingsRepo.getById(route.params.id);
      if (existing) {
        setTitle(existing.title || '');
        setAddress(existing.address || '');
        setPricePerHour(String(existing.pricePerHour ?? 12));
        setApprovalManual((existing.approvalMode ?? 'auto') === 'manual');
      }
    })();
  }, [route?.params?.id]);

  async function save() {
    try {
      const listing = {
        id: listingId,
        title,
        address,
        pricePerHour: Number(pricePerHour || 12),
        approvalMode: approvalManual ? 'manual' : 'auto',
      };
      await listingsRepo.upsert(listing);
      Alert.alert('נשמר', 'החניה נשמרה בהצלחה');
      navigation?.goBack?.();
    } catch (e) {
      Alert.alert('שגיאה', 'לא הצלחנו לשמור. נסה שוב.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>פרטי חניה</Text>

      <Text style={styles.label}>שם/כותרת</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="לדוגמה: חניה ברחוב הרצל 12" />

      <Text style={styles.label}>כתובת</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="לדוגמה: הרצל 12, תל אביב" />

      <Text style={styles.label}>מחיר לשעה (₪)</Text>
      <TextInput
        style={styles.input}
        value={pricePerHour}
        onChangeText={(t) => setPricePerHour(String(t.replace(/[^\d]/g, '')))}
        keyboardType="numeric"
        placeholder="12"
      />

      <View style={styles.row}>
        <Text style={styles.labelInline}>אישור ידני?</Text>
        <Switch value={approvalManual} onValueChange={setApprovalManual} />
      </View>
      <Text style={styles.hint}>
        כשהאפשרות פעילה, כל הזמנה חדשה תופיע ב“בקשות בהמתנה” ותצריך אישור שלך. כשהיא כבויה — הזמנות יאושרו אוטומטית.
      </Text>

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>שמירת החניה</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  labelInline: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  saveBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, marginTop: 18, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});

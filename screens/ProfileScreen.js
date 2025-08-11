// screens/ProfileScreen.js
// פרופיל משתמש (דמו):
// - פרטים אישיים, תשלום ברירת מחדל
// - רכבים: הוספה/מחיקה/ברירת מחדל + מניעת כפילות לוחית

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const PROFILE_KEY = 'profile';
const VEHICLES_KEY = 'vehicles';

const PAYMENT_OPTIONS = [
  { key: 'card', label: 'כרטיס אשראי', icon: 'card' },
  { key: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
  { key: 'applepay', label: 'Apple Pay', icon: 'logo-apple' },
];

function emailValid(email) {
  if (!email) return true;
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}
const normalizePlate = (s='') => s.replace(/\D/g,''); // שומר רק ספרות

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);

  // פרופיל בסיסי
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [payment, setPayment] = useState('card');

  // רכבים
  const [vehicles, setVehicles] = useState([]); // [{id, plate, desc, isDefault}]
  const [newPlate, setNewPlate] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // טען
  const load = useCallback(async () => {
    try {
      const [rawProfile, rawVehicles] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(VEHICLES_KEY),
      ]);
      if (rawProfile) {
        const p = JSON.parse(rawProfile);
        setName(p.name || '');
        setEmail(p.email || '');
        setPayment(p.payment || 'card');
      }
      setVehicles(rawVehicles ? JSON.parse(rawVehicles) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // שמירה
  const saveProfile = useCallback(async () => {
    if (!emailValid(email)) {
      Alert.alert('שגיאה', 'כתובת אימייל לא תקינה.');
      return;
    }
    const profile = { name: name.trim(), email: email.trim(), payment };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    Alert.alert('נשמר', 'הפרופיל עודכן בהצלחה.');
  }, [name, email, payment]);

  const addVehicle = useCallback(async () => {
    const plate = newPlate.trim();
    const desc = newDesc.trim();
    if (!plate) {
      Alert.alert('שגיאה', 'נא להזין מספר רכב.');
      return;
    }
    const norm = normalizePlate(plate);
    const exists = vehicles.some(v => normalizePlate(v.plate) === norm);
    if (exists) {
      Alert.alert('שגיאה', 'מספר רכב כבר קיים.');
      return;
    }
    const v = { id: `v-${Date.now()}`, plate, desc, isDefault: vehicles.length === 0 };
    const next = [v, ...vehicles];
    setVehicles(next);
    await AsyncStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
    setNewPlate('');
    setNewDesc('');
  }, [newPlate, newDesc, vehicles]);

  const removeVehicle = useCallback(async (id) => {
    let next = vehicles.filter(v => v.id !== id);
    // אם נמחק ברירת המחדל, נקבע את הראשון (אם יש) לברירת מחדל
    if (!next.find(v => v.isDefault) && next.length > 0) {
      next = next.map((v, i) => i === 0 ? { ...v, isDefault: true } : { ...v, isDefault: false });
    }
    setVehicles(next);
    await AsyncStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
  }, [vehicles]);

  const setDefaultVehicle = useCallback(async (id) => {
    const next = vehicles.map(v => ({ ...v, isDefault: v.id === id }));
    setVehicles(next);
    await AsyncStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
  }, [vehicles]);

  const defaultVehicle = useMemo(() => vehicles.find(v => v.isDefault) || null, [vehicles]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color:'#444' }}>טוען פרופיל…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>הפרופיל שלי</Text>

      {/* פרטים אישיים */}
      <View style={styles.card}>
        <Text style={styles.section}>פרטים אישיים</Text>
        <Text style={styles.label}>שם מלא</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: ישראל ישראלי"
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>אימייל (לחשבוניות)</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { marginTop:6 }]}>אמצעי תשלום ברירת מחדל</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_OPTIONS.map(opt => {
            const active = payment === opt.key;
            return (
              <TouchableOpacity key={opt.key} style={[styles.payChip, active && styles.payChipActive]} onPress={() => setPayment(opt.key)}>
                <Ionicons name={opt.icon} size={16} color={active ? '#fff' : '#0b6aa8'} style={{ marginEnd:6 }} />
                <Text style={[styles.payChipText, active && styles.payChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          <Text style={styles.saveBtnText}>שמור פרופיל</Text>
        </TouchableOpacity>
      </View>

      {/* רכבים */}
      <View style={styles.card}>
        <Text style={styles.section}>הרכבים שלי</Text>

        {vehicles.length === 0 ? (
          <Text style={styles.hint}>לא הוספת עדיין רכבים. הוסף רכב למטה.</Text>
        ) : (
          vehicles.map(v => (
            <View key={v.id} style={styles.vehicleRow}>
              <View style={{ flex:1 }}>
                <Text style={styles.vehicleTitle}>{v.plate}</Text>
                {!!v.desc && <Text style={styles.vehicleDesc}>{v.desc}</Text>}
                {v.isDefault && <Text style={styles.defaultBadge}>ברירת מחדל</Text>}
              </View>
              {!v.isDefault && (
                <TouchableOpacity style={styles.smallBtn} onPress={() => setDefaultVehicle(v.id)}>
                  <Text style={styles.smallBtnText}>קבע כברירת מחדל</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.smallBtn, { borderColor:'#d33' }]} onPress={() => removeVehicle(v.id)}>
                <Text style={[styles.smallBtnText, { color:'#d33' }]}>מחק</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* הוספת רכב */}
        <View style={styles.addBox}>
          <Text style={styles.label}>מספר רכב</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: 12-345-67"
            value={newPlate}
            onChangeText={setNewPlate}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.label}>תיאור (לא חובה)</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: מאזדה 3 לבנה"
            value={newDesc}
            onChangeText={setNewDesc}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addVehicle}>
            <Ionicons name="add" size={18} color="#fff" style={{ marginEnd:8 }} />
            <Text style={styles.addBtnText}>הוסף רכב</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* סיכום קטן */}
      {!!defaultVehicle && (
        <View style={styles.summary}>
          <Ionicons name="car-sport" size={18} color="#0b6aa8" style={{ marginEnd:6 }} />
          <Text style={styles.summaryText}>
            רכב ברירת מחדל: {defaultVehicle.plate}{defaultVehicle.desc ? ` – ${defaultVehicle.desc}` : ''}
          </Text>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{ padding:16, backgroundColor:'#f6f9fc' },
  center:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' },

  header:{ fontSize:22, fontWeight:'800', textAlign:'center', marginBottom:12 },

  card:{
    backgroundColor:'#fff',
    borderRadius:14,
    padding:14,
    marginBottom:12,
    shadowColor:'#000',
    shadowOpacity:0.06,
    shadowRadius:8,
    shadowOffset:{ width:0, height:3 },
    elevation:2,
  },

  section:{ fontSize:16, fontWeight:'700', marginBottom:10 },
  label:{ fontSize:13, color:'#555', marginBottom:6, marginTop:6 },
  input:{ height:48, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fff', paddingHorizontal:12, fontSize:15, marginBottom:8 },

  paymentRow:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  payChip:{
    flexDirection:'row', alignItems:'center',
    paddingVertical:8, paddingHorizontal:12,
    borderRadius:999, borderWidth:1, borderColor:'#cfe3ff', backgroundColor:'#f7fbff', marginRight:8, marginBottom:8
  },
  payChipActive:{ backgroundColor:'#0b6aa8', borderColor:'#0b6aa8' },
  payChipText:{ color:'#0b6aa8', fontWeight:'700' },
  payChipTextActive:{ color:'#fff' },

  saveBtn:{ backgroundColor:'#00C6FF', paddingVertical:12, borderRadius:10, alignItems:'center', marginTop:8 },
  saveBtnText:{ color:'#fff', fontWeight:'800' },

  hint:{ fontSize:12, color:'#6c7a89' },

  vehicleRow:{ flexDirection:'row', alignItems:'center', gap:8, paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#f1f4f8' },
  vehicleTitle:{ fontSize:15, fontWeight:'700' },
  vehicleDesc:{ fontSize:13, color:'#555' },

  defaultBadge:{ marginTop:4, alignSelf:'flex-start', backgroundColor:'#e6f3ff', borderColor:'#cfe3ff', borderWidth:1, borderRadius:8, paddingHorizontal:8, paddingVertical:4, color:'#0b6aa8', fontWeight:'700', fontSize:12 },

  smallBtn:{ paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:'#00C6FF', backgroundColor:'#fff' },
  smallBtnText:{ color:'#00C6FF', fontWeight:'700' },

  addBox:{ marginTop:8, backgroundColor:'#fafcff', borderRadius:12, borderWidth:1, borderColor:'#e7eef8', padding:10 },
  addBtn:{ marginTop:6, backgroundColor:'#00C6FF', paddingVertical:12, borderRadius:10, alignItems:'center', flexDirection:'row', justifyContent:'center' },
  addBtnText:{ color:'#fff', fontWeight:'800' },

  summary:{ marginTop:8, flexDirection:'row', alignItems:'center', backgroundColor:'#ffffff', borderRadius:12, borderWidth:1, borderColor:'#e6f3ff', padding:10 },
  summaryText:{ color:'#0b6aa8', fontWeight:'700' },
});

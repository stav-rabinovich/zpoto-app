// screens/OwnerIntroScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const PROFILE_KEY = 'profile';

export default function OwnerIntroScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('none');
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      const p = raw ? JSON.parse(raw) : {};
      setStatus(p?.owner_status || 'none');
      setName(p?.name || '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const approveDev = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    const roles = Array.isArray(prev.roles)
      ? Array.from(new Set([...prev.roles, 'owner']))
      : ['seeker', 'owner'];

    const next = { ...prev, owner_status: 'approved', roles };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setStatus('approved');
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop:8 }}>טוען…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>השכרת חניה ב‑Zpoto</Text>
        {status !== 'approved' && (
          <TouchableOpacity onPress={approveDev} style={styles.devBtn} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Text style={styles.devBtnText}>אשר אותי (DEV)</Text>
          </TouchableOpacity>
        )}
      </View>

      {status === 'approved' && (
        <View style={[styles.card, { borderColor:'#b9f5cf', backgroundColor:'#f7fffb' }]}>
          <Text style={styles.title}>ברוך/ה הבא/ה{ name ? `, ${name}` : '' }!</Text>
          <Text style={styles.line}>בחר/י לאן להיכנס:</Text>
          <View style={{ gap:10, marginTop:8 }}>
            <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('OwnerOverview')}>
              <Ionicons name="speedometer" size={18} color="#fff" style={{ marginEnd:6 }} />
              <Text style={styles.primaryText}>סקירה כללית</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('OwnerPending')}>
              <Ionicons name="timer" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
              <Text style={styles.secondaryText}>בקשות בהמתנה</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('OwnerDashboard')}>
              <Ionicons name="business" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
              <Text style={styles.secondaryText}>ניהול החניות</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {status === 'pending' && (
        <View style={[styles.card, { borderColor:'#ffe1a8', backgroundColor:'#fffaf1' }]}>
          <Text style={styles.title}>הבקשה בהמתנה</Text>
          <Text style={styles.line}>אנו בודקים את הפרטים שלך. נעדכן ברגע האישור.</Text>
          <TouchableOpacity style={styles.secondary} onPress={load}>
            <Ionicons name="refresh" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
            <Text style={styles.secondaryText}>בדוק סטטוס</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'none' && (
        <View style={styles.card}>
          <Text style={styles.title}>רוצים להתחיל להשכיר?</Text>
          <Text style={styles.line}>נמלא פרטים קצרים ונשלח בקשה לאישור.</Text>
          <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('OwnerApply')}>
            <Ionicons name="create" size={18} color="#fff" style={{ marginEnd:6 }} />
            <Text style={styles.primaryText}>הגש בקשה</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#f6f9fc', padding:14 },
  center:{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#fff' },

  headerRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  header:{ fontSize:22, fontWeight:'800', textAlign:'center' },

  devBtn:{ paddingVertical:6, paddingHorizontal:10, borderRadius:8, borderWidth:1, borderColor:'#888', backgroundColor:'#eee' },
  devBtnText:{ fontSize:11, color:'#333', fontWeight:'700' },

  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:'#ecf1f7' },
  title:{ fontSize:16, fontWeight:'800', marginBottom:6 },
  line:{ fontSize:14, color:'#333', marginVertical:2 },

  primary:{ marginTop:6, flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#00C6FF', paddingVertical:12, borderRadius:10 },
  primaryText:{ color:'#fff', fontWeight:'800' },

  secondary:{ marginTop:8, flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#eaf4ff', paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:'#cfe3ff' },
  secondaryText:{ color:'#0b6aa8', fontWeight:'800' },
});

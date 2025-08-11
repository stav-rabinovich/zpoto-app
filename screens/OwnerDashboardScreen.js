// screens/OwnerDashboardScreen.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export const LISTINGS_KEY = 'owner_listings';

export default function OwnerDashboardScreen({ navigation }) {
  const [listings, setListings] = useState([]);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(LISTINGS_KEY);
    const ls = raw ? JSON.parse(raw) : [];
    ls.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
    setListings(ls);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const toggleActive = async (id) => {
    const raw = await AsyncStorage.getItem(LISTINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex(x => x.id === id);
    if (i === -1) return;
    list[i] = { ...list[i], active: !list[i].active, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(list));
    setListings(list);
  };

  const removeListing = (id) => {
    Alert.alert('למחוק חניה?', undefined, [
      { text: 'בטל', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: async () => {
          const raw = await AsyncStorage.getItem(LISTINGS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const next = list.filter(x => x.id !== id);
          await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(next));
          setListings(next);
        }
      }
    ]);
  };

  const renderListing = ({ item }) => {
    const thumb = Array.isArray(item.images) && item.images[0]?.uri;
    return (
      <View style={[styles.card, item.active ? styles.cardActive : null]}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={styles.title}>{item.title || 'חניה ללא שם'}</Text>
          <View style={{ flexDirection:'row', gap:10 }}>
            <TouchableOpacity onPress={() => navigation.navigate('OwnerListingDetail', { id: item.id })}>
              <Ionicons name="bar-chart" size={18} color="#00C6FF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('OwnerListingForm', { id: item.id })}>
              <Ionicons name="create-outline" size={18} color="#0b6aa8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleActive(item.id)}>
              <Ionicons name={item.active ? 'toggle' : 'toggle-outline'} size={22} color={item.active ? '#0a7a3e' : '#999'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeListing(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#d33" />
            </TouchableOpacity>
          </View>
        </View>

        {!!thumb && <Image source={{ uri: thumb }} style={styles.thumb} />}
        {!!item.address && <Text style={styles.line}>כתובת: {item.address}</Text>}
        <Text style={styles.line}>מחיר לשעה: ₪{item.price || 0}</Text>
        {(item.latitude && item.longitude) && (
          <Text style={styles.line}>מיקום: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text>
        )}
        <Text style={[styles.badge, { backgroundColor: item.active ? '#e8fff2' : '#fff3f3', borderColor: item.active ? '#b9f5cf' : '#ffd1d1', color: item.active ? '#0a7a3e' : '#b33' }]}>
          {item.active ? 'פעיל' : 'כבוי'}
        </Text>
        {item.approvalMode === 'manual' && (
          <Text style={[styles.badge, { backgroundColor:'#fff7e6', borderColor:'#ffd79a', color:'#7a4d00', marginTop:6 }]}>
            אישור ידני מופעל
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>ניהול החניות</Text>

      <View style={{ flexDirection:'row', gap:10, marginBottom:10 }}>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('OwnerListingForm')}>
          <Ionicons name="add" size={18} color="#fff" style={{ marginEnd:6 }} />
          <Text style={styles.addBtnText}>הוסף חניה</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('OwnerOverview')}>
          <Text style={styles.secondaryBtnText}>סקירה כללית</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('OwnerPending')}>
          <Text style={styles.secondaryBtnText}>בקשות בהמתנה</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listings}
        keyExtractor={i => i.id}
        renderItem={renderListing}
        ListEmptyComponent={<Text style={{ color:'#666', textAlign:'center', marginTop:8 }}>אין עדיין חניות. לחץ "הוסף חניה".</Text>}
        contentContainerStyle={{ paddingBottom:24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#f6f9fc', padding:14 },
  header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:12 },

  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:'#ecf1f7' },
  cardActive:{ borderColor:'#b9f5cf', backgroundColor:'#f7fffb' },
  title:{ fontSize:16, fontWeight:'800', marginBottom:6 },
  line:{ fontSize:14, color:'#333', marginVertical:2 },

  addBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#00C6FF', paddingVertical:12, borderRadius:10, paddingHorizontal:14 },
  addBtnText:{ color:'#fff', fontWeight:'800' },

  secondaryBtn:{ flex:1, backgroundColor:'#fff', paddingVertical:12, borderRadius:10, borderWidth:1, borderColor:'#00C6FF', alignItems:'center' },
  secondaryBtnText:{ color:'#00C6FF', fontWeight:'800' },

  badge:{ marginTop:8, alignSelf:'flex-start', borderWidth:1, borderRadius:8, paddingHorizontal:8, paddingVertical:4, fontWeight:'700' },
  thumb:{ width:'100%', height:160, borderRadius:10, marginBottom:8 },
});

// screens/FavoritesScreen.js
// מציג מועדפים מה-AsyncStorage.
// - keys: 'favorites' (Array<string> של מזהי חניות), 'favoritesData' (Map id->spot)
// - פעולות: הזמן עכשיו, פתח במפה, וויז, הסר ממועדפים
// - רענון: Pull-to-Refresh + רענון ב-focus

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { openWaze } from '../utils/nav';

const IDS_KEY = 'favorites';
const DATA_KEY = 'favoritesData';

export default function FavoritesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ids, setIds] = useState([]);           // ['spot-1', ...]
  const [dataMap, setDataMap] = useState({});   // { 'spot-1': spotObj, ... }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rawIds, rawMap] = await Promise.all([
        AsyncStorage.getItem(IDS_KEY),
        AsyncStorage.getItem(DATA_KEY),
      ]);
      const idsArr = rawIds ? JSON.parse(rawIds) : [];
      let map = {};
      try { map = rawMap ? JSON.parse(rawMap) : {}; } catch {}
      setIds(idsArr);
      setDataMap(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const removeFavorite = useCallback(async (spotId) => {
    await Haptics.selectionAsync();
    const nextIds = ids.filter(id => id !== spotId);
    const nextMap = { ...dataMap };
    delete nextMap[spotId];
    await Promise.all([
      AsyncStorage.setItem(IDS_KEY, JSON.stringify(nextIds)),
      AsyncStorage.setItem(DATA_KEY, JSON.stringify(nextMap)),
    ]);
    setIds(nextIds);
    setDataMap(nextMap);
  }, [ids, dataMap]);

  const renderItem = ({ item: spotId }) => {
    const spot = dataMap[spotId];
    if (!spot) return null;

    const hasThumb = Array.isArray(spot.images) && spot.images[0]?.uri;
    const hasCoords = typeof spot.latitude === 'number' && typeof spot.longitude === 'number';

    return (
      <View style={styles.card}>
        {/* כותרת + הסרה */}
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={styles.title}>{spot.address || spot.title || 'חניה'}</Text>
          <TouchableOpacity onPress={() => removeFavorite(spotId)}>
            <Ionicons name="heart-dislike-outline" size={20} color="#d33" />
          </TouchableOpacity>
        </View>

        {/* תמונה אם קיימת */}
        {!!hasThumb && (
          <Image source={{ uri: spot.images[0].uri }} style={styles.thumb} />
        )}

        {!!spot.price && <Text style={styles.line}>מחיר לשעה: ₪{spot.price}</Text>}
        {!!spot.distanceKm && <Text style={styles.line}>מרחק: {Number(spot.distanceKm).toFixed(2)} ק״מ</Text>}

        <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Booking', { spot: { ...spot, title: spot.address || spot.title } })}
            activeOpacity={0.9}
          >
            <Ionicons name="calendar" size={16} color="#fff" style={{ marginEnd:6 }} />
            <Text style={styles.primaryBtnText}>הזמן עכשיו</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('SearchResults', {
              coords: { latitude: spot.latitude, longitude: spot.longitude },
              query: spot.address || '',
            })}
            activeOpacity={0.9}
          >
            <Ionicons name="map" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
            <Text style={styles.secondaryBtnText}>פתח במפה</Text>
          </TouchableOpacity>

          {hasCoords && (
            <TouchableOpacity
              style={styles.wazeBtn}
              onPress={() => openWaze(spot.latitude, spot.longitude, spot.address || spot.title || 'Zpoto')}
              activeOpacity={0.9}
            >
              <Ionicons name="navigate" size={16} color="#0a7a3e" style={{ marginEnd:6 }} />
              <Text style={styles.wazeBtnText}>וויז</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const empty = (
    <View style={styles.empty}>
      <Ionicons name="heart-outline" size={28} color="#9ab7d6" />
      <Text style={{ color:'#6992b8', marginTop:6 }}>אין מועדפים עדיין.</Text>
      <Text style={{ color:'#6992b8', marginTop:2, fontSize:12 }}>חפש חניה והוסף בלב ❤️</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        data={ids}
        keyExtractor={(id) => id}
        renderItem={renderItem}
        ListEmptyComponent={!loading && empty}
        contentContainerStyle={{ padding:14, paddingBottom:24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C6FF" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor:'#f6f9fc' },

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
    borderWidth:1,
    borderColor:'#ecf1f7',
  },

  title:{ fontSize:16, fontWeight:'800', marginBottom:4 },
  line:{ fontSize:14, color:'#333', marginTop:2 },

  primaryBtn:{ flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#00C6FF', alignItems:'center', flexDirection:'row', justifyContent:'center' },
  primaryBtnText:{ color:'#fff', fontWeight:'800' },

  secondaryBtn:{ flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#eaf4ff', alignItems:'center', borderWidth:1, borderColor:'#cfe3ff', flexDirection:'row', justifyContent:'center' },
  secondaryBtnText:{ color:'#0b6aa8', fontWeight:'800' },

  // וויז
  wazeBtn:{ flex:1, paddingVertical:12, borderRadius:10, backgroundColor:'#e8fff2', alignItems:'center', borderWidth:1, borderColor:'#b9f5cf', flexDirection:'row', justifyContent:'center' },
  wazeBtnText:{ color:'#0a7a3e', fontWeight:'800' },

  empty:{ alignItems:'center', paddingTop:40 },

  // תצוגת תמונה (אם יש)
  thumb:{ width:'100%', height:140, borderRadius:10, marginTop:8, marginBottom:6 },
});

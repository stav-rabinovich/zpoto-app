// screens/FavoritesScreen.js
// מציג מועדפים מה-AsyncStorage (IDs + מפה לנתונים).
// כפתורים זהים בגודל: הזמן עכשיו | פתח במפה | וויז
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { openWaze } from '../utils/nav';
import { useTheme } from '@shopify/restyle';

const IDS_KEY = 'favorites';
const DATA_KEY = 'favoritesData';

export default function FavoritesScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ids, setIds] = useState([]);         // ['spot-1', ...]
  const [dataMap, setDataMap] = useState({}); // { 'spot-1': spotObj, ... }

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
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{spot.address || spot.title || 'חניה'}</Text>
          <TouchableOpacity onPress={() => removeFavorite(spotId)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="heart-dislike-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        {/* תמונה אם קיימת */}
        {!!hasThumb && (
          <Image source={{ uri: spot.images[0].uri }} style={styles.thumb} />
        )}

        {/* מידע — צמוד לשמאל */}
        {!!spot.price && <Text style={styles.line}>מחיר לשעה: ₪{spot.price}</Text>}
        {!!spot.distanceKm && <Text style={styles.line}>מרחק: {Number(spot.distanceKm).toFixed(2)} ק״מ</Text>}

        {/* כפתורים — אותו גודל בדיוק */}
        <View style={styles.actionsRow}>
          {/* הזמן עכשיו */}
          <TouchableOpacity
            style={[styles.btnFixed, styles.btnPrimary]}
            onPress={() => navigation.navigate('Booking', { spot: { ...spot, title: spot.address || spot.title } })}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="הזמן עכשיו"
          >
            <Text style={styles.btnTextPrimary} numberOfLines={1} ellipsizeMode="clip">הזמן עכשיו</Text>
          </TouchableOpacity>

          {/* פתח במפה */}
          <TouchableOpacity
            style={[styles.btnFixed, styles.btnSecondary]}
            onPress={() => navigation.navigate('SearchResults', {
              coords: { latitude: spot.latitude, longitude: spot.longitude },
              query: spot.address || '',
            })}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="פתח במפה"
          >
            <Ionicons name="map" size={16} color={theme.colors.primary} style={{ marginEnd:6 }} />
            <Text style={styles.btnTextSecondary} numberOfLines={1} ellipsizeMode="clip">פתח במפה</Text>
          </TouchableOpacity>

          {/* וויז */}
          <TouchableOpacity
            style={[styles.btnFixed, styles.btnWaze]}
            onPress={() => hasCoords && openWaze(spot.latitude, spot.longitude, spot.address || spot.title || 'Zpoto')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="וויז"
          >
            <Ionicons name="navigate" size={16} color={theme.colors.success} style={{ marginEnd:6 }} />
            <Text style={styles.btnTextWaze} numberOfLines={1} ellipsizeMode="clip">וויז</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const empty = (
    <View style={styles.empty}>
      <Ionicons name="heart-outline" size={32} color={theme.colors.secondary} />
      <Text style={styles.emptyTitle}>אין מועדפים עדיין.</Text>
      <Text style={styles.emptySub}>חפש חניה והוסף בלב ❤️</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        data={ids}
        keyExtractor={(id) => id}
        renderItem={renderItem}
        ListEmptyComponent={!loading && empty}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      />
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    wrap:{ flex:1, backgroundColor: colors.bg },

    card:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      shadowColor:'#000',
      shadowOpacity:0.06,
      shadowRadius:12,
      shadowOffset:{ width:0, height:6 },
      elevation:2,
      borderWidth:1,
      borderColor: colors.border,
    },

    cardHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' },

    title:{ fontSize:16, fontWeight:'800', marginBottom:4, color: colors.text },

    // קווים (מחיר/מרחק) — לשמאל
    line:{ fontSize:14, color: colors.text, marginTop:2, textAlign:'left' },

    // תמונה
    thumb:{ width:'100%', height:140, borderRadius: borderRadii.sm, marginTop:8, marginBottom:6, backgroundColor: colors.bg },

    // === שלושת הכפתורים — זהים ===
    actionsRow:{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'space-between',
      marginTop: spacing.md,
    },

    // צורה זהה: flexBasis זהה + גובה זהה. בלי flex לגדלים שונים.
    btnFixed:{
      flexBasis:'31.5%',   // שלושה כפתורים עם רווחים — זהה לכולם
      height:44,
      borderRadius: borderRadii.sm,
      alignItems:'center',
      justifyContent:'center',
      flexDirection:'row',
      paddingHorizontal:8,
      overflow:'hidden',
    },

    // פרימרי
    btnPrimary:{ backgroundColor: colors.primary },
    btnTextPrimary:{
      color:'#fff',
      fontWeight:'800',
      fontSize:15,
      textAlign:'center',
      includeFontPadding:false,
      textAlignVertical:'center',
    },

    // משני
    btnSecondary:{
      backgroundColor: colors.surface,
      borderWidth:1,
      borderColor: colors.primary,
    },
    btnTextSecondary:{
      color: colors.primary,
      fontWeight:'700',
      fontSize:14,
      textAlign:'center',
      includeFontPadding:false,
      textAlignVertical:'center',
    },

    // וויז
    btnWaze:{
      backgroundColor:'#e8fff2',
      borderWidth:1,
      borderColor:'#b9f5cf',
    },
    btnTextWaze:{
      color: colors.success,
      fontWeight:'700',
      fontSize:14,
      textAlign:'center',
      includeFontPadding:false,
      textAlignVertical:'center',
    },

    // ריק
    empty:{ alignItems:'center', paddingTop: 40 },
    emptyTitle:{ color: colors.subtext, marginTop:6 },
    emptySub:{ color: colors.subtext, marginTop:2, fontSize:12 },
  });
}

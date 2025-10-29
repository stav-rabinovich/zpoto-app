// screens/FavoritesScreen.js
// מציג מועדפים מהשרת
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
import { getUserFavorites, removeFavorite } from '../services/api';
import { getAnonymousFavorites, removeAnonymousFavorite } from '../services/api/guestService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { openWaze } from '../utils/nav';
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// הוסרנו AsyncStorage keys - עובדים רק מהשרת

export default function FavoritesScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ids, setIds] = useState([]);         // ['spot-1', ...]
  const [dataMap, setDataMap] = useState({}); // { 'spot-1': spotObj, ... }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // קריאה מהשרת - נסה קודם API של משתמשים מחוברים, אחר כך Anonymous
      const result = await getUserFavorites();
      
      if (result.success) {
        const favorites = result.data || [];
        
        // המרה לפורמט הקיים
        const idsArr = favorites.map(fav => String(fav.parking.id));
        const map = {};
        favorites.forEach(fav => {
          map[String(fav.parking.id)] = {
            id: fav.parking.id,
            title: fav.parking.title,
            address: fav.parking.address,
            lat: fav.parking.lat,
            lng: fav.parking.lng,
            priceHr: fav.parking.priceHr,
            latitude: fav.parking.lat,  // הוספה לתאימות
            longitude: fav.parking.lng  // הוספה לתאימות
          };
        });
        
        setIds(idsArr);
        setDataMap(map);
      } else {
        console.error('Load favorites error:', result.error);
        setIds([]);
        setDataMap({});
      }
    } catch (error) {
      console.error('Load favorites error:', error);
      setIds([]);
      setDataMap({});
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

  const removeFavoriteItem = useCallback(async (spotId) => {
    await Haptics.selectionAsync();
    
    try {
      // מחיקה בשרת - נסה קודם API של משתמשים מחוברים, אחר כך Anonymous
      const result = await removeFavorite(parseInt(spotId));
      
      if (result.success) {
        // עדכון מקומי אחרי הצלחה
        const nextIds = ids.filter(id => id !== spotId);
        const nextMap = { ...dataMap };
        delete nextMap[spotId];
        setIds(nextIds);
        setDataMap(nextMap);
      } else {
        console.error('Remove favorite error:', result.error);
        // TODO: הצגת שגיאה למשתמש
      }
    } catch (error) {
      console.error('Remove favorite error:', error);
      // TODO: הצגת שגיאה למשתמש
    }
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
          <TouchableOpacity onPress={() => removeFavoriteItem(spotId)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
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
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: Math.max(insets.bottom + 70, theme.spacing.xl) }}
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

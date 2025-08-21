// screens/SearchResultsScreen.js
// תוצאות חיפוש – UI מותאם Zpoto, RTL מלא, ללא "מרכז חיפוש" עליון, חוויית 2090

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, ActivityIndicator, Alert,
  ScrollView, TouchableOpacity, StatusBar, Switch, Image, Platform
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shopify/restyle';
import { osmReverse } from '../../utils/osm';
import { openWaze } from '../../utils/nav';

const OWNER_LISTINGS_KEY = 'owner_listings';
const PREFS_KEY = 'search_prefs_v1';

const SCREEN_W = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(SCREEN_W - 24, 340);

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function haversineMeters(a, b) {
  if (!a || !b) return Infinity;
  return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) * 1000;
}
function fmtRange(startIso, endIso) {
  try {
    if (!startIso || !endIso) return null;
    const s = new Date(startIso), e = new Date(endIso);
    const sameDay = s.toDateString() === e.toDateString();
    const d = (dt) => dt.toLocaleDateString('he-IL');
    const t = (dt) => dt.toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit' });
    return sameDay ? `${d(s)} • ${t(s)}–${t(e)}` : `${d(s)} ${t(s)} → ${d(e)} ${t(e)}`;
  } catch { return null; }
}

const DEFAULT_REGION = { latitude: 32.0853, longitude: 34.7818, latitudeDelta: 0.02, longitudeDelta: 0.02 };
const GROUP_PRICES = [10, 12, 15, 20];
const GROUP_DISTANCES = [0.5, 1, 2];
const SEARCH_AREA_THRESHOLD_M = 120;

export default function SearchResultsScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme, CARD_WIDTH), [theme]);

  const initialQuery = route?.params?.query ?? '';
  const coordsFromSearch = route?.params?.coords || null;
  const filtersFromAdvanced = route?.params?.filters || null;

  const [region, setRegion] = useState(null);
  const [searchCenter, setSearchCenter] = useState(null);

  const [initialRegionLoaded, setInitialRegionLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState(initialQuery);
  const mapRef = useRef(null);
  const cardsScrollRef = useRef(null);

  const [maxPrice, setMaxPrice] = useState(null);
  const [maxDistance, setMaxDistance] = useState(null);
  const [sortBy, setSortBy] = useState('distance');

  const [showOwnerListings, setShowOwnerListings] = useState(true);
  const [favorites, setFavorites] = useState([]);

  const [pickedPoint, setPickedPoint] = useState(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [viewportDirty, setViewportDirty] = useState(false);

  // Chip (מותאם מיתוג, RTL)
  const Chip = useCallback(function Chip({ label, active, onPress }) {
    if (active) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.chipWrapper} accessibilityRole="button">
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
            style={[styles.chip, styles.chipActive]}
          >
            <Text style={styles.chipTextActive} numberOfLines={1}>{label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.chip, styles.chipIdle]} accessibilityRole="button">
        <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
    );
  }, [styles, theme.colors.gradientStart, theme.colors.gradientEnd]);

  useEffect(() => {
    (async () => {
      try {
        const rawFav = await AsyncStorage.getItem('favorites');
        if (rawFav) setFavorites(JSON.parse(rawFav));
      } catch {}
      try {
        const prefsRaw = await AsyncStorage.getItem(PREFS_KEY);
        const prefs = prefsRaw ? JSON.parse(prefsRaw) : {};
        if (!coordsFromSearch && prefs.lastRegion && !initialRegionLoaded) {
          setRegion(prefs.lastRegion);
          setSearchCenter({ latitude: prefs.lastRegion.latitude, longitude: prefs.lastRegion.longitude });
          setInitialRegionLoaded(true);
          setLoading(false);
          return;
        }
      } catch {}
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    (async () => {
      if (initialRegionLoaded) return;
      try {
        let startRegion;
        if (coordsFromSearch) {
          startRegion = { latitude: coordsFromSearch.latitude, longitude: coordsFromSearch.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            startRegion = DEFAULT_REGION;
          } else {
            const { coords } = await Location.getCurrentPositionAsync({});
            startRegion = { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
          }
        }
        setRegion(startRegion);
        setSearchCenter({ latitude: startRegion.latitude, longitude: startRegion.longitude });
      } catch {
        Alert.alert('שגיאה', 'לא הצלחנו לקבל מיקום. מציגים אזור ברירת מחדל.');
        setRegion(DEFAULT_REGION);
        setSearchCenter({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
      } finally {
        setInitialRegionLoaded(true);
        setLoading(false);
      }
    })();
  }, [coordsFromSearch, initialRegionLoaded]);

  useEffect(() => {
    (async () => {
      try {
        const prevRaw = await AsyncStorage.getItem(PREFS_KEY);
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...prev, sortBy }));
      } catch {}
    })();
  }, [sortBy]);

  const onRegionChangeComplete = useCallback(async (nextRegion) => {
    setRegion(nextRegion);
    const centerOfViewport = { latitude: nextRegion.latitude, longitude: nextRegion.longitude };
    const moved = haversineMeters(centerOfViewport, searchCenter) > SEARCH_AREA_THRESHOLD_M;
    setViewportDirty(moved);
    try {
      const prevRaw = await AsyncStorage.getItem(PREFS_KEY);
      const prev = prevRaw ? JSON.parse(prevRaw) : {};
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...prev, lastRegion: nextRegion }));
    } catch {}
  }, [searchCenter]);

  useEffect(() => {
    if (!filtersFromAdvanced) return;
    if (typeof filtersFromAdvanced.maxPrice === 'number') setMaxPrice(filtersFromAdvanced.maxPrice);
    if (typeof filtersFromAdvanced.maxDistance === 'number') setMaxDistance(filtersFromAdvanced.maxDistance);
  }, [filtersFromAdvanced]);

  const demoSpots = useMemo(() => {
    if (!searchCenter) return [];
    const base = { lat: searchCenter.latitude, lng: searchCenter.longitude };
    const deltas = [
      { dx: 0.0015, dy: 0.0012, price: 12, address: 'דיזנגוף 100' },
      { dx: -0.001, dy: 0.0018, price: 10, address: 'בן יהודה 45' },
      { dx: 0.002,  dy: -0.0008, price: 15, address: 'אבן גבירול 90' },
      { dx: -0.0016,dy: -0.0012, price: 9,  address: 'אלנבי 120' },
      { dx: 0.0007, dy: -0.0019, price: 18, address: 'רוטשילד 22' },
      { dx: -0.0022,dy: 0.0006, price: 11, address: 'יהודה הלוי 5' },
    ].map((d, i) => {
      const lat = base.lat + d.dy;
      const lng = base.lng + d.dx;
      return {
        id: `demo-${i+1}`,
        title: d.address,
        address: d.address,
        price: d.price,
        latitude: lat,
        longitude: lng,
        distanceKm: haversineKm(base.lat, base.lng, lat, lng),
        source: 'demo',
        images: [],
      };
    });
    return deltas;
  }, [searchCenter]);

  const [ownerSpots, setOwnerSpots] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(OWNER_LISTINGS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (!searchCenter) { setOwnerSpots([]); return; }
        const baseLat = searchCenter.latitude;
        const baseLng = searchCenter.longitude;

        const mapped = list
          .filter(x => x.active && typeof x.latitude === 'number' && typeof x.longitude === 'number')
          .map(x => ({
            id: `owner-${x.id}`,
            ownerListingId: x.id,
            title: x.title || x.address || 'חניה',
            address: x.address || '',
            price: typeof x.price === 'number' ? x.price : 10,
            latitude: x.latitude,
            longitude: x.longitude,
            images: Array.isArray(x.images) ? x.images : [],
            distanceKm: haversineKm(baseLat, baseLng, x.latitude, x.longitude),
            source: 'owner',
            availability: x.availability || null,
            requireApproval: !!x.requireApproval,
          }));

        setOwnerSpots(mapped);
      } catch {
        setOwnerSpots([]);
      }
    })();
  }, [searchCenter]);

  const spotsRaw = useMemo(() => {
    const base = [...demoSpots];
    if (showOwnerListings) base.push(...ownerSpots);
    return base;
  }, [demoSpots, ownerSpots, showOwnerListings]);

  const spots = useMemo(() => {
    let arr = [...spotsRaw];
    const filt = filtersFromAdvanced || {};
    const priceCap = maxPrice ?? filt.maxPrice ?? null;
       const distCap  = maxDistance ?? filt.maxDistance ?? null;

    if (priceCap != null) arr = arr.filter(s => s.price <= priceCap);
    if (distCap  != null) arr = arr.filter(s => s.distanceKm <= distCap);
    arr.sort((a, b) => (sortBy === 'distance' ? a.distanceKm - b.distanceKm : a.price - b.price));
    return arr;
  }, [spotsRaw, maxPrice, maxDistance, sortBy, filtersFromAdvanced]);

  const toggleFavorite = useCallback(async (spot) => {
    await Haptics.selectionAsync();
    setFavorites(prev => {
      const exists = prev.includes(spot.id);
      const next = exists ? prev.filter(id => id !== spot.id) : [...prev, spot.id];
      AsyncStorage.setItem('favorites', JSON.stringify(next));
      AsyncStorage.getItem('favoritesData').then(raw => {
        let map = {};
        try { map = raw ? JSON.parse(raw) : {}; } catch {}
        if (exists) delete map[spot.id];
        else map[spot.id] = spot;
        AsyncStorage.setItem('favoritesData', JSON.stringify(map));
      });
      return next;
    });
  }, []);

  const onSelectSpot = useCallback(async (spot) => {
    setSelectedId(spot.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: spot.latitude, longitude: spot.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
        400
      );
    }
    if (cardsScrollRef.current) {
      const idx = spots.findIndex(s => s.id === spot.id);
      if (idx >= 0) {
        const x = idx * (CARD_WIDTH + 12);
        cardsScrollRef.current.scrollTo({ x, y: 0, animated: true });
      }
    }
  }, [spots]);

  const recenter = useCallback(async () => {
    await Haptics.selectionAsync();
    if (mapRef.current && searchCenter) {
      mapRef.current.animateToRegion({
        latitude: searchCenter.latitude,
        longitude: searchCenter.longitude,
        latitudeDelta: region?.latitudeDelta ?? 0.02,
        longitudeDelta: region?.longitudeDelta ?? 0.02,
      }, 400);
    }
    setSelectedId(null);
  }, [searchCenter, region]);

  const timeBadge = filtersFromAdvanced?.start && filtersFromAdvanced?.end
    ? fmtRange(filtersFromAdvanced.start, filtersFromAdvanced.end)
    : null;

  const onLongPress = useCallback(async (e) => {
    try {
      const { latitude, longitude } = e.nativeEvent.coordinate || {};
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setReverseLoading(true);
      setPickedPoint({ latitude, longitude, address: '' });

      const rev = await osmReverse(latitude, longitude, 'he');
      setPickedPoint(prev => prev ? { ...prev, address: rev?.address || '' } : prev);
    } catch {}
    finally {
      setReverseLoading(false);
    }
  }, []);

  const searchHere = useCallback(async () => {
    if (!pickedPoint) return;
    const nextCenter = { latitude: pickedPoint.latitude, longitude: pickedPoint.longitude };
    setSearchCenter(nextCenter);
    setQuery(pickedPoint.address || 'חיפוש לפי נקודה במפה');
    setSelectedId(null);
   setPickedPoint(null);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        { ...nextCenter, latitudeDelta: region?.latitudeDelta ?? 0.02, longitudeDelta: region?.longitudeDelta ?? 0.02 },
        400
      );
    }
    setViewportDirty(false);
  }, [pickedPoint, region]);

  const searchByViewport = useCallback(async () => {
    if (!region) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextCenter = { latitude: region.latitude, longitude: region.longitude };
    setSearchCenter(nextCenter);
    setQuery('חיפוש באזור המפה');
    setSelectedId(null);
    setViewportDirty(false);
  }, [region]);

  const clearFilters = useCallback(() => {
    setMaxPrice(null);
    setMaxDistance(null);
    setSortBy('distance');
    setShowOwnerListings(true);
  }, []);

  if (loading || !region || !searchCenter) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8, color: '#111', textAlign:'right' }}>טוען מפה… {query ? `(${query})` : ''}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        onRegionChangeComplete={onRegionChangeComplete}
        onLongPress={onLongPress}
        accessibilityLabel="מפת תוצאות חניה"
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />

        {/* מרכז החיפוש: נקודה בלבד */}
        <Marker
          coordinate={{ latitude: searchCenter.latitude, longitude: searchCenter.longitude }}
          pinColor={theme.colors.accent}
          tracksViewChanges={false}
        />

        {spots.map(spot => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            title={`${spot.title || spot.address || 'חניה'}`}
            description={`₪${spot.price}/ש׳ • ${spot.distanceKm.toFixed(2)} ק״מ${spot.source === 'owner' ? ' • בעל חניה' : ''}`}
            onPress={() => onSelectSpot(spot)}
            pinColor={spot.id === selectedId ? theme.colors.primary : (spot.source === 'owner' ? theme.colors.success : undefined)}
          />
        ))}

        {pickedPoint && (
          <Marker
            coordinate={{ latitude: pickedPoint.latitude, longitude: pickedPoint.longitude }}
            title="נקודה שנבחרה"
            description={pickedPoint.address || 'טוען כתובת…'}
            pinColor={theme.colors.secondary}
          />
        )}
      </MapView>

      {/* Attribution */}
      <View style={styles.attribution}>
        <Text style={styles.attrText}>© OpenStreetMap contributors</Text>
      </View>

      {/* סרגל פילטרים עליון – RTL + מיתוג + "נקה סינון" + מונה תוצאות */}
      <View style={styles.filtersBar} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(10,12,18,0.65)', 'rgba(10,12,18,0.35)']}
          start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          <Text style={styles.groupLabel} numberOfLines={1}>מחיר:</Text>
          {GROUP_PRICES.map(v => (
            <Chip
              key={`p-${v}`}
              label={`עד ₪${v}`}
              active={(maxPrice ?? filtersFromAdvanced?.maxPrice) === v}
              onPress={() => setMaxPrice((maxPrice ?? null) === v ? null : v)}
            />
          ))}

          <Text style={[styles.groupLabel, { marginStart: 12 }]} numberOfLines={1}>מרחק:</Text>
          {GROUP_DISTANCES.map(v => (
            <Chip
              key={`d-${v}`}
              label={`עד ${v} ק״מ`}
              active={(maxDistance ?? filtersFromAdvanced?.maxDistance) === v}
              onPress={() => setMaxDistance((maxDistance ?? null) === v ? null : v)}
            />
          ))}

          <Text style={[styles.groupLabel, { marginStart: 12 }]} numberOfLines={1}>מיון:</Text>
          <Chip label="מרחק" active={sortBy==='distance'} onPress={() => setSortBy('distance')} />
          <Chip label="מחיר" active={sortBy==='price'} onPress={() => setSortBy('price')} />

          <View style={{ width: 12 }} />
          <View style={styles.ownerToggle}>
            <Text style={styles.ownerToggleText} numberOfLines={1}>הצג חניות מבעלי חניה</Text>
            <Switch value={showOwnerListings} onValueChange={setShowOwnerListings} />
          </View>

          <TouchableOpacity onPress={clearFilters} activeOpacity={0.9} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={16} color="#fff" />
            <Text style={styles.clearBtnText} numberOfLines={1}>נקה סינון</Text>
          </TouchableOpacity>

          <View style={styles.countPill}>
            <Text style={styles.countPillText} numberOfLines={1}>{spots.length} תוצאות</Text>
          </View>
        </ScrollView>
      </View>

      {/* באדג׳ טווח זמן (אם קיים) */}
      {!!timeBadge && (
        <View style={styles.timeBadge}>
          <Ionicons name="time-outline" size={14} color="#fff" style={{ marginStart: 6 }} />
          <Text style={styles.timeBadgeText} numberOfLines={1}>{timeBadge}</Text>
        </View>
      )}

      {/* כפתור מיקום מחדש – עבר לצד שמאל */}
      <TouchableOpacity style={styles.fab} onPress={recenter} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="חזרה למרכז">
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Ionicons name="locate" size={22} color="#fff" />
      </TouchableOpacity>

      {viewportDirty && (
        <View style={styles.searchViewportBar}>
          <Text style={styles.searchViewportText}>האזור במפה השתנה</Text>
          <TouchableOpacity style={styles.searchViewportBtn} onPress={searchByViewport} activeOpacity={0.9}>
            <Text style={styles.searchViewportBtnText}>חפש באזור הנראה</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* כרטיסיות תוצאות בתחתית */}
      <View style={styles.cardsWrap} pointerEvents="box-none">
        <ScrollView
          ref={cardsScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContent}
        >
          {spots.length === 0 ? (
            <View style={[styles.card, { width: CARD_WIDTH, alignItems: 'center' }]}>
              <Text style={styles.cardTitle}>לא נמצאו חניות בתנאי הסינון</Text>
              <Text style={styles.cardLine}>נסו להרחיב מחיר/מרחק או להפעיל חניות מבעלי חניה</Text>
            </View>
          ) : (
            spots.map(spot => {
              const liked = favorites.includes(spot.id);
              const thumb = spot.images?.[0]?.uri;
              const isActive = spot.id === selectedId;
              return (
                <View
                  key={spot.id}
                  style={[styles.card, isActive && styles.cardActive, { width: CARD_WIDTH }]}
                  accessible
                  accessibilityRole="summary"
                  accessibilityLabel={`${spot.title || spot.address}. מחיר לשעה ${spot.price} שקלים. מרחק ${spot.distanceKm.toFixed(2)} קילומטרים.`}
                >
                  {isActive && (
                    <LinearGradient
                      colors={[`${theme.colors.gradientStart}33`, `${theme.colors.gradientEnd}33`]}
                      start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
                      style={styles.cardGlow}
                    />
                  )}

                  {!!thumb && <Image source={{ uri: thumb }} style={styles.cardImg} />}

                  {/* כותרת לשמאל; תגית + לב בצד ימין */}
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{spot.title || spot.address}</Text>
                    <View style={styles.badgesRow}>
                      {/* תגית מקור */}
                      {spot.source === 'owner' ? (
                        <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>בעל חניה</Text></View>
                      ) : (
                        <View style={styles.demoBadge}><Text style={styles.demoBadgeText}>דמו</Text></View>
                      )}
                      {/* הלב — הימני ביותר */}
                      <TouchableOpacity
                        onPress={() => toggleFavorite(spot)}
                        hitSlop={{ top:6, bottom:6, left:6, right:6 }}
                        accessibilityRole="button"
                        accessibilityLabel={liked ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                        style={{ marginStart: 8 }}
                      >
                        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#ff4d6d' : '#9AA3AF'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* נתוני כרטיסייה לשמאל */}
                  <Text style={styles.cardLine}>
                    ₪{spot.price} לשעה • {spot.distanceKm.toFixed(2)} ק״מ{spot.source === 'owner' ? ' • בעל חניה' : ''}
                  </Text>

                  <View style={styles.cardButtonsRow}>
                    <TouchableOpacity
                      style={[styles.cardBtn, { flex:1 }]}
                      onPress={() => onSelectSpot(spot)}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel="הצג במפה"
                    >
                      <Ionicons name="map" size={16} color="#fff" />
                      <Text style={styles.cardBtnText} numberOfLines={1}>הצג במפה</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardBtnOutline, { flex:1 }]}
                      onPress={() => navigation.navigate('Booking', {
                        spot: {
                          ...spot,
                          title: spot.title || spot.address,
                          ownerListingId: spot.ownerListingId ?? null,
                          availability: spot.availability ?? null,
                          requireApproval: !!spot.requireApproval,
                        }
                      })}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel="הזמן עכשיו"
                    >
                      <Text style={styles.cardBtnOutlineText} numberOfLines={1}>הזמן עכשיו</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardBtnWaze, { flex:1 }]}
                      onPress={() => openWaze(spot.latitude, spot.longitude, spot.title || spot.address || 'Zpoto')}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel="פתח ניווט בוויז"
                    >
                      <Ionicons name="navigate" size={16} color={theme.colors.success} />
                      <Text style={styles.cardBtnWazeText} numberOfLines={1}>וויז</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* פעולה לנקודה שנבחרה בלונג-פרס */}
      {pickedPoint && (
        <View style={styles.pickHint}>
          <LinearGradient
            colors={['rgba(10,12,18,0.65)', 'rgba(10,12,18,0.35)']}
            start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.pickText} numberOfLines={1}>
            {reverseLoading ? 'מביא כתובת…' : (pickedPoint.address || 'נקודה שנבחרה')}
          </Text>
          <TouchableOpacity onPress={searchHere} style={styles.pickBtn} activeOpacity={0.9} accessibilityRole="button">
            <Text style={styles.pickBtnText} numberOfLines={1}>חפש כאן</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function makeStyles(theme, cardWidth) {
  const { colors } = theme;
  return StyleSheet.create({
    container:{ flex:1, backgroundColor:'#000', direction:'rtl', writingDirection:'rtl' },
    map:{ width:Dimensions.get('window').width, height:Dimensions.get('window').height },

    center:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' },

    attribution:{
      position:'absolute', bottom:8, right:10,
      backgroundColor:'rgba(0,0,0,0.45)', paddingHorizontal:8, paddingVertical:4, borderRadius:8
    },
    attrText:{ color:'#fff', fontSize:11, writingDirection:'rtl', textAlign:'right' },

    // Filters
    filtersBar:{
      position:'absolute', top:16, left:12, right:12,
      paddingVertical:8, borderRadius:999, overflow:'hidden',
      borderWidth:1, borderColor:'rgba(255,255,255,0.16)',
    },
    filtersContent:{
      paddingHorizontal: 12, alignItems:'center', flexDirection:'row-reverse',
    },
    groupLabel:{ color:'#e9f7ff', fontWeight:'800', marginStart:6, alignSelf:'center', textAlign:'right', writingDirection:'rtl' },

    // Time badge (optional)
    timeBadge:{
      position:'absolute', top:64, right:16,
      backgroundColor:'rgba(0,0,0,0.45)', paddingVertical:6, paddingHorizontal:10,
      borderRadius:999, borderWidth:1, borderColor:'rgba(255,255,255,0.18)', flexDirection:'row-reverse', alignItems:'center'
    },
    timeBadgeText:{ color:'#fff', fontWeight:'800', textAlign:'right', writingDirection:'rtl' },

    // chips
    chipWrapper:{ marginStart:8, borderRadius:999 },
    chip:{
      paddingHorizontal:14, paddingVertical:10, borderRadius:999,
      minHeight:40, justifyContent:'center', alignItems:'center'
    },
    chipIdle:{
      borderWidth:1, borderColor:colors.primary, backgroundColor:'rgba(255,255,255,0.08)',
      marginStart:8
    },
    chipActive:{
      shadowColor:'#000', shadowOpacity:0.18, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:3
    },
    chipText:{ color:'#e9f7ff', fontWeight:'700', textAlign:'right', writingDirection:'rtl' },
    chipTextActive:{ color:'#fff', fontWeight:'800', textAlign:'right', writingDirection:'rtl' },

    ownerToggle:{
      flexDirection:'row-reverse', alignItems:'center', gap:8,
      backgroundColor:'rgba(255,255,255,0.12)',
      paddingHorizontal:12, paddingVertical:8, borderRadius:999,
      borderWidth:1, borderColor:'rgba(127,220,255,0.6)'
    },
    ownerToggleText:{ color:'#e9f7ff', fontWeight:'700', marginStart:6, textAlign:'right', writingDirection:'rtl' },

    clearBtn:{
      flexDirection:'row-reverse', alignItems:'center', gap:6,
      backgroundColor:'rgba(255,255,255,0.14)', paddingHorizontal:12, paddingVertical:8,
      borderRadius:999, marginStart:8, borderWidth:1, borderColor:'rgba(255,255,255,0.22)'
    },
    clearBtnText:{ color:'#fff', fontWeight:'800', textAlign:'right', writingDirection:'rtl' },

    countPill:{
      marginStart:8, backgroundColor:'rgba(0,0,0,0.45)', paddingHorizontal:10, paddingVertical:8,
      borderRadius:999, borderWidth:1, borderColor:'rgba(255,255,255,0.18)'
    },
    countPillText:{ color:'#fff', fontWeight:'800', textAlign:'right', writingDirection:'rtl' },

    // recenter FAB — עבר לשמאל
    fab:{
      position:'absolute', left:18, bottom:Platform.select({ ios: 160, android: 150 }), width:56, height:56, borderRadius:28,
      alignItems:'center', justifyContent:'center',
      overflow:'hidden',
      shadowColor:colors.gradientStart, shadowOpacity:0.45, shadowRadius:16, shadowOffset:{ width:0, height:8 }, elevation:6
    },

    // viewport dirty bar
    searchViewportBar:{
      position:'absolute', top:72, left:12, right:12,
      backgroundColor:'#fff7e6', borderRadius:12, borderWidth:1, borderColor:'#ffd79a',
      padding:10, flexDirection:'row-reverse', alignItems:'center', gap:10,
      shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, shadowOffset:{ width:0, height:4 }
    },
    searchViewportText:{ color:'#7a4d00', fontWeight:'800', flex:1, textAlign:'right', writingDirection:'rtl' },
    searchViewportBtn:{ backgroundColor:'#ffb74d', paddingVertical:10, paddingHorizontal:12, borderRadius:10 },
    searchViewportBtnText:{ color:'#4a2a00', fontWeight:'900', textAlign:'right', writingDirection:'rtl' },

    // bottom cards
    cardsWrap:{ position:'absolute', bottom:22, left:0, right:0 },
    cardsContent:{ paddingHorizontal: 12, flexDirection:'row-reverse' },
    card:{
      width: cardWidth, marginStart:12, backgroundColor:'#fff', borderRadius:14, padding:12,
      shadowColor:'#000', shadowOpacity:0.1, shadowRadius:8, shadowOffset:{ width:0, height:4 }, elevation:2,
      borderWidth:1, borderColor:'#ecf1f7', overflow:'hidden'
    },
    cardGlow:{ ...StyleSheet.absoluteFillObject, borderRadius:14 },

    cardActive:{ borderColor:colors.primary },
    cardImg:{ width:'100%', height:120, borderRadius:10, marginBottom:8, backgroundColor:'#f2f4f7' },

    // כותרת לשמאל; תגיות+לב בימין
    cardHeaderRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
    badgesRow:{ flexDirection:'row', alignItems:'center', justifyContent:'flex-end' },

    ownerBadge:{
      backgroundColor:'#e6fff4', borderColor:'#b9f5cf', borderWidth:1,
      paddingHorizontal:8, paddingVertical:4, borderRadius:999
    },
    ownerBadgeText:{ color:colors.success, fontWeight:'800', textAlign:'right', writingDirection:'rtl' },
    demoBadge:{
      backgroundColor:'#eef3ff', borderColor:'#d6e1ff', borderWidth:1,
      paddingHorizontal:8, paddingVertical:4, borderRadius:999
    },
    demoBadgeText:{ color:colors.primary, fontWeight:'800', textAlign:'right', writingDirection:'rtl' },

    // מיושרים לשמאל
    cardTitle:{ fontSize:16, fontWeight:'800', marginBottom:4, color:'#0b0f14', textAlign:'left' },
    cardLine:{ fontSize:14, color:'#333', textAlign:'left' },

    cardButtonsRow:{ flexDirection:'row-reverse', alignItems:'stretch', gap:6, marginTop:8 },
    cardBtn:{
      flexDirection:'row-reverse', alignItems:'center', justifyContent:'center',
      gap:6, backgroundColor:colors.primary, paddingVertical:12, paddingHorizontal:12,
      borderRadius:10, minHeight:44, minWidth:0
    },
    cardBtnText:{ color:'#fff', fontWeight:'800', textAlign:'right', includeFontPadding:false },

    cardBtnOutline:{
      backgroundColor:'#fff', paddingVertical:12, paddingHorizontal:12, borderRadius:10,
      borderWidth:1, borderColor:colors.primary, alignItems:'center', justifyContent:'center',
      minHeight:44, minWidth:0
    },
    cardBtnOutlineText:{ color:colors.primary, fontWeight:'800', textAlign:'right', includeFontPadding:false },

    cardBtnWaze:{
      backgroundColor:'#e8fff2', paddingVertical:12, paddingHorizontal:12, borderRadius:10,
      borderWidth:1, borderColor:'#b9f5cf', alignItems:'center', justifyContent:'center',
      flexDirection:'row-reverse', gap:6, minHeight:44, minWidth:0
    },
    cardBtnWazeText:{ color:colors.success, fontWeight:'800', textAlign:'right', includeFontPadding:false },

    // long-press "search here"
    pickHint:{
      position:'absolute', left:12, right:12, bottom:96,
      padding:10, borderRadius:12, overflow:'hidden',
      borderWidth:1, borderColor:'rgba(255,255,255,0.16)',
      flexDirection:'row-reverse', alignItems:'center', gap:10
    },
    pickText:{ flex:1, color:'#fff', fontWeight:'700', textAlign:'right' },
    pickBtn:{ backgroundColor:colors.primary, paddingVertical:8, paddingHorizontal:12, borderRadius:10 },
    pickBtnText:{ color:'#fff', fontWeight:'800', textAlign:'right' },
  });
}

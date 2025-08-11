// screens/SearchResultsScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Alert, ScrollView, TouchableOpacity, StatusBar, Switch, Image } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { osmReverse } from '../utils/osm';
import { openWaze } from '../utils/nav';

const OWNER_LISTINGS_KEY = 'owner_listings';
const PREFS_KEY = 'search_prefs_v1';

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

const Chip = React.memo(function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
});

export default function SearchResultsScreen({ route, navigation }) {
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

  const [maxPrice, setMaxPrice] = useState(null);
  const [maxDistance, setMaxDistance] = useState(null);
  const [sortBy, setSortBy] = useState('distance');

  const [showOwnerListings, setShowOwnerListings] = useState(true);
  const [favorites, setFavorites] = useState([]);

  const [pickedPoint, setPickedPoint] = useState(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [viewportDirty, setViewportDirty] = useState(false);

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
            availability: x.availability || null,      // <<< חשוב
            requireApproval: !!x.requireApproval,     // <<< חשוב
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
        { latitude: spot.latitude, longitude: spot.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400
      );
    }
  }, []);

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

  if (loading || !region || !searchCenter) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>טוען מפה… {query ? `(${query})` : ''}</Text>
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
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />

        <Marker
          coordinate={{ latitude: searchCenter.latitude, longitude: searchCenter.longitude }}
          title="מרכז חיפוש"
          description="התוצאות מחושבות סביב נקודה זו"
          pinColor="#2dd4bf"
        />

        {spots.map(spot => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            title={`${spot.title || spot.address || 'חניה'}`}
            description={`₪${spot.price}/ש׳ • ${spot.distanceKm.toFixed(2)} ק״מ${spot.source === 'owner' ? ' • בעל חניה' : ''}`}
            onPress={() => onSelectSpot(spot)}
            pinColor={spot.id === selectedId ? '#00C6FF' : (spot.source === 'owner' ? '#34c759' : undefined)}
          />
        ))}

        {pickedPoint && (
          <Marker
            coordinate={{ latitude: pickedPoint.latitude, longitude: pickedPoint.longitude }}
            title="נקודה שנבחרה"
            description={pickedPoint.address || 'טוען כתובת…'}
            pinColor="#ff7a00"
          />
        )}
      </MapView>

      <View style={styles.attribution}>
        <Text style={styles.attrText}>© OpenStreetMap contributors</Text>
      </View>

      <View style={styles.topBadge}>
        <Text style={styles.badgeText}>{query ? `חיפוש: ${query}` : 'סביב המיקום הנוכחי'}</Text>
        <Text style={[styles.badgeText, { marginTop: 4 }]}>
          מרכז חיפוש: {searchCenter.latitude.toFixed(5)}, {searchCenter.longitude.toFixed(5)}
        </Text>
        {!!timeBadge && <Text style={[styles.badgeText, { marginTop: 4 }]}>טווח: {timeBadge}</Text>}
      </View>

      <View style={styles.filtersBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, alignItems:'center' }}>
          <Text style={styles.groupLabel}>מחיר:</Text>
          {GROUP_PRICES.map(v => (
            <Chip key={`p-${v}`} label={`עד ₪${v}`} active={(maxPrice ?? filtersFromAdvanced?.maxPrice) === v} onPress={() => setMaxPrice((maxPrice ?? null) === v ? null : v)} />
          ))}
          <Text style={[styles.groupLabel, { marginStart: 12 }]}>מרחק:</Text>
          {GROUP_DISTANCES.map(v => (
            <Chip key={`d-${v}`} label={`עד ${v} ק״מ`} active={(maxDistance ?? filtersFromAdvanced?.maxDistance) === v} onPress={() => setMaxDistance((maxDistance ?? null) === v ? null : v)} />
          ))}
          <Text style={[styles.groupLabel, { marginStart: 12 }]}>מיון:</Text>
          <Chip label="מרחק" active={sortBy==='distance'} onPress={() => setSortBy('distance')} />
          <Chip label="מחיר" active={sortBy==='price'} onPress={() => setSortBy('price')} />

          <View style={{ width: 12 }} />
          <View style={styles.ownerToggle}>
            <Text style={styles.ownerToggleText}>הצג חניות מבעלי חניה</Text>
            <Switch value={showOwnerListings} onValueChange={setShowOwnerListings} />
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.fab} onPress={recenter} activeOpacity={0.9}>
        <Ionicons name="locate" size={22} color="#fff" />
      </TouchableOpacity>

      {viewportDirty && (
        <View style={styles.searchViewportBar}>
          <Text style={styles.searchViewportText}>האזור במפה השתנה</Text>
          <TouchableOpacity style={styles.searchViewportBtn} onPress={searchByViewport}>
            <Text style={styles.searchViewportBtnText}>חפש באזור הנראה</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.cardsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {spots.length === 0 ? (
            <View style={[styles.card, { width: 260, alignItems: 'center' }]}>
              <Text style={styles.cardTitle}>לא נמצאו חניות בתנאי הסינון</Text>
              <Text style={styles.cardLine}>נסה להרחיב מחיר/מרחק או להפעיל חניות מבעלי חניה</Text>
            </View>
          ) : (
            spots.map(spot => {
              const liked = favorites.includes(spot.id);
              const thumb = spot.images?.[0]?.uri;
              return (
                <View key={spot.id} style={[styles.card, spot.id === selectedId && styles.cardActive]}>
                  {!!thumb && <Image source={{ uri: thumb }} style={styles.cardImg} />}
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                    <Text style={styles.cardTitle}>{spot.title || spot.address}</Text>
                    <TouchableOpacity onPress={() => toggleFavorite(spot)}>
                      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#ff4d6d' : '#999'} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cardLine}>₪{spot.price} לשעה • {spot.distanceKm.toFixed(2)} ק״מ{spot.source === 'owner' ? ' • בעל חניה' : ''}</Text>

                  <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
                    <TouchableOpacity style={[styles.cardBtn, { flex:1 }]} onPress={() => onSelectSpot(spot)}>
                      <Ionicons name="map" size={16} color="#fff" />
                      <Text style={styles.cardBtnText}>הצג במפה</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardBtnOutline, { flex:1 }]}
                      onPress={() => navigation.navigate('Booking', {
                        spot: {
                          ...spot,
                          title: spot.title || spot.address,
                          ownerListingId: spot.ownerListingId ?? null,
                          availability: spot.availability ?? null,     // <<< מעבירים הלאה
                          requireApproval: !!spot.requireApproval,     // <<< מעבירים הלאה
                        }
                      })}
                    >
                      <Text style={styles.cardBtnOutlineText}>הזמן עכשיו</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardBtnWaze, { flex:1 }]}
                      onPress={() => openWaze(spot.latitude, spot.longitude, spot.title || spot.address || 'Zpoto')}
                    >
                      <Ionicons name="navigate" size={16} color="#0a7a3e" />
                      <Text style={styles.cardBtnWazeText}>וויז</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#000' },
  map:{ width:Dimensions.get('window').width, height:Dimensions.get('window').height },

  center:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' },

  attribution:{ position:'absolute', bottom:8, left:10, backgroundColor:'rgba(0,0,0,0.45)', paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  attrText:{ color:'#fff', fontSize:11 },

  topBadge:{ position:'absolute', top:16, left:16, right:16, backgroundColor:'rgba(0,0,0,0.6)', padding:10, borderRadius:12, alignItems:'center' },
  badgeText:{ color:'#fff', fontWeight:'600' },

  filtersBar:{ position:'absolute', top:64, left:0, right:0 },
  groupLabel:{ color:'#fff', fontWeight:'700', marginRight:6, alignSelf:'center' },
  chip:{ paddingHorizontal:10, paddingVertical:8, borderRadius:999, borderWidth:1, borderColor:'#7fdcff', backgroundColor:'rgba(255,255,255,0.1)', marginRight:8 },
  chipActive:{ backgroundColor:'#00C6FF', borderColor:'#00C6FF' },
  chipText:{ color:'#e9f7ff', fontWeight:'600' },
  chipTextActive:{ color:'#fff' },

  ownerToggle:{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'rgba(255,255,255,0.12)', paddingHorizontal:10, paddingVertical:8, borderRadius:999, borderWidth:1, borderColor:'rgba(127,220,255,0.6)' },
  ownerToggleText:{ color:'#e9f7ff', fontWeight:'700', marginEnd:6 },

  fab:{ position:'absolute', right:18, bottom:160, width:48, height:48, borderRadius:24, alignItems:'center', justifyContent:'center', backgroundColor:'#00C6FF', elevation:4, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:6, shadowOffset:{ width:0, height:3 } },

  searchViewportBar:{ position:'absolute', top:108, left:12, right:12, backgroundColor:'#fff7e6', borderRadius:12, borderWidth:1, borderColor:'#ffd79a', padding:10, flexDirection:'row', alignItems:'center', gap:10, shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, shadowOffset:{ width:0, height:4 } },
  searchViewportText:{ color:'#7a4d00', fontWeight:'700', flex:1 },
  searchViewportBtn:{ backgroundColor:'#ffb74d', paddingVertical:10, paddingHorizontal:12, borderRadius:10 },
  searchViewportBtnText:{ color:'#4a2a00', fontWeight:'800' },

  cardsWrap:{ position:'absolute', bottom:22, left:0, right:0 },
  card:{ width:300, marginRight:12, backgroundColor:'#fff', borderRadius:14, padding:12, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:8, shadowOffset:{ width:0, height:4 }, elevation:2 },
  cardActive:{ borderWidth:2, borderColor:'#00C6FF' },
  cardImg:{ width:'100%', height:120, borderRadius:10, marginBottom:8 },
  cardTitle:{ fontSize:16, fontWeight:'700', marginBottom:4 },
  cardLine:{ fontSize:14, color:'#333' },

  cardBtn:{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#00C6FF', paddingVertical:10, borderRadius:10, justifyContent:'center' },
  cardBtnText:{ color:'#fff', fontWeight:'700' },

  cardBtnOutline:{ backgroundColor:'#fff', paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:'#00C6FF', alignItems:'center', justifyContent:'center' },
  cardBtnOutlineText:{ color:'#00C6FF', fontWeight:'700' },

  cardBtnWaze:{ backgroundColor:'#e8fff2', paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:'#b9f5cf', alignItems:'center', justifyContent:'center', flexDirection:'row', gap:6 },
  cardBtnWazeText:{ color:'#0a7a3e', fontWeight:'800' },
});

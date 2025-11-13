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
// הוסרנו AsyncStorage - עובדים רק מהשרת
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shopify/restyle';
import { osmReverse } from '../utils/osm';
import { openWaze } from '../utils/nav';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useAuthGate } from '../hooks/useAuthGate';
import webSocketService from '../services/webSocketService';
import { getUserFavorites, addFavorite, removeFavorite } from '../services/api/userService';
import { getUserVehicles, getDefaultVehicle } from '../services/api/vehicles';
import { getUserPreferences } from '../services/api/userPreferences';
import { API_BASE } from '../consts';
import { validateBookingSlot } from '../services/api/bookings';
import { formatForAPI, prepareSearchParams } from '../utils/timezone';
import { BOOKING_TYPES, isImmediateBooking } from '../constants/bookingTypes';

// הוסרנו AsyncStorage keys - עובדים רק מהשרת

const SCREEN_W = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_W * 0.85;
const SEARCH_AREA_THRESHOLD_M = 120;

/**
 * פונקציה לסינון חניות זמינות באמצעות API validation
 * @param {Array} parkings - רשימת חניות לבדיקה
 * @param {string} startDate - תאריך התחלה (ISO string)
 * @param {string} endDate - תאריך סיום (ISO string)
 * @returns {Array} רשימת חניות זמינות בלבד
 */
const filterAvailableParkings = async (parkings, startDate, endDate) => {
  console.log('🔍 Starting advanced availability filtering...');
  console.log('📋 Checking', parkings.length, 'parkings for availability');
  
  const availableParkings = [];
  const batchSize = 5; // בדוק 5 חניות בו-זמנית לביצועים
  
  for (let i = 0; i < parkings.length; i += batchSize) {
    const batch = parkings.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(parkings.length/batchSize)}`);
    
    const validationPromises = batch.map(async (parking) => {
      try {
        console.log(`🔍 Validating parking ${parking.id} (${parking.title})`);
        
        const result = await validateBookingSlot(
          parking.id, 
          formatForAPI(startDate), 
          formatForAPI(endDate)
        );
        
        if (result.success && result.valid) {
          console.log(`✅ Parking ${parking.title} is available`);
          return parking;
        } else {
          console.log(`❌ Parking ${parking.title} filtered out: ${result.error || 'Not available'}`);
          return null;
        }
      } catch (error) {
        console.error(`❌ Error validating parking ${parking.id} (${parking.title}):`, error);
        // במקרה של שגיאה, נכלול את החניה (fallback)
        console.log(`⚠️ Including parking ${parking.title} due to validation error (fallback)`);
        return parking;
      }
    });
    
    const batchResults = await Promise.all(validationPromises);
    const validParkings = batchResults.filter(Boolean);
    availableParkings.push(...validParkings);
    
    console.log(`📊 Batch complete: ${validParkings.length}/${batch.length} parkings available`);
  }
  
  console.log(`🎯 Final result: ${availableParkings.length}/${parkings.length} parkings are available`);
  return availableParkings;
};

// פונקציה לחישוב מרחק בין שתי נקודות (במקום haversineMeters)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // מרחק בק"מ
};

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
// // 📝 REMOVED - GROUP_PRICES and GROUP_DISTANCES no longer needed

export default function SearchResultsScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme, CARD_WIDTH), [theme]);
  const { attemptAction, ACTIONS_REQUIRING_AUTH } = useAuthGate();
  const { user, isAuthenticated } = useAuth(); // לזיהוי בעלי חניה

  const initialQuery = route?.params?.query ?? '';
  const coordsFromSearch = route?.params?.coords || null;
  const filtersFromAdvanced = route?.params?.filters || null;
  const [radiusMeters, setRadiusMeters] = useState(route?.params?.radiusMeters || route?.params?.radius || null); // רדיוס מ"סביבי" או מהחיפוש החדש
  const searchType = route?.params?.searchType || 'general'; // סוג החיפוש
  const startDateFromParams = route?.params?.startDate || null;
  const endDateFromParams = route?.params?.endDate || null;
  const minDurationHours = route?.params?.minDurationHours || 1;
  const isImmediate = route?.params?.isImmediate || false;
  const bookingTypeFromParams = route?.params?.bookingType || null; // סוג הזמנה מהפרמטרים
  const vehicleSizeFromParams = route?.params?.vehicleSize || null; // גודל רכב מהפרמטרים
  const onlyCompatibleFromParams = route?.params?.onlyCompatible || false; // סינון תאימות מהפרמטרים
  
  // לוג פרמטרים מ-HomeScreen
  console.log('🏠 SearchResultsScreen received params:', {
    vehicleSize: vehicleSizeFromParams,
    onlyCompatible: onlyCompatibleFromParams,
    searchType,
    bookingType: bookingTypeFromParams
  });

  const [region, setRegion] = useState(null);
  const [searchCenter, setSearchCenter] = useState(null);

  const [initialRegionLoaded, setInitialRegionLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState(initialQuery);
  const mapRef = useRef(null);
  const cardsScrollRef = useRef(null);

  // // 📝 REMOVED - משתני מסננים הוסרו (maxPrice, maxDistance, sortBy)

  const [showOwnerListings, setShowOwnerListings] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [availabilityUpdateReceived, setAvailabilityUpdateReceived] = useState(false);
  const [pickedPoint, setPickedPoint] = useState(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [viewportDirty, setViewportDirty] = useState(false);

  // רכבים והעדפות סינון
  const [userVehicles, setUserVehicles] = useState([]);
  const [userPreferences, setUserPreferences] = useState({});
  const [vehicleFilterEnabled, setVehicleFilterEnabled] = useState(false);

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
        console.log('📥 Loading favorites...');
        // טעינת מועדפים - נסה קודם מהשרת, אחר כך Anonymous
        const result = await getUserFavorites();
        console.log('📊 Favorites result:', result);
        if (result.success) {
          // משתמשים ב-ID של החניות במועדפים
          const favoriteIds = result.data.map(fav => {
            const id = Number(fav.parking?.id || fav.id);
            console.log('🔢 Favorite mapping:', fav, '→', id);
            return id;
          });
          console.log('✅ Setting favorites:', favoriteIds);
          setFavorites(favoriteIds);
        } else {
          console.log('❌ Failed to load favorites:', result.error);
          setFavorites([]);
        }
      } catch (error) {
        console.error('Load favorites error:', error);
        setFavorites([]);
      }
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    (async () => {
      if (initialRegionLoaded) return;
      try {
        let startRegion;
        
        console.log('🗺️ SearchResults received coords:', coordsFromSearch);
        console.log('📍 SearchType:', searchType);
        console.log('📅 Date range:', { startDateFromParams, endDateFromParams });
        console.log('⚡ Is immediate search:', isImmediate);
        console.log('📋 Booking type from params:', bookingTypeFromParams);
        console.log('🔍 All route params:', route?.params);
        
        if (isImmediate) {
          console.log('🚀 IMMEDIATE SEARCH ACTIVATED:');
          console.log('  - Radius: 700m');
          console.log('  - Duration: 2 hours from now');
          console.log('  - Start:', startDateFromParams ? new Date(startDateFromParams).toLocaleString('he-IL') : 'Not set');
          console.log('  - End:', endDateFromParams ? new Date(endDateFromParams).toLocaleString('he-IL') : 'Not set');
        }
        
        if (coordsFromSearch && (coordsFromSearch.lat || coordsFromSearch.latitude)) {
          // תמיכה בשני פורמטים: lat/lng ו-latitude/longitude
          const lat = coordsFromSearch.lat || coordsFromSearch.latitude;
          const lng = coordsFromSearch.lng || coordsFromSearch.longitude;
          
          console.log('✅ Using provided coordinates:', { lat, lng });
          startRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 };
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
      // TODO: שמירת העדפות בשרת
    })();
  }, []); // 📝 FIXED - removed sortBy dependency

  // WebSocket - התחברות ומאזין לעדכונים
  useEffect(() => {
    // התחברות לWebSocket
    webSocketService.connect();

    // הצטרפות לחדר חיפוש אם יש מיקום
    if (searchCenter) {
      webSocketService.joinSearchRoom({
        lat: searchCenter.latitude,
        lng: searchCenter.longitude,
        radius: 5000 // 5 ק"מ
      });
    }

    // מאזין לעדכוני זמינות
    const handleAvailabilityUpdate = (data) => {
      console.log('🔄 Availability update received:', data);
      
      // הצגת אינדיקטור עדכון
      setAvailabilityUpdateReceived(true);
      
      // רענון מיידי של הנתונים כאשר מקבלים עדכון
      console.log('⚡ Triggering immediate data refresh due to availability update');
      if (lastSearchCenterRef.current) {
        // איפוס זיכרון המיקום כדי לאלץ רענון
        lastSearchCenterRef.current = null;
      }
      
      // הסתרת האינדיקטור אחרי 3 שניות
      setTimeout(() => {
        setAvailabilityUpdateReceived(false);
      }, 3000);
    };

    // מאזין לעדכוני חניות כלליים
    const handleParkingUpdate = (data) => {
      console.log('🔄 Parking update received:', data);
      
      // הצגת אינדיקטור עדכון
      setAvailabilityUpdateReceived(true);
      
      // רענון מיידי של הנתונים כאשר מקבלים עדכון
      console.log('⚡ Triggering immediate data refresh due to parking update');
      if (lastSearchCenterRef.current) {
        // איפוס זיכרון המיקום כדי לאלץ רענון
        lastSearchCenterRef.current = null;
      }
      
      setTimeout(() => {
        setAvailabilityUpdateReceived(false);
      }, 3000);
    };

    webSocketService.addListener('availability-update', handleAvailabilityUpdate);
    webSocketService.addListener('parking-update', handleParkingUpdate);

    // ניקוי בעת יציאה מהמסך
    return () => {
      webSocketService.removeListener('availability-update', handleAvailabilityUpdate);
      webSocketService.removeListener('parking-update', handleParkingUpdate);
    };
  }, [searchCenter]);

  const onRegionChangeComplete = useCallback(async (nextRegion) => {
    console.log('🗺️ onRegionChangeComplete called, new region:', nextRegion);
    setRegion(nextRegion);
    const centerOfViewport = { latitude: nextRegion.latitude, longitude: nextRegion.longitude };
    const moved = haversineMeters(centerOfViewport, searchCenter) > SEARCH_AREA_THRESHOLD_M;
    console.log(`📏 Distance from search center: ${haversineMeters(centerOfViewport, searchCenter).toFixed(1)}m (threshold: ${SEARCH_AREA_THRESHOLD_M}m)`);
    console.log(`🚩 ViewportDirty will be set to: ${moved}`);
    setViewportDirty(moved);
    // TODO: שמירת אזור אחרון בשרת
  }, [searchCenter]);


  useEffect(() => {
    if (!filtersFromAdvanced) return;
    if (typeof filtersFromAdvanced.maxPrice === 'number') setMaxPrice(filtersFromAdvanced.maxPrice);
    if (typeof filtersFromAdvanced.maxDistance === 'number') setMaxDistance(filtersFromAdvanced.maxDistance);
  }, [filtersFromAdvanced]);

  // חניות דמו - הוסרו! עכשיו רק נתונים אמיתיים מהשרת
  const demoSpots = [];

  const [ownerSpots, setOwnerSpots] = useState([]);
  const lastSearchCenterRef = useRef(null); // למעקב אחר הмרכז האחרון שחיפשנו
  
  // טעינת רכבים והעדפות משתמש
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated) {
        setUserVehicles([]);
        setUserPreferences({});
        setVehicleFilterEnabled(false);
        return;
      }

      try {
        const [vehiclesResult, preferencesResult] = await Promise.all([
          getUserVehicles(),
          getUserPreferences()
        ]);

        if (vehiclesResult.success) {
          setUserVehicles(vehiclesResult.data);
          console.log('🚗 Loaded user vehicles:', vehiclesResult.data.length);
        } else {
          console.warn('🚗 Failed to load vehicles:', vehiclesResult.error);
        }

        if (preferencesResult.success) {
          setUserPreferences(preferencesResult.data);
          // אם יש פרמטרים מ-HomeScreen, השתמש בהם. אחרת השתמש בהעדפות
          const shouldEnableFilter = onlyCompatibleFromParams || preferencesResult.data.showOnlyCompatibleParkings || false;
          setVehicleFilterEnabled(shouldEnableFilter);
          console.log('⚙️ Loaded user preferences:', preferencesResult.data);
          console.log('🚗 Vehicle filter from params:', { vehicleSizeFromParams, onlyCompatibleFromParams, shouldEnableFilter });
        } else {
          console.warn('⚙️ Failed to load preferences:', preferencesResult.error);
          // אם נכשל לטעון העדפות, השתמש בפרמטרים מ-HomeScreen או ברירות מחדל
          setUserPreferences({});
          setVehicleFilterEnabled(onlyCompatibleFromParams || false);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    loadUserData();
  }, [isAuthenticated]);

  
  useEffect(() => {
    let isCurrentRequest = true; // למניעת race conditions
    let debounceTimer = null; // למניעת קריאות מרובות מהירות
    
    const loadSpots = async () => {
      try {
        if (!searchCenter) { 
          setOwnerSpots([]); 
          return; 
        }
        
        // בדיקה אם כבר חיפשנו במיקום הזה (אבל לא אם שינינו סינון רכבים)
        const currentCenter = `${searchCenter.latitude?.toFixed(6) || 0},${searchCenter.longitude?.toFixed(6) || 0}`;
        const searchKey = `${currentCenter}-${vehicleFilterEnabled}-${userVehicles.length}`;
        
        if (lastSearchCenterRef.current === searchKey) {
          console.log('🔄 Same search parameters, skipping reload:', searchKey);
          return;
        }
        
        console.log('🚗 Starting new search with parameters:', {
          center: currentCenter,
          vehicleFilterEnabled,
          userVehiclesCount: userVehicles.length,
          searchKey
        });
        
        const baseLat = searchCenter.latitude;
        const baseLng = searchCenter.longitude;
        
        // וודא שיש קואורדינטות תקינות
        if (!baseLat || !baseLng || isNaN(baseLat) || isNaN(baseLng)) {
          console.error('❌ Invalid coordinates:', { baseLat, baseLng });
          console.log('🔄 Trying to use coordsFromSearch as fallback');
          
          // נסה להשתמש ב-coordsFromSearch כ-fallback
          if (coordsFromSearch && coordsFromSearch.lat && coordsFromSearch.lng) {
            console.log('✅ Using coordsFromSearch:', coordsFromSearch);
            setSearchCenter({ 
              latitude: coordsFromSearch.lat, 
              longitude: coordsFromSearch.lng 
            });
            return;
          }
          
          setOwnerSpots([]);
          return;
        }
        
        console.log('🗺️ Loading parkings for center:', { baseLat, baseLng });
        console.log('📍 Search center key:', currentCenter);

        // קריאה לשרת - חיפוש חניות עם פרמטרים מתקדמים
        const searchRadius = radiusMeters ? radiusMeters / 1000 : 15; // המרה למטרים או ברירת מחדל 15 ק"מ
        
        // הכנת פרמטרים לשרת
        const searchParams = {
          lat: baseLat,
          lng: baseLng,
          radius: searchRadius, // רדיוס בק"מ
          searchType: searchType
        };
        
        // עבור חיפוש מיידי, הוסף פרמטרים נוספים
        if (isImmediate && startDateFromParams && endDateFromParams) {
          searchParams.startTime = formatForAPI(startDateFromParams);
          searchParams.endTime = formatForAPI(endDateFromParams);
          searchParams.minDurationHours = minDurationHours;
          searchParams.requireAvailable = true;
          searchParams.checkOwnerAvailability = true;
          searchParams.checkBookingConflicts = true;
          
          console.log('🚀 Adding immediate search parameters:', {
            startDate: new Date(startDateFromParams).toLocaleString('he-IL'),
            endDate: new Date(endDateFromParams).toLocaleString('he-IL'),
            minDurationHours,
            radius: `${searchRadius}km`
          });
        }

        // הוספת פרמטרים לחיפוש עתידי (רק אם לא חיפוש מיידי)
        if (!isImmediate) {
          if (startDateFromParams) searchParams.startTime = formatForAPI(startDateFromParams);
          if (endDateFromParams) searchParams.endTime = formatForAPI(endDateFromParams);
          searchParams.minDurationHours = minDurationHours;
          
          // עבור חיפוש עתידי, הוסף פרמטרי זמינות רק אם יש תאריכים
          if (startDateFromParams && endDateFromParams) {
            searchParams.requireAvailable = true;
            searchParams.checkOwnerAvailability = true;
            searchParams.checkBookingConflicts = true;
            
            console.log('📅 Adding future search parameters:', {
              startDate: new Date(startDateFromParams).toLocaleString('he-IL'),
              endDate: new Date(endDateFromParams).toLocaleString('he-IL'),
              minDurationHours,
              radius: `${searchRadius}km`
            });
          }
        }
        
        if (filtersFromAdvanced?.isCovered) searchParams.isCovered = true;
        if (filtersFromAdvanced?.hasCharging) searchParams.hasCharging = true;
        if (searchType && searchType !== 'general') searchParams.searchType = searchType;

        // הוספת פרמטרי רכב לסינון
        if (vehicleFilterEnabled && userVehicles.length > 0) {
          // אם יש פרמטרים מ-HomeScreen, השתמש בהם
          if (vehicleSizeFromParams && onlyCompatibleFromParams) {
            searchParams.vehicleSize = vehicleSizeFromParams;
            searchParams.onlyCompatible = onlyCompatibleFromParams;
            console.log('🚗 Using vehicle filter from HomeScreen params:', {
              vehicleSize: vehicleSizeFromParams,
              onlyCompatible: onlyCompatibleFromParams
            });
          } else {
            // אחרת השתמש ברכב ברירת המחדל
            const defaultVehicle = getDefaultVehicle(userVehicles);
            if (defaultVehicle && defaultVehicle.vehicleSize) {
              searchParams.vehicleSize = defaultVehicle.vehicleSize;
              searchParams.onlyCompatible = true;
              console.log('🚗 Using default vehicle filter:', {
                vehicleSize: defaultVehicle.vehicleSize,
                licensePlate: defaultVehicle.licensePlate
              });
            }
          }
        }

        console.log('📤 Sending search params:', searchParams);
        console.log('🎯 Search criteria:', {
          location: `${baseLat}, ${baseLng}`,
          radius: `${searchRadius}km`,
          dateRange: startDateFromParams && endDateFromParams ? 
            `${new Date(startDateFromParams).toLocaleString('he-IL')} - ${new Date(endDateFromParams).toLocaleString('he-IL')}` : 
            'No date filter',
          minDuration: `${minDurationHours} hours`,
          searchType: searchType,
          availabilityFilters: {
            requireAvailable: searchParams.requireAvailable,
            checkOwnerAvailability: searchParams.checkOwnerAvailability,
            checkBookingConflicts: searchParams.checkBookingConflicts
          }
        });

        console.log('🚨 IMPORTANT: Server must implement availability filtering!');
        console.log('🚨 Example: Smolenskin 7 should NOT appear if unavailable from 12:00 onwards');
        console.log('🚨 Current search time:', startDateFromParams ? new Date(startDateFromParams).toLocaleTimeString('he-IL') : 'No time specified');

        const response = await api.get('/api/parkings/search', {
          params: searchParams
        });

        let list = response.data?.data || [];
        console.log('🔍 Frontend received parkings:', list.length);
        
        // Debug רק לחניות ללא תמונות
        const parkingsWithoutImages = list.filter(p => !p.entranceImageUrl && !p.emptyImageUrl && !p.withCarImageUrl && (!p.images || p.images.length === 0));
        if (parkingsWithoutImages.length > 0) {
          console.log(`🖼️ Found ${parkingsWithoutImages.length} parkings without images:`, 
            parkingsWithoutImages.map(p => ({ id: p.id, title: p.title }))
          );
        }
        
        // סינון מתקדם בצד הלקוח באמצעות API validation
        if (startDateFromParams && endDateFromParams && list.length > 0) {
          console.log('🔍 Applying advanced client-side availability filtering...');
          console.log('📋 Starting validation for', list.length, 'parkings');
          
          list = await filterAvailableParkings(list, startDateFromParams, endDateFromParams);
          console.log('🔍 After advanced filtering:', list.length, 'parkings remain');
        }
        
        if (list.length === 0) {
          console.log('❌ No available parkings found with current criteria');
          // הודעה ברורה למשתמש
          if (startDateFromParams && endDateFromParams) {
            console.log('💡 Suggestion: Try different time slots or expand search area');
          }
        } else {
          console.log('✅ Found available parkings:', list.map(p => ({ id: p.id, title: p.title })));
        }
        
        // Debug חניה 10 במיוחד
        const parking10 = list.find(p => p.id === 10);
        if (parking10) {
          console.log('🎯 FOUND PARKING 10:', parking10);
          console.log('🖼️ PARKING 10 IMAGES:', parking10.images);
        } else {
          console.log('❌ PARKING 10 NOT FOUND in response');
        }
        
        // פשוט משתמשים ברשימה מהשרת - הרדיוס גדול מספיק (15 ק"מ)
        const mergedList = list;
        console.log(`📋 Using ${mergedList.length} parkings from server (15km radius)`);
        
        // לוג ספציפי לשדה pricing
        mergedList.forEach((parking, index) => {
          console.log(`🎯 Parking ${index + 1} (ID: ${parking.id}):`);
          console.log(`   - title: ${parking.title}`);
          console.log(`   - firstHourPrice: ${parking.firstHourPrice}`);
          console.log(`   - pricing field: ${parking.pricing}`);
          console.log(`   - pricing type: ${typeof parking.pricing}`);
        });

        const mapped = mergedList
          .filter(x => {
            const isValid = x.isActive && typeof x.lat === 'number' && typeof x.lng === 'number';
            
            // פילטור בעלי חניה - לא להציג להם את החניה שלהם
            const isOwner = user?.id && x.ownerId === user.id;
            if (isOwner) {
              console.log(`🚫 Filtering out parking ${x.id} - user ${user.id} is the owner`);
              return false;
            }
            
            console.log(`🔍 Parking ${x.id}: isActive=${x.isActive}, lat=${x.lat}, lng=${x.lng}, valid=${isValid}`);
            return isValid;
          })
          .map(x => {
            console.log(`🔍 Raw parking ${x.id} data:`, x);
            const price = typeof x.firstHourPrice === 'number' ? x.firstHourPrice : 10;
            console.log(`💰 Frontend mapping parking ${x.id}: firstHourPrice=${x.firstHourPrice} (type: ${typeof x.firstHourPrice}), final price=${price}`);
            
            return {
              id: `parking-${x.id}`,
              parkingId: x.id,
              title: x.title || x.address || 'חניה',
              address: x.address || '',
              price: price,
              pricing: x.pricing, // 🎯 העברת המחירון המדורג!
              latitude: x.lat,
              longitude: x.lng,
              images: x.images || [], // 🖼️ תמונות במבנה ישן
              // תמונות מהשרת - מבנה חדש
              entranceImageUrl: x.entranceImageUrl,
              emptyImageUrl: x.emptyImageUrl,
              withCarImageUrl: x.withCarImageUrl,
              additionalImageUrl: x.additionalImageUrl,
              distanceKm: haversineKm(baseLat, baseLng, x.lat, x.lng),
              source: 'server',
              available: x.available !== false,
            };
          });

        console.log(`🎯 Frontend mapped ${mapped.length} parkings`);
        
        // לוג לאחר המיפוי
        mapped.forEach((parking, index) => {
          console.log(`🎯 Mapped parking ${index + 1}:`);
          console.log(`   - id: ${parking.id}`);
          console.log(`   - title: ${parking.title}`);
          console.log(`   - price: ${parking.price}`);
          console.log(`   - pricing: ${parking.pricing}`);
        });

        // עדכון רק אם זה עדיין הבקשה הנוכחית
        if (isCurrentRequest) {
          lastSearchCenterRef.current = searchKey; // שמירת פרמטרי החיפוש שביצענו
          setOwnerSpots(mapped);
        }
      } catch (error) {
        console.error('Search error:', error);
        if (isCurrentRequest) {
          setOwnerSpots([]);
        }
      }
    };
    
    // debounce - חכה 150ms לפני קריאה לשרת (הקטנו לחווית משתמש טובה יותר)
    debounceTimer = setTimeout(() => {
      if (isCurrentRequest) {
        console.log('⏱️ Debounce complete, loading spots...');
        loadSpots();
      }
    }, 150);
    
    // cleanup function למניעת race conditions
    return () => {
      isCurrentRequest = false;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [searchCenter, vehicleFilterEnabled, userVehicles]);

  const spotsRaw = useMemo(() => {
    const base = [...demoSpots];
    if (showOwnerListings) base.push(...ownerSpots);
    return base;
  }, [demoSpots, ownerSpots, showOwnerListings]);

  const spots = useMemo(() => {
    let arr = [...spotsRaw];
    const filt = filtersFromAdvanced || {};
    const priceCap = filt.maxPrice ?? null;
    const distCap  = filt.maxDistance ?? null;

    // 📝 NEW - סינון לפי רדיוס מכפתור "סביבי"
    if (radiusMeters != null) {
      const radiusKm = radiusMeters / 1000; // המרה למטרים לקילומטרים
      console.log(`🎯 Filtering by radius: ${radiusKm}km (${radiusMeters}m)`);
      const beforeCount = arr.length;
      arr = arr.filter(s => s.distanceKm <= radiusKm);
      console.log(`📊 Filtered from ${beforeCount} to ${arr.length} parkings`);
    }

    if (priceCap != null) arr = arr.filter(s => s.price <= priceCap);
    if (distCap  != null) arr = arr.filter(s => s.distanceKm <= distCap);
    // 📝 CHANGED - מיון הפוך לפי מרחק - הרחוקה ראשונה, הקרובה אחרונה
    arr.sort((a, b) => b.distanceKm - a.distanceKm);
    console.log('🔄 Sorted parkings by distance (farthest first):', arr.map(p => `${p.title}: ${p.distanceKm.toFixed(2)}km`));
    return arr;
  }, [spotsRaw, filtersFromAdvanced, radiusMeters]); // 📝 FIXED - added radiusMeters dependency

  const toggleFavorite = useCallback(async (spot) => {
    console.log('🚀 toggleFavorite called:', spot);
    await Haptics.selectionAsync();
    const parkingId = Number(spot.parkingId || spot.id);
    const exists = favorites.includes(parkingId);
    
    console.log('📊 Toggle favorite - parkingId:', parkingId, 'exists:', exists, 'favorites:', favorites);
    
    try {
      if (exists) {
        // הסרת מועדף - נסה קודם מהשרת, אחר כך Anonymous
        const result = await removeFavorite(parkingId);
        if (result.success) {
          setFavorites(prev => prev.filter(id => id !== parkingId));
          console.log('✅ Favorite removed successfully:', parkingId);
        } else {
          console.error('❌ Failed to remove favorite:', result.error);
        }
      } else {
        // הוספת מועדף - נסה קודם מהשרת, אחר כך Anonymous
        const result = await addFavorite(parkingId);
        if (result.success) {
          setFavorites(prev => [...prev, parkingId]);
          console.log('✅ Favorite added successfully:', parkingId);
        } else {
          console.error('❌ Failed to add favorite:', result.error);
        }
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      // TODO: הצגת שגיאה למשתמש
    }
  }, [favorites]);

  const onSelectSpot = useCallback(async (spot) => {
    try {
      console.log('🗺️ onSelectSpot called:', spot);
      setSelectedId(spot.id);
      
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (hapticsError) {
        console.log('⚠️ Haptics not available:', hapticsError.message);
      }
      
      if (mapRef.current) {
        const latitude = spot.latitude || spot.lat;
        const longitude = spot.longitude || spot.lng;
        console.log('📍 Moving map to:', { latitude, longitude });
        if (latitude && longitude) {
          mapRef.current.animateToRegion(
            { latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
            400
          );
        } else {
          console.log('❌ No valid coordinates found');
        }
      } else {
        console.log('❌ mapRef not available');
      }
      
      if (cardsScrollRef.current) {
        const idx = spots.findIndex(s => s.id === spot.id);
        if (idx >= 0) {
          const x = idx * (CARD_WIDTH + 12);
          cardsScrollRef.current.scrollTo({ x, y: 0, animated: true });
        }
      }
    } catch (error) {
      console.error('❌ onSelectSpot error:', error);
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
    try {
      console.log('🔍 searchByViewport called, region:', region);
      if (!region) {
        console.log('❌ No region available');
        return;
      }
      
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (hapticsError) {
        console.log('⚠️ Haptics not available:', hapticsError.message);
      }
      
      const nextCenter = { latitude: region.latitude, longitude: region.longitude };
      console.log('📍 Setting new search center:', nextCenter);
      console.log('🔄 Previous search center was:', searchCenter);
      
      setSearchCenter(nextCenter);
      setQuery('חיפוש באזור המפה');
      setSelectedId(null);
      setViewportDirty(false);
      
      // מרכוז המפה למיקום החדש (החזרת הנעץ למרכז)
      if (mapRef.current) {
        console.log('🎯 Centering map to new search location');
        mapRef.current.animateToRegion(
          { 
            ...nextCenter, 
            latitudeDelta: region?.latitudeDelta ?? 0.02, 
            longitudeDelta: region?.longitudeDelta ?? 0.02 
          },
          500
        );
      }
      
      // עדכון רדיוס החיפוש - עכשיו 5 ק"מ במקום הרדיוס המקורי (הגדלנו מ-2.5)
      setRadiusMeters(5000);
      console.log('🔄 Updated radius to 5km for viewport search');
      console.log('⚡ This will trigger useEffect to reload spots after 150ms debounce');
    } catch (error) {
      console.error('❌ searchByViewport error:', error);
    }
  }, [searchCenter]); // הסרנו region מהdependencies כי זה גורם לקריאות לא רצויות

  // // 📝 REMOVED - clearFilters function no longer needed

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
            description={`₪${spot.price}/שעה ראשונה • ${spot.distanceKm.toFixed(2)} ק״מ${spot.source === 'owner' ? ' • בעל חניה' : ''}`}
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

      {/* // 📝 REMOVED - סרגל המסננים העליון הוסר לפי בקשה */}

      {/* באדג׳ טווח זמן (אם קיים) */}
      {!!timeBadge && (
        <View style={styles.timeBadge}>
          <Ionicons name="time-outline" size={14} color="#fff" style={{ marginStart: 6 }} />
          <Text style={styles.timeBadgeText} numberOfLines={1}>{timeBadge}</Text>
        </View>
      )}

      {/* כפתור סינון רכבים */}
      {isAuthenticated && userVehicles.length > 0 && (
        <View style={styles.vehicleFilterContainer}>
          <TouchableOpacity
            style={[styles.vehicleFilterButton, vehicleFilterEnabled && styles.vehicleFilterButtonActive]}
            onPress={() => setVehicleFilterEnabled(!vehicleFilterEnabled)}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={vehicleFilterEnabled ? "car" : "car-outline"} 
              size={16} 
              color={vehicleFilterEnabled ? "#fff" : theme.colors.primary} 
            />
            <Text style={[
              styles.vehicleFilterText,
              vehicleFilterEnabled && styles.vehicleFilterTextActive
            ]}>
              {vehicleFilterEnabled ? 'מסנן לפי הרכב שלי' : 'סנן לפי הרכב שלי'}
            </Text>
          </TouchableOpacity>
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
          <View style={styles.searchViewportContent}>
            <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
            <View style={styles.searchTextContainer}>
              <Text style={styles.searchViewportText}>עברת לאזור חדש במפה</Text>
              <Text style={styles.searchHintText}>💡 לחיצה ארוכה מציבה נעץ סגול</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.searchViewportBtn} onPress={searchByViewport} activeOpacity={0.8}>
            <Ionicons name="search" size={16} color="#fff" style={{ marginEnd: 6 }} />
            <Text style={styles.searchViewportBtnText}>חפש כאן</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* אינדיקטור עדכון זמינות בזמן אמת */}
      {availabilityUpdateReceived && (
        <View style={styles.availabilityUpdateBar}>
          <View style={styles.availabilityUpdateContent}>
            <Ionicons name="wifi" size={16} color="#10B981" />
            <Text style={styles.availabilityUpdateText}>זמינות חניות עודכנה</Text>
          </View>
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
              <Ionicons name="time-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
              <Text style={styles.cardTitle}>לא נמצאו חניות זמינות</Text>
              <Text style={styles.cardLine}>
                אין חניות זמינות כרגע באזור זה.{'\n'}
                נסו לחפש באזור אחר או בזמן אחר.
              </Text>
              <View style={styles.noResultsHint}>
                <Ionicons name="bulb-outline" size={16} color="#0b6aa8" />
                <Text style={styles.noResultsHintText}>
                  💡 החניות מוצגות רק כשהן זמינות לפי הגדרות בעל החניה
                </Text>
              </View>
            </View>
          ) : (
            spots.map(spot => {
              const parkingId = Number(spot.parkingId || spot.id);
              const liked = favorites.includes(parkingId);
              
              // תיקון URL של התמונות - השתמש בתמונות מהשרת
              let thumb = spot.images?.[0]?.uri || spot.entranceImageUrl || spot.emptyImageUrl || spot.withCarImageUrl;
              if (thumb && thumb.startsWith('/api/')) {
                thumb = `${API_BASE}${thumb}`;
              }
              
              const isActive = spot.id === selectedId;
              
              // Debug לוג לתמונות - רק אם אין תמונה
              if (!thumb) {
                console.log(`🖼️ DEBUG: No image for parking ${spot.id} (${spot.title}):`, {
                  images: spot.images,
                  entranceImageUrl: spot.entranceImageUrl,
                  emptyImageUrl: spot.emptyImageUrl,
                  withCarImageUrl: spot.withCarImageUrl
                });
              }
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

                  {thumb ? (
                    <Image 
                      source={{ uri: thumb }} 
                      style={styles.cardImg}
                      onError={(error) => {
                        console.log('🚨 Image load error:', error.nativeEvent.error);
                        console.log('🚨 Image URI:', thumb);
                      }}
                      onLoad={() => {
                        console.log('✅ Image loaded successfully:', thumb);
                      }}
                    />
                  ) : (
                    <View style={[styles.cardImg, styles.placeholderImg]}>
                      <Text style={styles.placeholderText}>📷</Text>
                    </View>
                  )}

                  {/* כותרת לשמאל; תגית + לב בצד ימין */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.titleWithAvailability}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{spot.title || spot.address}</Text>
                      {/* אינדיקטור זמינות */}
                      <View style={styles.availabilityIndicator}>
                        <View style={styles.availabilityDot} />
                        <Text style={styles.availabilityText}>זמין עכשיו</Text>
                      </View>
                    </View>
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
                    ₪{spot.price}/שעה ראשונה • {spot.distanceKm.toFixed(2)} ק״מ{spot.source === 'owner' ? ' • בעל חניה' : ''}
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
                      onPress={async () => {
                        try {
                          console.log('🏷️ Pricing button clicked for parking:', spot.parkingId);
                          // קבלת מחירון מפורט מהשרת
                          const response = await api.get(`/api/parkings/${spot.parkingId}`);
                          const parking = response.data?.data;
                          console.log('🏷️ Parking data received:', parking);
                          
                          let pricingText = `מחיר לפי שעות:\n• שעה ראשונה: ₪${spot.price}`;
                          
                          if (parking?.pricing) {
                            try {
                              const pricingData = typeof parking.pricing === 'string' ? JSON.parse(parking.pricing) : parking.pricing;
                              console.log('🏷️ Parsed pricing data:', pricingData);
                              if (pricingData && typeof pricingData === 'object') {
                                // הצגת כל 12 השעות
                                const validPrices = [];
                                for (let hour = 1; hour <= 12; hour++) {
                                  const hourKey = `hour${hour}`;
                                  const hourValue = pricingData[hourKey];
                                  
                                  // טיפול גם ב-string וגם ב-number
                                  if (hourValue !== undefined && hourValue !== null) {
                                    const price = typeof hourValue === 'string' ? parseFloat(hourValue) : hourValue;
                                    if (!isNaN(price)) {
                                      validPrices.push({ hour, price });
                                    }
                                  }
                                }
                                
                                // בניית הטקסט
                                if (validPrices.length > 0) {
                                  console.log('🏷️ Valid prices found:', validPrices);
                                  pricingText = 'מחירון מפורט:\n';
                                  validPrices.forEach(({ hour, price }) => {
                                    if (price === 0) {
                                      pricingText += `• שעה ${hour}: חינם\n`;
                                    } else {
                                      pricingText += `• שעה ${hour}: ₪${price}\n`;
                                    }
                                  });
                                  // הסרת השורה האחרונה
                                  pricingText = pricingText.trim();
                                } else {
                                  console.log('🏷️ No valid prices found');
                                }
                                
                                // אם לא מצאנו מחירים, נציג הודעה
                                if (pricingText === `מחיר לפי שעות:\n• שעה ראשונה: ₪${spot.price}`) {
                                  pricingText += '\n• שעות נוספות: לפי מחירון בעל החניה';
                                }
                              } else {
                                pricingText += '\n• שעות נוספות: לפי מחירון בעל החניה';
                              }
                            } catch (error) {
                              console.error('Failed to parse pricing data:', error);
                              pricingText += '\n• שעות נוספות: לפי מחירון בעל החניה';
                            }
                          } else {
                            pricingText += '\n• שעות נוספות: לפי מחירון בעל החניה';
                          }
                          
                          console.log('🏷️ Final pricing text:', pricingText);
                          Alert.alert('מחירון מפורט', pricingText, [{ text: 'הבנתי', style: 'default' }]);
                        } catch (error) {
                          console.error('Failed to fetch pricing details:', error);
                          Alert.alert(
                            'מחירון מפורט',
                            `מחיר לפי שעות:\n• שעה ראשונה: ₪${spot.price}\n• שעות נוספות: לפי מחירון בעל החניה`,
                            [{ text: 'הבנתי', style: 'default' }]
                          );
                        }
                      }}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel="הצג מחירון מפורט"
                    >
                      <Ionicons name="pricetag" size={16} color={theme.colors.primary} />
                      <Text style={styles.cardBtnOutlineText} numberOfLines={1}>מחירון</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardBtnOutline, { flex:1 }]}
                      onPress={() => {
                        // שימוש ב-AuthGate לבדיקת הרשאה לפני הזמנת חניה
                        attemptAction(
                          ACTIONS_REQUIRING_AUTH.BOOK_PARKING,
                          () => {
                            // המשתמש מחובר - בצע הזמנה
                            console.log('🔍 User authenticated, proceeding with booking:', spot);
                            
                            // קביעת סוג ההזמנה ופרמטרים נוספים
                            // עדיפות לפרמטר מפורש, אחר כך לפי isImmediate
                            const bookingType = bookingTypeFromParams || 
                              (isImmediate ? BOOKING_TYPES.IMMEDIATE : BOOKING_TYPES.FUTURE);
                            
                            const bookingParams = {
                              spot: {
                                id: spot.id,
                                parkingId: spot.parkingId,
                                ...spot,
                                title: spot.title || spot.address,
                                ownerListingId: spot.ownerListingId ?? null,
                                availability: spot.availability ?? null,
                                requireApproval: !!spot.requireApproval,
                              },
                              bookingType: bookingType
                            };
                            
                            // אם זה הזמנה עתידית, העבר את פרמטרי הזמן מהחיפוש
                            if (bookingType === BOOKING_TYPES.FUTURE && startDateFromParams && endDateFromParams) {
                              bookingParams.searchStartDate = startDateFromParams;
                              bookingParams.searchEndDate = endDateFromParams;
                              console.log('📅 Future booking with predefined times:', {
                                start: new Date(startDateFromParams).toLocaleString('he-IL'),
                                end: new Date(endDateFromParams).toLocaleString('he-IL')
                              });
                            }
                            
                            // אם זה הזמנה מיידית, העבר את משך הזמן המבוקש
                            if (bookingType === BOOKING_TYPES.IMMEDIATE) {
                              bookingParams.immediateDuration = 2; // שעתיים כברירת מחדל
                              console.log('⚡ Immediate booking with 2 hours duration');
                            }
                            
                            console.log('🚀 Navigating to BookingScreen with params:', bookingParams);
                            navigation.navigate('Booking', bookingParams);
                          }
                        );
                      }}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel="הזמן עכשיו"
                    >
                      <Text style={styles.cardBtnOutlineText} numberOfLines={1}>הזמן עכשיו</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardBtnWaze, { flex:1 }]}
                      onPress={() => openWaze(spot.latitude || spot.lat, spot.longitude || spot.lng, spot.title || spot.address || 'Zpoto')}
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

    // Filters - עיצוב חדש נקי
    filtersBar:{
      position:'absolute', top:16, left:12, right:12,
      paddingVertical:12, borderRadius:16, overflow:'hidden',
      shadowColor:'#000', shadowOpacity:0.15, shadowRadius:12, shadowOffset:{ width:0, height:4 }, elevation:5,
    },
    filtersContent:{
      paddingHorizontal: 16, alignItems:'center', flexDirection:'row-reverse', gap:12,
    },
    countBadge:{
      backgroundColor: colors.primary,
      paddingHorizontal:16, paddingVertical:8, borderRadius:12,
      flexDirection:'column', alignItems:'center', marginLeft:8,
    },
    countBadgeText:{ color:'#fff', fontSize:20, fontWeight:'800', lineHeight:24 },
    countBadgeLabel:{ color:'#fff', fontSize:11, fontWeight:'600', opacity:0.9 },
    filterSection:{
      flexDirection:'row-reverse', alignItems:'center', gap:8,
    },
    filterLabel:{
      fontSize:20, marginLeft:4,
    },
    filterGroup:{
      flexDirection:'row-reverse', gap:6,
    },
    sortButton:{
      flexDirection:'row-reverse', alignItems:'center', gap:8,
      paddingHorizontal:16, paddingVertical:10, borderRadius:10,
      backgroundColor:'rgba(127,147,255,0.1)',
      borderWidth:1.5, borderColor:colors.primary,
    },
    sortButtonText:{
      color:colors.primary, fontWeight:'600', fontSize:13,
    },
    clearBtnNew:{
      width:36, height:36, borderRadius:18,
      backgroundColor:'rgba(239,68,68,0.1)',
      justifyContent:'center', alignItems:'center',
      marginRight:8,
    },

    // Time badge (optional)
    timeBadge:{
      position:'absolute', top:64, right:16,
      backgroundColor:'rgba(0,0,0,0.45)', paddingVertical:6, paddingHorizontal:10,
      borderRadius:999, borderWidth:1, borderColor:'rgba(255,255,255,0.18)', flexDirection:'row-reverse', alignItems:'center'
    },
    timeBadgeText:{ color:'#fff', fontWeight:'800', textAlign:'right', writingDirection:'rtl' },

    // chips - עיצוב חדש נקי
    chipWrapper:{ borderRadius:10 },
    chip:{
      paddingHorizontal:16, paddingVertical:8, borderRadius:10,
      minHeight:36, justifyContent:'center', alignItems:'center'
    },
    chipIdle:{
      borderWidth:1.5, borderColor:colors.border, backgroundColor:'rgba(255,255,255,0.7)',
    },
    chipActive:{
      backgroundColor: colors.primary,
      borderWidth:0,
    },
    chipText:{ color:colors.text, fontWeight:'600', fontSize:13 },
    chipTextActive:{ color:'#fff', fontWeight:'700', fontSize:13 },

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

    // recenter FAB — עבר לשמאל (הוגבה כדי לא להיחסם על ידי הכרטיסיות)
    fab:{
      position:'absolute', left:18, bottom:Platform.select({ ios: 200, android: 190 }), width:56, height:56, borderRadius:28,
      alignItems:'center', justifyContent:'center',
      overflow:'hidden',
      shadowColor:colors.gradientStart, shadowOpacity:0.45, shadowRadius:16, shadowOffset:{ width:0, height:8 }, elevation:6
    },

    // viewport dirty bar - שיפור תצוגה ברורה יותר
    searchViewportBar:{
      position:'absolute', top:25, left:12, right:12,
      backgroundColor:'#ffffff', borderRadius:16, borderWidth:2, borderColor: colors.primary + '40',
      padding:16, flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between',
      shadowColor:'#000', shadowOpacity:0.15, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:8
    },
    searchViewportContent:{
      flexDirection:'row-reverse', alignItems:'center', flex:1, gap:8
    },
    searchTextContainer: {
      flex: 1,
    },
    searchViewportText:{ 
      color: colors.text, fontWeight:'700', fontSize: 15, textAlign:'right', writingDirection:'rtl' 
    },
    searchHintText: {
      color: colors.text + '80', fontSize: 12, textAlign:'right', writingDirection:'rtl', marginTop: 2
    },
    searchViewportBtn:{ 
      backgroundColor: colors.primary, paddingVertical:12, paddingHorizontal:16, borderRadius:12,
      flexDirection:'row-reverse', alignItems:'center',
      shadowColor: colors.primary, shadowOpacity:0.3, shadowRadius:6, shadowOffset:{ width:0, height:3 }
    },
    searchViewportBtnText:{ color:'#fff', fontWeight:'700', fontSize: 14, textAlign:'right', writingDirection:'rtl' },

    // אינדיקטור עדכון זמינות
    availabilityUpdateBar:{
      position:'absolute', top:120, left:12, right:12,
      backgroundColor:'#10B981', borderRadius:12,
      padding:12, flexDirection:'row-reverse', alignItems:'center', justifyContent:'center',
      shadowColor:'#000', shadowOpacity:0.15, shadowRadius:8, shadowOffset:{ width:0, height:4 }, elevation:6
    },
    availabilityUpdateContent:{
      flexDirection:'row-reverse', alignItems:'center', gap:8
    },
    availabilityUpdateText:{ 
      color:'#fff', fontWeight:'700', fontSize:14, textAlign:'right', writingDirection:'rtl' 
    },

    // bottom cards
    cardsWrap:{ position:'absolute', bottom:22, left:0, right:0 },
    cardsContent:{ paddingHorizontal: 12, flexDirection:'row-reverse' },
    card:{
      width: cardWidth, marginEnd:12, backgroundColor:'#fff', borderRadius:14, padding:12,
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
    titleWithAvailability:{ flex:1 },
    cardTitle:{ fontSize:16, fontWeight:'800', marginBottom:2, color:'#0b0f14', textAlign:'left' },
    cardLine:{ fontSize:14, color:'#333', textAlign:'left' },
    
    // אינדיקטור זמינות
    availabilityIndicator:{ 
      flexDirection:'row', 
      alignItems:'center', 
      marginTop:2 
    },
    availabilityDot:{ 
      width:6, 
      height:6, 
      borderRadius:3, 
      backgroundColor:'#10B981', 
      marginRight:4 
    },
    availabilityText:{ 
      fontSize:11, 
      color:'#10B981', 
      fontWeight:'600' 
    },

    // Placeholder image styles
    placeholderImg: {
      backgroundColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 24,
      opacity: 0.5,
    },
    
    // הודעת "אין תוצאות"
    noResultsHint:{ 
      flexDirection:'row', 
      alignItems:'center', 
      backgroundColor:'#f0f7ff', 
      padding:8, 
      borderRadius:8, 
      marginTop:12,
      gap:6
    },
    noResultsHintText:{ 
      fontSize:12, 
      color:'#0b6aa8', 
      flex:1,
      textAlign:'center'
    },

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

    // כפתור סינון רכבים
    vehicleFilterContainer:{
      position:'absolute', 
      top: 110, 
      right: 16,
      zIndex: 1000
    },
    vehicleFilterButton:{
      flexDirection:'row-reverse', 
      alignItems:'center', 
      gap: 8,
      backgroundColor:'rgba(255,255,255,0.95)', 
      paddingVertical: 8, 
      paddingHorizontal: 12, 
      borderRadius: 20,
      borderWidth: 1, 
      borderColor: colors.primary,
      shadowColor:'#000', 
      shadowOpacity:0.1, 
      shadowRadius:4, 
      shadowOffset:{ width:0, height:2 }, 
      elevation:3
    },
    vehicleFilterButtonActive:{
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    vehicleFilterText:{
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary
    },
    vehicleFilterTextActive:{
      color: '#fff'
    },
  });
}

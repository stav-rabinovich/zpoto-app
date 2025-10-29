// screens/HomeScreen.js
// תיקון שגיאה + עדכון חיפושים אחרונים:
// - מיגרציה: אם נשמרו בעבר אובייקטים {label, ts} – ממירים למחרוזות ושומרים חזרה.
// - צ'יפים לבנים עם טקסט שחור ומסגרת בגוון המותג.
// - האייקון (שעון) מימין, טקסט מיושר לימין, חץ משמאל.
// - צ'יפים קטנים יותר.
// - אין תאריך/שעה (לא נשמר ולא מוצג).

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Alert,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Animated,
  Switch,
  SafeAreaView,
} from 'react-native';
import TimePickerWheel, { roundTo15Minutes } from '../components/ui/TimePickerWheel';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { openWaze } from '../utils/nav';
import { getSavedPlaces, deleteSavedPlace } from '../services/api/guestService';
import { useTheme } from '@shopify/restyle';
import { useAuthGate } from '../components/AuthGate';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../utils/api';
import { osmAutocomplete } from '../utils/osm';
import { getRecentSearches, saveRecentSearch, clearRecentSearches, getActiveBookings } from '../services/api/searchService';
import { formatForAPI, prepareSearchParams, addHoursInIsrael } from '../utils/timezone';
import { handleNearMeSearch, navigationActions } from '../utils/navigationHelpers';
import { BOOKING_TYPES, isImmediateBooking } from '../constants/bookingTypes';

function msToHhMmSs(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

// הוסרנו RECENTS_KEY - עובדים רק מהשרת
const RECENTS_MAX = 5;
// הוסרנו SAVED_PLACES_KEY - עובדים רק מהשרת

// קומפוננטת כפתור ניהול פרופיל עם AuthGate
const ProfileManagementButton = ({ styles }) => {
  const { attemptProfileAccess } = useAuthGate();
  const navigation = useNavigation();

  const handleManagementPress = async () => {
    await attemptProfileAccess(
      () => {
        // אם המשתמש מחובר, נווט ישירות לפרופיל
        navigation.navigate('Profile');
      },
      'saved_places_management' // מקור הלחיצה
    );
  };

  return (
    <TouchableOpacity
      onPress={handleManagementPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.blockLink}>ניהול</Text>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const { user, isAuthenticated } = useAuth();

  // רקע “חי” עדין
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 4200, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 4200, useNativeDriver: false }),
      ])
    ).start();
  }, [glow]);

  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState([]); // תמיד מחרוזות
  const [savedPlaces, setSavedPlaces] = useState([]);

  const [activeBooking, setActiveBooking] = useState(null);
  const [leftMs, setLeftMs] = useState(0);
  const timerRef = useRef(null);

  // הצעות
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const inputRef = useRef(null);
  const suggestTimer = useRef(null);

  // תאריכים ושעות - משופר עם TimePickerWheel
  const [startDate, setStartDate] = useState(() => roundTo15Minutes(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const start = roundTo15Minutes(new Date());
    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
    const end = addHoursInIsrael(start, 1); // מינימום שעה
    return roundTo15Minutes(end);
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // מסננים
  const [isCovered, setIsCovered] = useState(false);
  const [hasCharging, setHasCharging] = useState(false);

  // מיקום נבחר
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedCoords, setSelectedCoords] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        try {
          // טעינת חיפושים אחרונים עם Anonymous API
          const result = await getRecentSearches();
          if (result.success) {
            // שמור את כל הנתונים כולל קואורדינטות
            const searches = result.data.map(search => ({
              query: search.query,
              coords: search.coords || null,
              label: search.query // לתאימות לאחור
            }));
            setRecents(searches);
          } else {
            setRecents([]);
          }
        } catch (error) {
          console.error('Load recent searches error:', error);
          setRecents([]);
        }
        
        try {
          // טעינת מקומות שמורים עם Anonymous API
          const result = await getSavedPlaces();
          if (result.success) {
            setSavedPlaces(result.data);
          } else {
            setSavedPlaces([]);
          }
        } catch (error) {
          console.error('Load saved places error:', error);
          setSavedPlaces([]);
        }
      } catch {}
    })();
  }, []);

  const loadActive = useCallback(async () => {
    try {
      // קריאה להזמנות פעילות עם Anonymous API (רק אם יש משתמש מחובר)
      const result = await getActiveBookings();
      if (result.success) {
        const activeBookings = result.data || [];
        const now = new Date();
        
        if (activeBookings.length > 0) {
          const active = activeBookings[0]; // הראשונה ברשימה
          setActiveBooking(active);
          setLeftMs(new Date(active.endTime) - now);
        } else {
          setActiveBooking(null);
          setLeftMs(0);
        }
      } else {
        // בדיקה אם המשתמש חסום - במקרה הזה לא מציגים הודעת שגיאה
        if (result.isUserBlocked) {
          console.log('🚫 User blocked - hiding active bookings silently');
        }
        
        // אם אין הרשאה או שגיאה - פשוט לא מציגים הזמנות פעילות
        setActiveBooking(null);
        setLeftMs(0);
      }
    } catch (error) {
      console.error('Load active booking error:', error);
      setActiveBooking(null);
      setLeftMs(0);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadActive);
    loadActive();
    return unsub;
  }, [navigation, loadActive]);

  useEffect(() => {
    if (!activeBooking) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setLeftMs(prev => {
        const next = prev - 1000;
        return next > 0 ? next : 0;
      });
    }, 1000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [activeBooking]);

  const persistRecents = useCallback(async (nextList) => {
    // הוסרנו שמירה מקומית - רק שרת
  }, []);

  const saveRecents = useCallback(async (q, coords = null) => {
    try {
      // שמירה בשרת עם Anonymous API (כולל קואורדינטות)
      // תמיד שלח כמחרוזת - השרת מצפה למחרוזת פשוטה
      const result = await saveRecentSearch(q);
      
      if (result.success) {
        // עדכון מקומי אחרי הצלחה
        const currentSearches = recents.filter(Boolean);
        const filtered = currentSearches.filter(item => {
          const itemQuery = typeof item === 'string' ? item : item.query;
          return itemQuery.toLowerCase() !== q.toLowerCase();
        });
        
        const newSearch = { query: q, coords, label: q };
        const next = q ? [newSearch, ...filtered].slice(0, RECENTS_MAX) : filtered.slice(0, RECENTS_MAX);

        setRecents(next);
      }
    } catch (error) {
      console.error('Save recent search error:', error);
    }
  }, [recents]);

  const removeRecentAt = useCallback(async (index) => {
    try {
      const next = recents.filter((_, i) => i !== index);
      setRecents(next);
      await persistRecents(next);
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    } catch {}
  }, [recents, persistRecents]);

  const runSearch = async (q, coordsOverride = null) => {
    if (!q?.trim()) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: שמירת חיפוש אחרון בשרת
    Keyboard.dismiss();
    setSuggestOpen(false);

    let target = coordsOverride;
    if (!target && q.length > 0) {
      // TODO: geocoding לכתובת
    }

    await saveRecents(q);
    
    navigation.navigate('SearchResults', {
      query: q,
      coords: target,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      searchType: 'future', // חיפוש עתידי
      bookingType: BOOKING_TYPES.FUTURE, // סוג הזמנה עתידית
      filters: {
        isCovered,
        hasCharging,
      },
    });
  };

  const handleSearch = useCallback(async () => {
    await runSearch(query);
  }, [runSearch, query]);

  // חיפוש סביבי מיידי (עם רדיוס 700 מטר ל-2.5 שעות) - משתמש בhelper משותף
  const handleNearMe = useCallback(async () => {
    await handleNearMeSearch(navigation, 700, true, 2.5);
  }, [navigation]);

  // הצעות חיפוש בזמן כתיבה - משופר עם חיפושים אחרונים
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const q = query.trim();
    
    // אם יש מיקום נבחר, לא לחפש הצעות
    if (selectedLocation) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }
    
    // אם אין טקסט - הסתר הצעות
    if (q.length === 0) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }
    
    // אם טקסט קצר מדי - נקה הצעות
    if (q.length < 2) { 
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }
    
    // הגדרת timeout קצר יותר לחוויה מהירה יותר
    suggestTimer.current = setTimeout(async () => {
      try {
        console.log('🔍 Searching for:', q);
        
        // הצגת אינדיקטור טעינה
        setSuggestLoading(true);
        setSuggestOpen(true);
        setSuggestions([]);
        
        // חיפוש בחיפושים אחרונים תחילה
        const matchingRecents = recents
          .filter(search => {
            const searchQuery = typeof search === 'string' ? search : search.query;
            return searchQuery.toLowerCase().includes(q.toLowerCase());
          })
          .slice(0, 3)
          .map((search, index) => {
            const searchQuery = typeof search === 'string' ? search : search.query;
            const searchCoords = typeof search === 'string' ? null : search.coords;
            
            return {
              id: `recent-match-${index}`,
              display_name: searchQuery,
              description: searchQuery,
              type: 'recent',
              isRecent: true,
              // הוסף קואורדינטות אם יש
              lat: searchCoords?.lat,
              lng: searchCoords?.lng
            };
          });
        
        // חיפוש ב-OSM
        const res = await osmAutocomplete(q, { 
          limit: 8, // יותר תוצאות
          language: 'he' 
        });
        
        console.log('📋 Search results:', res?.length || 0, 'items');
        
        const osmResults = (res || []).map(item => ({
          ...item,
          type: 'osm',
          isRecent: false,
          isBusiness: !!(item.businessName) // זיהוי מקומות מוכרים
        }));
        
        // שילוב התוצאות - חיפושים אחרונים תחילה
        const combinedResults = [...matchingRecents, ...osmResults];
        
        setSuggestions(combinedResults);
        setSuggestOpen(combinedResults.length > 0);
        setSuggestLoading(false);
        
      } catch (error) {
        console.error('❌ Search error:', error);
        setSuggestions([]);
        setSuggestOpen(false);
        setSuggestLoading(false);
      }
    }, 300); // קצת יותר ארוך לחיפוש יציב יותר
    
    return () => suggestTimer.current && clearTimeout(suggestTimer.current);
  }, [query, recents]);

  const onPickSuggestion = async (item) => {
    const label = item.description || item.display_name || query;
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    console.log('📍 Selected suggestion item:', item);

    // נסה לחלץ קואורדינטות מפורמטים שונים
    let coords = null;
    
    if (item.lat && item.lon) {
      coords = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    } else if (item.lat && item.lng) {
      coords = { lat: parseFloat(item.lat), lng: parseFloat(item.lng) };
    } else if (item.latitude && item.longitude) {
      coords = { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) };
    } else if (item.geometry && item.geometry.location) {
      coords = { lat: item.geometry.location.lat, lng: item.geometry.location.lng };
    } else if (item.center) {
      coords = { lat: item.center[1], lng: item.center[0] }; // GeoJSON format
    }

    console.log('📍 Extracted coordinates:', coords);
    
    // אם זה חיפוש אחרון ואין קואורדינטות, נסה לחפש אותן
    if (item.isRecent && !coords) {
      console.log('🔍 Recent search without coordinates, trying to geocode...');
      try {
        // נסה לחפש קואורדינטות עבור החיפוש האחרון
        const geocodeResults = await osmAutocomplete(label, { limit: 1, language: 'he' });
        if (geocodeResults && geocodeResults.length > 0) {
          const firstResult = geocodeResults[0];
          if (firstResult.lat && firstResult.lon) {
            coords = { lat: parseFloat(firstResult.lat), lng: parseFloat(firstResult.lon) };
            console.log('✅ Found coordinates for recent search:', coords);
          }
        }
      } catch (error) {
        console.error('❌ Failed to geocode recent search:', error);
      }
    }

    // שמור את המיקום הנבחר
    setQuery(label);
    setSelectedLocation(label);
    setSelectedCoords(coords);
    
    // סגור את רשימת ההצעות
    setSuggestions([]);
    setSuggestOpen(false);
    
    // שמור בחיפושים אחרונים (כולל קואורדינטות)
    await saveRecents(label, coords);
  };

  const clearRecents = useCallback(() => {
    Alert.alert('לאפס חיפושים אחרונים?', undefined, [
      { text: 'בטל', style: 'cancel' },
      {
        text: 'אפס',
        style: 'destructive',
        onPress: async () => {
          try {
            // מחיקת כל החיפושים בשרת עם Anonymous API
            const result = await clearRecentSearches();
            if (result.success) {
              setRecents([]);
            }
          } catch (error) {
            console.error('Clear recents error:', error);
          }
        }
      }
    ]);
  }, []);

  const dismissAll = () => {
    setSuggestOpen(false);
    Keyboard.dismiss();
  };

  const handleInputFocus = () => {
    // אם יש מיקום נבחר, לא להציג הצעות
    if (selectedLocation) {
      return;
    }
    
    // אם אין טקסט ויש חיפושים אחרונים - הצג אותם
    if (query.trim().length === 0 && recents.length > 0) {
      const recentSuggestions = recents.slice(0, 5).map((search, index) => {
        const searchQuery = typeof search === 'string' ? search : search.query;
        const searchCoords = typeof search === 'string' ? null : search.coords;
        
        return {
          id: `recent-${index}`,
          display_name: searchQuery,
          description: searchQuery,
          type: 'recent',
          isRecent: true,
          // הוסף קואורדינטות אם יש
          lat: searchCoords?.lat,
          lng: searchCoords?.lng
        };
      });
      setSuggestions(recentSuggestions);
      setSuggestOpen(true);
      setSuggestLoading(false);
    }
  };

  // פונקציות תאריך ושעה משופרות
  const formatDate = (date) => {
    const today = new Date();
    // 🔧 תוקן: משתמש בחישוב מילישניות במקום המרה ידנית
    const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) return 'היום';
    if (isTomorrow) return 'מחר';
    
    return date.toLocaleDateString('he-IL', { 
      weekday: 'short',
      day: '2-digit', 
      month: '2-digit'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getDuration = () => {
    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} דקות`;
    if (minutes === 0) return `${hours} שעות`;
    return `${hours}:${minutes.toString().padStart(2, '0')} שעות`;
  };

  const handleStartTimeConfirm = (selectedDate) => {
    console.log('Start time confirmed:', selectedDate);
    const roundedDate = roundTo15Minutes(selectedDate);
    setStartDate(roundedDate);
    
    // עדכן את תאריך הסיום להיות שעה אחרי (מינימום)
    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
    const newEnd = addHoursInIsrael(roundedDate, 1);
    setEndDate(roundTo15Minutes(newEnd));
    
    setShowStartPicker(false);
  };

  const handleEndTimeConfirm = (selectedDate) => {
    console.log('End time confirmed:', selectedDate);
    const roundedDate = roundTo15Minutes(selectedDate);
    
    // וודא שתאריך הסיום לפחות שעה אחרי ההתחלה
    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
    const minEndTime = addHoursInIsrael(startDate, 1);
    
    if (roundedDate <= minEndTime) {
      setEndDate(roundTo15Minutes(minEndTime));
    } else {
      setEndDate(roundedDate);
    }
    
    setShowEndPicker(false);
  };

  // האזנה לירידת המקלדת
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // כשהמקלדת יורדת - הסתר חיפושים אחרונים אם אין טקסט
      if (query.trim().length === 0) {
        setSuggestOpen(false);
        setSuggestions([]);
      }
    });

    return () => {
      keyboardDidHideListener?.remove();
    };
  }, [query]);

  const PlaceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.placeCard}
      onPress={() => runSearch(item.label, item.coords)}
      activeOpacity={0.9}
    >
      <Ionicons name={item.icon || 'home'} size={18} color={theme.colors.primary} style={styles.iconLeading} />
      <View style={{ flex: 1 }}>
        <Text style={styles.placeTitle} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.placeSub} numberOfLines={1}>{item.note || 'קיצור דרך ליעד שמור'}</Text>
      </View>
      <Ionicons name="chevron-back" size={16} color={theme.colors.subtext} style={styles.iconTrailing} />
    </TouchableOpacity>
  );

  // רקע דינמי (ערבוב צבעי המותג)
  const g1 = theme.colors.gradientStart;
  const g2 = theme.colors.gradientEnd;
  const mix = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [g1, g2],
  });

  // רכיב פריט חיפוש אחרון – צ'יפ לבן/שחור, אייקון מימין
  const RecentChip = ({ label, index }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={async () => {
          try { await Haptics.selectionAsync(); } catch {}
          runSearch(label);
        }}
        onLongPress={() => {
          Alert.alert('להסיר חיפוש זה?', `"${label}"`, [
            { text: 'בטל', style: 'cancel' },
            { text: 'הסר', style: 'destructive', onPress: () => removeRecentAt(index) }
          ]);
        }}
        style={styles.recentChip}
        accessibilityRole="button"
        accessibilityLabel={`חיפוש אחרון ${label}`}
      >
        <View style={styles.recentChipInner}>
          <Ionicons name="time" size={16} color="#111111" style={styles.recentChipIconRight} />
          <Text numberOfLines={1} style={styles.recentChipText}>{label}</Text>
          <Ionicons name="chevron-back" size={16} color="#111111" style={styles.recentChipChevronLeft} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* רקע גרדיאנט חי ועדין */}
      <Animated.View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[g1, mix, g2]}
          start={{ x: 0.1, y: 0.9 }}
          end={{ x: 0.9, y: 0.1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      <TouchableWithoutFeedback onPress={dismissAll}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          keyboardVerticalOffset={Platform.select({ ios: 8, android: 0 })}
        >
              <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingHorizontal: theme.spacing.xl,
                    paddingTop: theme.spacing.md,
                    paddingBottom: Math.max(insets.bottom + 70, theme.spacing.lg),
                    flexGrow: 1,
                  }}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* באנר הזמנה פעילה */}
                  {activeBooking && (
                    <View style={styles.activeCard}>
                      <View style={{ flexDirection: 'row', alignItems:'center', justifyContent:'space-between' }}>
                        <Text style={styles.activeTitle}>חניה פעילה עכשיו</Text>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('Bookings')}
                          hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                          accessibilityRole="button"
                          accessibilityLabel="צ'אט עם התמיכה"
                        >
                          <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.success} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.activeLine}>{activeBooking.parking?.title || 'חניה'}</Text>
                      <Text style={[styles.activeLine, { marginTop: 2 }]}>נותרו: {msToHhMmSs(leftMs)}</Text>
                      <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
                        <TouchableOpacity
                          style={styles.extendBtn}
                          onPress={() => navigation.navigate('BookingDetail', {
                            id: activeBooking.id
                          })}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.extendBtnText}>לפרטי ההזמנה</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

              {/* שורת חיפוש מובנת ומזמינה */}
              <View style={styles.searchWrap}>
                <View style={styles.searchRow}>
                  {/* כפתור "סביבי" */}
                  <TouchableOpacity
                    style={styles.nearInline}
                    onPress={handleNearMe}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="סביבי – רדיוס 700 מטר"
                  >
                    <LinearGradient
                      colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                      start={{ x:0, y:1 }} end={{ x:1, y:0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.nearInlineText}>סביבי</Text>
                  </TouchableOpacity>

                  <Ionicons name="search" size={20} style={styles.searchIcon} />

                  <TextInput
                    ref={inputRef}
                    style={styles.searchInput}
                    placeholder="איפה תרצה להחנות?"
                    placeholderTextColor={theme.colors.subtext}
                    value={query}
                    onChangeText={(text) => {
                      setQuery(text);
                      // אם משנים את הטקסט, בטל את הבחירה
                      if (text !== selectedLocation) {
                        setSelectedLocation(null);
                        setSelectedCoords(null);
                      }
                    }}
                    onFocus={handleInputFocus}
                    textAlign="right"
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="שדה חיפוש כתובת"
                  />
                  {query.length > 0 && (
                    <TouchableOpacity
                      onPress={() => { setQuery(''); setSuggestions([]); setSuggestOpen(false); }}
                      hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                      accessibilityRole="button"
                      accessibilityLabel="נקה חיפוש"
                    >
                      <Ionicons name="close-circle" size={18} style={styles.clearIcon} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* הצעות (inline) - עם אינדיקטור טעינה משופר */}
                {suggestOpen && (
                  <View style={styles.suggestBoxInline}>
                    {suggestLoading ? (
                      <View style={styles.suggestLoadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={styles.suggestLoadingText}>מחפש...</Text>
                      </View>
                    ) : suggestions.length > 0 ? (
                      <FlatList
                        keyboardShouldPersistTaps="handled"
                        data={suggestions}
                        keyExtractor={(i, idx) => String(i.id || i.place_id || idx)}
                        scrollEnabled={false}
                        nestedScrollEnabled={true}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.suggestItem}
                            onPress={() => onPickSuggestion(item)}
                            activeOpacity={0.9}
                          >
                            <Ionicons 
                              name={item.isRecent ? "time" : (item.isBusiness ? "storefront" : "location")} 
                              size={16} 
                              color={item.isRecent ? theme.colors.subtext : (item.isBusiness ? theme.colors.secondary : theme.colors.primary)} 
                              style={styles.suggestIcon} 
                            />
                            <Text style={styles.suggestText} numberOfLines={1}>
                              {item.description || item.display_name || 'לא ידוע'}
                            </Text>
                            {item.isRecent && (
                              <Text style={styles.suggestRecentLabel}>אחרון</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      />
                    ) : (
                      <View style={styles.suggestEmptyContainer}>
                        <Text style={styles.suggestEmptyText}>לא נמצאו תוצאות</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* הגדרות תאריך ושעה - מקצועי */}
              <View style={styles.dateTimeSection}>
                <View style={[styles.compactDateTimeRow, { marginHorizontal: theme.spacing.md }]}>
                  {/* תאריך ושעת התחלה */}
                  <TouchableOpacity
                    style={styles.compactDateTimeButton}
                    onPress={() => setShowStartPicker(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.compactDateTimeContent}>
                      <Text style={styles.compactDateTimeLabel}>התחלה</Text>
                      <Text style={styles.compactDateTimeValue}>
                        {formatDate(startDate)} • {formatTime(startDate)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* משך זמן */}
                  <View style={styles.compactDurationIndicator}>
                    <Text style={styles.compactDurationText}>{getDuration()}</Text>
                  </View>

                  {/* תאריך ושעת סיום */}
                  <TouchableOpacity
                    style={styles.compactDateTimeButton}
                    onPress={() => setShowEndPicker(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.compactDateTimeContent}>
                      <Text style={styles.compactDateTimeLabel}>סיום</Text>
                      <Text style={styles.compactDateTimeValue}>
                        {formatDate(endDate)} • {formatTime(endDate)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Time Picker Wheels - משופר */}
                <TimePickerWheel
                  visible={showStartPicker}
                  initial={startDate}
                  onClose={() => setShowStartPicker(false)}
                  onConfirm={handleStartTimeConfirm}
                  minimumDate={new Date()}
                  title="בחירת זמן התחלה"
                />
                
                <TimePickerWheel
                  visible={showEndPicker}
                  initial={endDate}
                  onClose={() => setShowEndPicker(false)}
                  onConfirm={handleEndTimeConfirm}
                  minimumDate={(() => {
                    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
                    return addHoursInIsrael(startDate, 1);
                  })()}
                  title="בחירת זמן סיום"
                />
              </View>


              {/* כפתור חיפוש חניות */}
              <View style={styles.searchButtonSection}>
                <TouchableOpacity
                  style={[
                    styles.findParkingButton,
                    (!selectedLocation || !startDate || !endDate) && styles.findParkingButtonDisabled
                  ]}
                  onPress={() => {
                    if (!selectedLocation) {
                      Alert.alert('שגיאה', 'אנא בחר מיקום לחיפוש');
                      return;
                    }
                    
                    // וודא שיש קואורדינטות
                    if (!selectedCoords || !selectedCoords.lat || !selectedCoords.lng) {
                      Alert.alert(
                        'שגיאה', 
                        'לא נמצאו קואורדינטות למיקום הנבחר. אנא בחר מיקום אחר מהרשימה או נסה לחפש מיקום יותר ספציפי.',
                        [
                          { text: 'אישור', onPress: () => {
                            // נקה את הבחירה כדי שהמשתמש יוכל לבחור שוב
                            setSelectedLocation(null);
                            setSelectedCoords(null);
                            setQuery('');
                          }}
                        ]
                      );
                      return;
                    }
                    
                    // וודא שיש לפחות שעה אחת בין התחלה לסיום
                    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
                    if (durationHours < 1) {
                      Alert.alert('שגיאה', 'יש לבחור לפחות שעה אחת לחניה');
                      return;
                    }
                    
                    console.log('🚗 Starting parking search with params:', {
                      location: selectedLocation,
                      coords: selectedCoords,
                      startDate: startDate.toISOString(),
                      endDate: endDate.toISOString(),
                      duration: `${durationHours.toFixed(1)} hours`,
                      searchType: 'location'
                    });
                    
                    // חיפוש חניות במיקום הנבחר עם רדיוס 1 ק"מ
                    navigation.navigate('SearchResults', {
                      query: selectedLocation,
                      coords: selectedCoords,
                      startDate: startDate.toISOString(),
                      endDate: endDate.toISOString(),
                      searchType: 'future', // חיפוש עתידי
                      bookingType: BOOKING_TYPES.FUTURE, // סוג הזמנה עתידית
                      filters: {
                        isCovered: false, // מבטל מסננים שהוסרו
                        hasCharging: false, // מבטל מסננים שהוסרו
                      },
                      radius: 1000, // 1 ק"מ ברדיוס
                      minDurationHours: 1, // מינימום שעה אחת
                    });
                  }}
                  activeOpacity={0.8}
                  disabled={!selectedLocation || !startDate || !endDate}
                >
                  <View style={styles.findParkingButtonContent}>
                    <Text style={styles.findParkingButtonText}>מצא לי חניות</Text>
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      writingDirection: 'ltr',
    },

    // באנר הזמנה פעילה
    activeCard:{
      backgroundColor: '#e8fff2',
      borderColor: '#b9f5cf',
      borderWidth: 1,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    activeTitle:{ fontSize:16, fontWeight:'800', color: colors.success, textAlign: 'left' },
    activeLine:{ fontSize:14, color: colors.success, textAlign: 'left' },
    extendBtn:{
      paddingVertical:10, paddingHorizontal:12,
      backgroundColor:'#dff9ec',
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor:'#b9f5cf'
    },
    extendBtnText:{ color: colors.success, fontWeight:'700' },

    // טקסטים
    title:{ 
      fontSize: 32, 
      fontWeight: '900', 
      textAlign: 'center', 
      marginTop: spacing.md, 
      color: colors.text,
      letterSpacing: -0.5,
      lineHeight: 38,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    subtitle:{ fontSize:13, textAlign:'center', color: colors.subtext, marginTop: 4, marginBottom: spacing.md },

    // חיפוש
    searchWrap:{ marginTop: spacing.lg },
    searchRow:{
      flexDirection:'row',
      alignItems:'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadii.lg,
      borderWidth: 2, 
      borderColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      shadowColor: colors.primary, 
      shadowOpacity: 0.15, 
      shadowRadius: 16, 
      shadowOffset: { width: 0, height: 8 }, 
      elevation: 8
    },
    searchIcon:{
      color: colors.accent,
      marginRight: spacing.sm,
      marginLeft: spacing.sm,
    },
    input:{
      flex:1,
      fontSize:16,
      paddingVertical:8,
      paddingHorizontal:8,
      color: colors.text,
      textAlign: 'right',
    },
    clearIcon:{
      color: colors.subtext,
      marginLeft: spacing.sm,
      marginRight: spacing.xs,
    },

    // כפתור "סביבי" בפנים
    nearInline:{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'center',
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 999,
      overflow:'hidden',
      borderWidth: 1,
      borderColor: '#C7DEFF',
      minWidth: 84,
      marginRight: spacing.sm,
    },
    nearInlineText:{ color:'#FFFFFF', fontWeight:'900', fontSize: 13 },

    // הצעות
    suggestBoxInline:{
      marginTop: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.border,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2,
      maxHeight: 220,
      overflow: 'hidden',
    },
    suggestItem:{
      flexDirection:'row',
      alignItems:'center',
      paddingVertical:10, paddingHorizontal:12,
      borderBottomWidth:1, borderBottomColor: colors.border
    },
    suggestIcon:{ marginRight: 8 },
    suggestText:{ flex:1, color: colors.text, textAlign: 'left' },
    suggestRecentLabel:{ 
      fontSize: 12, 
      color: colors.subtext, 
      fontWeight: '600',
      marginLeft: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: colors.background,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border
    },
    
    // סגנונות חדשים לאינדיקטור טעינה והודעת ריק
    suggestLoadingContainer:{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    suggestLoadingText:{
      marginLeft: 8,
      color: colors.subtext,
      fontSize: 14,
    },
    suggestEmptyContainer:{
      alignItems:'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    suggestEmptyText:{
      color: colors.subtext,
      fontSize: 14,
      textAlign: 'center',
    },

    // מקומות שמורים
    savedBlock:{
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      borderWidth:1, borderColor: colors.border,
      padding: spacing.md,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    blockHeader:{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'space-between',
      marginBottom: spacing.sm
    },
    blockTitle:{ fontSize:15, fontWeight:'800', color: colors.text },
    blockLink:{ color: colors.primary, fontWeight:'700' },
    placesWrap:{},
    placeCard:{
      flexDirection:'row',
      alignItems:'center',
      paddingVertical:12, paddingHorizontal:12,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm
    },
    iconLeading:{ marginRight: 8 },
    iconTrailing:{ marginLeft: 8 },
    placeTitle:{ color: colors.text, fontWeight:'800', textAlign: 'left' },
    placeSub:{ color: colors.subtext, fontSize:12, textAlign: 'left' },
    emptyText:{ color: colors.subtext, fontSize:13, textAlign:'right' },

    // חיפושים אחרונים — צ'יפים אופקיים לבן/שחור
    recentsTechBlock:{
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      borderWidth:1, borderColor: colors.border,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    recentsTechHeader:{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'space-between',
      marginBottom: spacing.xs
    },
    recentsTechTitle:{ fontSize:15, fontWeight:'800', color: colors.text },

    recentChip:{
      height: 40,         // קטן יותר
      minWidth: 140,      // קטן יותר
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border, // מסגרת על בסיס המותג
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    recentChipInner:{
      flexDirection:'row-reverse', // אייקון מימין, טקסט אחריו, חץ משמאל
      alignItems:'center',
      justifyContent:'space-between',
      gap: 8,
    },
    recentChipIconRight:{ marginLeft: 8 },
    recentChipChevronLeft:{ marginRight: 4 },
    recentChipText:{
      color:'#000000',
      fontWeight:'800',
      textAlign:'right',
      flex: 1,
    },

    // קיצורי־על – 3 עמודות
    quickGrid:{
      marginTop: spacing.md,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    quickCard:{
      width: '32%',
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.md,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    quickText:{ color: colors.text, fontWeight:'800', textAlign: 'center' },

    // תאריכים ושעות - עם רווחים ורוחב מלא
    dateTimeSection: {
      marginTop: spacing.lg, // רווח גדול מלמעלה
      paddingHorizontal: 0, // ללא padding כדי לתפוס את כל הרוחב
      marginBottom: spacing.lg, // רווח גדול מלמטה
    },
    compactDateTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadii.lg, // כמו סרגל החיפוש
      borderWidth: 2, // כמו סרגל החיפוש
      borderColor: colors.primary, // כמו סרגל החיפוש
      paddingHorizontal: spacing.md, // כמו סרגל החיפוש
      paddingVertical: spacing.sm, // כמו סרגל החיפוש
      shadowColor: colors.primary, // כמו סרגל החיפוש
      shadowOpacity: 0.15, // כמו סרגל החיפוש
      shadowRadius: 16, // כמו סרגל החיפוש
      shadowOffset: { width: 0, height: 8 }, // כמו סרגל החיפוש
      elevation: 8, // כמו סרגל החיפוש
    },
    compactDateTimeButton: {
      flex: 1,
      padding: spacing.xs, // פחות padding
      borderRadius: 6,
      backgroundColor: colors.bg + '20',
    },
    compactDateTimeContent: {
      alignItems: 'center',
    },
    compactDateTimeLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.subtext,
      marginBottom: 2,
    },
    compactDateTimeValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    compactDurationIndicator: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
      minWidth: 40, // קטן יותר
    },
    compactDurationText: {
      fontSize: 10, // קטן יותר
      fontWeight: '600',
      color: colors.accent,
      textAlign: 'center',
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      paddingRight: spacing.sm,
      paddingLeft: spacing.sm,
    },
    searchInputSelected: {
      color: colors.success,
      fontWeight: '600',
    },
    selectedLocationIndicator: {
      position: 'absolute',
      left: spacing.sm,
      top: '50%',
      transform: [{ translateY: -8 }],
    },
    dateTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dateTimeSectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    dateTimeCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    startCard: {
      borderColor: colors.primary + '30',
      backgroundColor: colors.primary + '05',
    },
    endCard: {
      borderColor: colors.secondary + '30',
      backgroundColor: colors.secondary + '05',
    },
    dateTimeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    dateTimeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.xs,
    },
    dateTimeTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    dateTimeContent: {
      alignItems: 'flex-end',
    },
    dateTimeDate: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'left',
      writingDirection: 'rtl',
      marginBottom: 2,
    },
    dateTimeTime: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.subtext,
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    durationIndicator: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
      minWidth: 60,
    },
    durationText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
      textAlign: 'center',
      marginVertical: 2,
    },

    // מסננים - Switch קומפקטי
    filtersSection: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    switchFiltersRowHorizontal: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    switchFilterItemCompact: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.02,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    switchFilterContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    switchFilterLabelCompact: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    switchCompact: {
      transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },

    // DateTimePicker container
    pickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginTop: spacing.md,
      padding: spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    dateTimePicker: {
      backgroundColor: 'transparent',
    },

    // כפתור חיפוש חניות - רוחב כמו סרגל החיפוש
    searchButtonSection: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.md, // אותו רווח כמו סרגל החיפוש
      marginBottom: spacing.lg,
    },
    findParkingButton: {
      backgroundColor: colors.primary, // צבעי המותג
      borderRadius: 25, // עיגול יותר
      paddingVertical: spacing.md, // קטן יותר
      paddingHorizontal: spacing.lg,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      borderWidth: 0, // בלי גבול
    },
    findParkingButtonDisabled: {
      backgroundColor: colors.subtext,
      shadowOpacity: 0.1,
    },
    findParkingButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    findParkingButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
    },
  });
}

// screens/HomeScreen.js
// תיקון שגיאה + עדכון חיפושים אחרונים:
// - מיגרציה: אם נשמרו בעבר אובייקטים {label, ts} – ממירים למחרוזות ושומרים חזרה.
// - צ'יפים לבנים עם טקסט שחור ומסגרת בגוון המותג.
// - האייקון (שעון) מימין, טקסט מיושר לימין, חץ משמאל.
// - צ'יפים קטנים יותר.
// - אין תאריך/שעה (לא נשמר ולא מוצג).

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Alert,
  FlatList,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Animated,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { osmAutocomplete } from '../utils/osm';

function msToHhMmSs(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

const RECENTS_KEY = 'recentSearches';
const RECENTS_MAX = 8;
const SAVED_PLACES_KEY = 'savedPlaces_v1';

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);

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
  const suggestTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [/* last */, rawRecents, rawSaved] = await Promise.all([
          AsyncStorage.getItem('lastQuery'),
          AsyncStorage.getItem(RECENTS_KEY),
          AsyncStorage.getItem(SAVED_PLACES_KEY),
        ]);

        // --- מיגרציה לחיפושים אחרונים: ממירים כל אייטם למחרוזת בלבד ---
        const parsed = rawRecents ? JSON.parse(rawRecents) : [];
        const normalized = parsed
          .map((it) => (typeof it === 'string' ? it : (it?.label ?? '')))
          .filter(Boolean);
        setRecents(normalized);
        // אם היה צורך במיגרציה – שומרים חזרה כמחרוזות בלבד
        if (parsed.some((it) => typeof it !== 'string')) {
          try { await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(normalized)); } catch {}
        }

        setSavedPlaces(rawSaved ? JSON.parse(rawSaved) : []);
      } catch {}
    })();
  }, []);

  const loadActive = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('bookings');
      const list = raw ? JSON.parse(raw) : [];
      const now = new Date();
      const active = list.find(b => new Date(b.start) <= now && now < new Date(b.end));
      if (active) {
        setActiveBooking(active);
        setLeftMs(new Date(active.end) - now);
      } else {
        setActiveBooking(null);
        setLeftMs(0);
      }
    } catch {
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
    try {
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(nextList));
    } catch {}
  }, []);

  const saveRecents = useCallback(async (q) => {
    try {
      const raw = await AsyncStorage.getItem(RECENTS_KEY);
      const current = raw ? JSON.parse(raw) : [];
      // ממירים למחרוזות – גם אם נשמרו בעבר כאובייקטים
      const currentStrings = current
        .map((it) => (typeof it === 'string' ? it : (it?.label ?? '')))
        .filter(Boolean);

      const filtered = currentStrings.filter(item => item.toLowerCase() !== q.toLowerCase());
      const next = q ? [q, ...filtered].slice(0, RECENTS_MAX) : filtered.slice(0, RECENTS_MAX);

      await persistRecents(next);
      setRecents(next);
    } catch {}
  }, [persistRecents]);

  const removeRecentAt = useCallback(async (index) => {
    try {
      const next = recents.filter((_, i) => i !== index);
      setRecents(next);
      await persistRecents(next);
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    } catch {}
  }, [recents, persistRecents]);

  const runSearch = useCallback(async (text, coordsOverride = null) => {
    const q = (text || '').trim();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem('lastQuery', q);
    Keyboard.dismiss();
    setSuggestOpen(false);

    let target = coordsOverride;
    if (!target && q.length > 0) {
      try {
        const results = await osmAutocomplete(q, { limit: 1, language: 'he' });
        if (results && results[0]) {
          const r = results[0];
          target = { latitude: r.lat, longitude: r.lon };
        }
      } catch {}
    }

    await saveRecents(q);
    const params = {};
    if (q) params.query = q;
    if (target) params.coords = target;

    navigation.navigate('SearchResults', params);
  }, [saveRecents, navigation]);

  const handleSearch = useCallback(async () => {
    await runSearch(query);
  }, [runSearch, query]);

  // חיפוש סביבי (עם רדיוס 600 מ׳)
  const handleNearMe = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('נדרשת הרשאת מיקום', 'כדי למצוא חניה סביבך, אפשר הרשאת מיקום למכשיר.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      navigation.navigate('SearchResults', { coords, radiusMeters: 600 });
    } catch {
      Alert.alert('שגיאה באיתור מיקום', 'לא הצלחנו לאתר את המיקום שלך כרגע.');
    }
  }, [navigation]);

  // הצעות חיפוש בזמן כתיבה
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); setSuggestOpen(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await osmAutocomplete(q, { limit: 6, language: 'he' });
        setSuggestions(res || []);
        setSuggestOpen((res || []).length > 0);
      } catch {
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 200);
    return () => suggestTimer.current && clearTimeout(suggestTimer.current);
  }, [query]);

  const onPickSuggestion = (item) => {
    const label = item.description || item.display_name || query;
    setSuggestions([]);
    setSuggestOpen(false);
    setQuery(label);
    navigation.navigate('SearchResults', {
      query: label,
      coords: { latitude: item.lat, longitude: item.lon },
    });
  };

  const clearRecents = useCallback(() => {
    Alert.alert('לאפס חיפושים אחרונים?', undefined, [
      { text: 'בטל', style: 'cancel' },
      {
        text: 'אפס',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(RECENTS_KEY);
          setRecents([]);
        }
      }
    ]);
  }, []);

  const dismissAll = () => {
    setSuggestOpen(false);
    Keyboard.dismiss();
  };

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
    <TouchableWithoutFeedback onPress={dismissAll} accessible={false}>
      <View style={styles.root}>
        {/* רקע גרדיאנט חי ועדין */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}>
          <LinearGradient
            colors={[g1, mix, g2]}
            start={{ x: 0.1, y: 0.9 }}
            end={{ x: 0.9, y: 0.1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

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
                paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
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
                  <Text style={styles.activeLine}>{activeBooking.spot?.title || 'חניה'}</Text>
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

              {/* כותרת + מיקרו-קופי */}
              <Text style={styles.title}>חניה ב־Tap אחד</Text>
              <Text style={styles.subtitle}>מצא חניה סביבך או ביעד—מהר, נוח ומדויק</Text>

              {/* שורת חיפוש עם "סביבי" משולב */}
              <View style={styles.searchWrap}>
                <View style={styles.searchRow}>
                  {/* כפתור "סביבי" */}
                  <TouchableOpacity
                    style={styles.nearInline}
                    onPress={handleNearMe}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="סביבי – רדיוס 600 מטר"
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
                    placeholder="היכן תרצה להחנות?"
                    placeholderTextColor={theme.colors.subtext}
                    style={styles.input}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="שדה חיפוש כתובת"
                    textAlign="right"
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

                {/* הצעות (inline) */}
                {suggestOpen && suggestions.length > 0 && (
                  <View style={styles.suggestBoxInline}>
                    <FlatList
                      keyboardShouldPersistTaps="handled"
                      data={suggestions}
                      keyExtractor={(i, idx) => String(i.id || i.place_id || idx)}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.suggestItem}
                          onPress={() => onPickSuggestion(item)}
                          activeOpacity={0.9}
                        >
                          <Ionicons name="location" size={16} color={theme.colors.primary} style={styles.suggestIcon} />
                          <Text style={styles.suggestText} numberOfLines={1}>
                            {item.description || item.display_name || 'לא ידוע'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>

              {/* מקומות שמורים */}
              <View style={styles.savedBlock}>
                <View style={styles.blockHeader}>
                  <Text style={styles.blockTitle}>מקומות שמורים</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Profile')}
                    hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                  >
                    <Text style={styles.blockLink}>ניהול</Text>
                  </TouchableOpacity>
                </View>
                {savedPlaces.length === 0 ? (
                  <Text style={styles.emptyText}>הוסיפו יעדים קבועים לניהול בפרופיל</Text>
                ) : (
                  <View style={styles.placesWrap}>
                    {savedPlaces.slice(0, 4).map(p => <PlaceCard key={p.id} item={p} />)}
                  </View>
                )}
              </View>

              {/* חיפושים אחרונים — צ'יפים לבנים/שחורים עם גלילה אופקית */}
              {recents.length > 0 && (
                <View style={styles.recentsTechBlock}>
                  <View style={styles.recentsTechHeader}>
                    <Text style={styles.recentsTechTitle}>חיפושים אחרונים</Text>
                    <TouchableOpacity onPress={clearRecents} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.subtext} />
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={recents}
                    keyExtractor={(label, idx) => `${label}-${idx}`}
                    renderItem={({ item, index }) => {
                      const label = typeof item === 'string' ? item : (item?.label ?? '');
                      if (!label) return null;
                      return <RecentChip label={label} index={index} />;
                    }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 2 }}
                    ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              )}

              {/* קיצורי־על – 3 עמודות */}
              <View style={styles.quickGrid}>
                <TouchableOpacity
                  style={styles.quickCard}
                  onPress={() => navigation.navigate('AdvancedSearch', { mode: 'future' })}
                  activeOpacity={0.9}
                >
                  <Ionicons name="calendar" size={22} color={theme.colors.primary} style={{ marginBottom: 8 }} />
                  <Text style={styles.quickText}>חניה עתידית</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickCard}
                  onPress={() => navigation.navigate('Bookings')}
                  activeOpacity={0.9}
                >
                  <Ionicons name="calendar-outline" size={22} color={theme.colors.accent} style={{ marginBottom: 8 }} />
                  <Text style={styles.quickText}>ההזמנות שלי</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickCard}
                  onPress={() => navigation.navigate('Favorites')}
                  activeOpacity={0.9}
                >
                  <Ionicons name="heart" size={22} color={theme.colors.secondary} style={{ marginBottom: 8 }} />
                  <Text style={styles.quickText}>מועדפים</Text>
                </TouchableOpacity>
              </View>

              {/* >>> בעלי חניה <<< */}
              <TouchableOpacity
                style={[styles.ownerBtn, { marginTop: 16, marginBottom: Math.max(insets.bottom, theme.spacing.md) }]}
                onPress={() => navigation.navigate('OwnerIntro')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
                  start={{ x:0, y:1 }} end={{ x:1, y:0 }}
                  style={{ ...StyleSheet.absoluteFillObject, borderRadius: theme.borderRadii.md }}
                />
                <Ionicons name="business" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.ownerBtnText}>בעל/ת חניה? התחילו להשכיר</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
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
    title:{ fontSize:26, fontWeight:'800', textAlign:'center', marginTop: spacing.md, color: colors.text },
    subtitle:{ fontSize:13, textAlign:'center', color: colors.subtext, marginTop: 4, marginBottom: spacing.md },

    // חיפוש
    searchWrap:{ marginTop: spacing.md },
    searchRow:{
      flexDirection:'row',
      alignItems:'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      borderWidth:1, borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      height: 52,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
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

    // בעלי חניה – גרדיאנט ממותג
    ownerBtn:{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'center',
      paddingVertical:14,
      borderRadius: borderRadii.md,
      shadowColor:'#000', shadowOpacity:0.08, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:3,
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    ownerBtnText:{ color:'#fff', fontSize:16, fontWeight:'800' },
  });
}

// screens/HomeScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard, StatusBar, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState([]);

  const [activeBooking, setActiveBooking] = useState(null);
  const [leftMs, setLeftMs] = useState(0);
  const timerRef = useRef(null);

  // הצעות חיפוש כתובות (autocomplete בסיסי)
  const [suggestions, setSuggestions] = useState([]);
  const suggestTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [last, rawRecents] = await Promise.all([
          AsyncStorage.getItem('lastQuery'),
          AsyncStorage.getItem(RECENTS_KEY),
        ]);
        if (last) setQuery(last);
        setRecents(rawRecents ? JSON.parse(rawRecents) : []);
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

  const saveRecents = useCallback(async (q) => {
    try {
      const raw = await AsyncStorage.getItem(RECENTS_KEY);
      const current = raw ? JSON.parse(raw) : [];
      const filtered = current.filter(item => item.toLowerCase() !== q.toLowerCase());
      const next = q ? [q, ...filtered].slice(0, RECENTS_MAX) : filtered.slice(0, RECENTS_MAX);
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      setRecents(next);
    } catch {}
  }, []);

  const runSearch = useCallback(async (text) => {
    const q = (text || '').trim();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem('lastQuery', q);
    Keyboard.dismiss();

    // חיפוש כתובת אמיתי
    let target = null;
    if (q.length > 0) {
      try {
        const results = await osmAutocomplete(q, { limit: 1, language: 'he' });
        if (results[0]) {
          const r = results[0];
          target = { latitude: r.lat, longitude: r.lon };
        }
      } catch {}
    }

    await saveRecents(q);
    if (target) {
      navigation.navigate('SearchResults', { query: q, coords: target });
    } else {
      navigation.navigate('SearchResults', q ? { query: q } : {});
    }
  }, [navigation, saveRecents]);

  const handleSearch = useCallback(async () => {
    await runSearch(query);
  }, [runSearch, query]);

  // הצעות חיפוש בזמן כתיבה
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await osmAutocomplete(q, { limit: 5, language: 'he' });
        setSuggestions(res);
      } catch { setSuggestions([]); }
    }, 250);
    return () => suggestTimer.current && clearTimeout(suggestTimer.current);
  }, [query]);

  const onPickSuggestion = (item) => {
    setSuggestions([]);
    setQuery(item.description || query);
    navigation.navigate('SearchResults', {
      query: item.description || query,
      coords: { latitude: item.lat, longitude: item.lon },
    });
  };

  const clearRecents = useCallback(() => {
    Alert.alert('לאפס חיפושים אחרונים?', undefined, [
      { text: 'בטל', style: 'cancel' },
      { text: 'אפס', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem(RECENTS_KEY);
          setRecents([]);
        }
      }
    ]);
  }, []);

  const Chip = ({ label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.chip} activeOpacity={0.85}>
      <Ionicons name="time" size={14} color="#007ACC" style={{ marginEnd: 6 }} />
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* באנר הזמנה פעילה */}
      {activeBooking && (
        <View style={styles.activeCard}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={styles.activeTitle}>חניה פעילה עכשיו</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
              <Ionicons name="list" size={20} color="#0a7a3e" />
            </TouchableOpacity>
          </View>
          <Text style={styles.activeLine}>{activeBooking.spot?.title || 'חניה'}</Text>
          <Text style={[styles.activeLine, { marginTop: 2 }]}>נותרו: {msToHhMmSs(leftMs)}</Text>
          <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
            <TouchableOpacity style={styles.extendBtn} onPress={() => navigation.navigate('Booking', { spot: activeBooking.spot, bookingId: activeBooking.id, initialStart: activeBooking.start, initialEnd: activeBooking.end })}>
              <Text style={styles.extendBtnText}>לפרטי ההזמנה</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.title}>חיפוש חנייה בזפוטו</Text>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} style={styles.searchIcon} />
        <TextInput
          placeholder="הזן עיר או כתובת"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }}>
            <Ionicons name="close-circle" size={20} style={styles.clearIcon} />
          </TouchableOpacity>
        )}
      </View>

      {/* הצעות חיפוש (כתובות) */}
      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          <FlatList
            data={suggestions}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestItem} onPress={() => onPickSuggestion(item)}>
                <Ionicons name="location" size={16} color="#0b6aa8" style={{ marginEnd:8 }} />
                <Text style={styles.suggestText} numberOfLines={1}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSearch} activeOpacity={0.9}>
        <Text style={styles.buttonText}>חיפוש חנייה מיידית</Text>
      </TouchableOpacity>

      {/* חיפושים אחרונים */}
      {recents.length > 0 && (
        <View style={styles.recentsBlock}>
          <View style={styles.recentsHeader}>
            <Text style={styles.recentsTitle}>חיפושים אחרונים</Text>
            <TouchableOpacity onPress={clearRecents} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
              <Ionicons name="trash-outline" size={18} color="#777" />
            </TouchableOpacity>
          </View>
          <View style={styles.recentsWrap}>
            {recents.map((r, i) => (
              <Chip key={`${r}-${i}`} label={r} onPress={() => runSearch(r)} />
            ))}
          </View>
        </View>
      )}

      {/* קישורים נוספים */}
      <TouchableOpacity style={[styles.buttonGhost, { marginTop: 10 }]} onPress={() => navigation.navigate('AdvancedSearch')} activeOpacity={0.9}>
        <Text style={styles.buttonGhostText}>חיפוש מתקדם</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.buttonGhost, { marginTop: 10 }]} onPress={() => navigation.navigate('Favorites')} activeOpacity={0.9}>
        <Ionicons name="heart" size={16} style={{ marginEnd: 6, color:'#00C6FF' }} />
        <Text style={styles.buttonGhostText}>מועדפים</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.buttonAlt, { marginTop: 10 }]} onPress={() => navigation.navigate('Bookings')} activeOpacity={0.9}>
        <Text style={styles.buttonText}>ההזמנות שלי</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.buttonGhost, { marginTop: 10, borderColor:'#0b6aa8' }]} onPress={() => navigation.navigate('Profile')} activeOpacity={0.9}>
        <Ionicons name="person-circle" size={18} style={{ marginEnd: 6, color:'#0b6aa8' }} />
        <Text style={[styles.buttonGhostText, { color:'#0b6aa8' }]}>הפרופיל שלי</Text>
      </TouchableOpacity>

      {/* >>> בעלי חניה <<< */}
      <TouchableOpacity
        style={[styles.ownerBtn, { marginTop: 16 }]}
        onPress={() => navigation.navigate('OwnerIntro')}
        activeOpacity={0.9}
      >
        <Ionicons name="business" size={18} color="#fff" style={{ marginEnd: 8 }} />
        <Text style={styles.ownerBtnText}>בעל/ת חניה? התחילו להשכיר</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:24, backgroundColor:'#E0F7FA' },
  activeCard:{ backgroundColor:'#e8fff2', borderColor:'#b9f5cf', borderWidth:1, borderRadius:14, padding:14, marginTop:12, marginBottom:8 },
  activeTitle:{ fontSize:16, fontWeight:'800', color:'#0a7a3e' },
  activeLine:{ fontSize:14, color:'#0a7a3e' },
  extendBtn:{ paddingVertical:10, paddingHorizontal:12, backgroundColor:'#dff9ec', borderRadius:10, borderWidth:1, borderColor:'#b9f5cf' },
  extendBtnText:{ color:'#0a7a3e', fontWeight:'700' },
  title:{ fontSize:28, fontWeight:'bold', textAlign:'center', marginVertical:16 },
  searchRow:{ flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#cdefff', paddingHorizontal:12, height:50, marginBottom:12 },
  searchIcon:{ color:'#00A7E6', marginEnd:8 },
  input:{ flex:1, fontSize:16, paddingVertical:8 },
  clearIcon:{ color:'#888', marginStart:8 },
  button:{ backgroundColor:'#00C6FF', paddingVertical:14, borderRadius:12, alignItems:'center', marginTop:8 },
  buttonAlt:{ backgroundColor:'#007ACC', paddingVertical:14, borderRadius:12, alignItems:'center' },
  buttonText:{ color:'#fff', fontSize:18, fontWeight:'bold' },
  buttonGhost:{ flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:12, borderRadius:12, borderWidth:1, borderColor:'#00C6FF', backgroundColor:'#fff' },
  buttonGhostText:{ color:'#00C6FF', fontSize:15, fontWeight:'700' },
  recentsBlock:{ marginTop:14, backgroundColor:'#ffffff', borderRadius:14, borderWidth:1, borderColor:'#e6f3ff', padding:12 },
  recentsHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  recentsTitle:{ fontSize:15, fontWeight:'800', color:'#0b6aa8' },
  recentsWrap:{ flexDirection:'row', flexWrap:'wrap' },
  chip:{ flexDirection:'row', alignItems:'center', paddingVertical:8, paddingHorizontal:12, borderRadius:999, borderWidth:1, borderColor:'#cfefff', backgroundColor:'#f7fbff', marginRight:8, marginBottom:8 },
  chipText:{ color:'#007ACC', fontWeight:'700' },
  ownerBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#0b6aa8', paddingVertical:14, borderRadius:12 },

  // הצעות כתובות
  suggestBox:{ backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#e6f3ff', marginBottom:8, maxHeight:180 },
  suggestItem:{ flexDirection:'row', alignItems:'center', paddingVertical:10, paddingHorizontal:12, borderBottomWidth:1, borderBottomColor:'#f3f6fb' },
  suggestText:{ flex:1, color:'#0b6aa8' },
  ownerBtnText:{ color:'#fff', fontSize:16, fontWeight:'800' },
});

// screens/AdvancedSearchScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Platform, ScrollView, TextInput, FlatList
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ZpButton from '../components/ui/ZpButton';
import TimePickerWheel, { roundTo15Minutes } from '../components/ui/TimePickerWheel';
import { osmAutocomplete } from '../utils/osm';

function Row({ children, style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default function AdvancedSearchScreen({ route, navigation }) {
  const initial = route?.params?.initialFilters || {};
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [availableNow, setAvailableNow] = useState(!!initial.availableNow);
  const [covered, setCovered] = useState(!!initial.covered);
  const [ev, setEv] = useState(!!initial.ev);

  const [maxPrice, setMaxPrice] = useState(initial.maxPrice ?? null);
  const [maxDistance, setMaxDistance] = useState(initial.maxDistance ?? null);

  const [start, setStart] = useState(() => {
    if (initial.start) return roundTo15Minutes(new Date(initial.start));
    return null;
  });
  const [end, setEnd] = useState(() => {
    if (initial.end) return roundTo15Minutes(new Date(initial.end));
    return null;
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState('start'); // 'start' או 'end'

  // חיפוש מיקום
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const suggestTimer = useRef(null);

  const prices = [10, 12, 15, 20, 30];
  const distances = [0.5, 1, 2, 5];

  const Chip = ({ active, label, onPress }) => {
    if (active) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.chipWrapper}>
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={[styles.chip, styles.chipActive]}
          >
            <Ionicons name="checkmark" size={14} color="#fff" style={{ marginEnd: 6 }} />
            <Text style={styles.chipTextActive}>{label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.chip, styles.chipIdle]}>
        <Text style={styles.chipText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  // הצעות חיפוש בזמן כתיבה
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const q = locationQuery.trim();
    if (q.length < 2) { 
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await osmAutocomplete(q, { limit: 5, language: 'he' });
        setSuggestions(res || []);
        setShowSuggestions((res || []).length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  }, [locationQuery]);

  const handleLocationSelect = (suggestion) => {
    setLocationQuery(suggestion.display_name);
    setSelectedLocation({
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      address: suggestion.display_name
    });
    setShowSuggestions(false);
  };

  const openTimePicker = (mode) => {
    setTimePickerMode(mode);
    setShowTimePicker(true);
  };

  const handleTimePickerConfirm = (selectedDate) => {
    const roundedDate = roundTo15Minutes(selectedDate);
    
    if (timePickerMode === 'start') {
      setStart(roundedDate);
      // אם הסיום קטן מההתחלה החדשה, עדכן אותו
      if (end && roundedDate >= end) {
        const newEnd = new Date(roundedDate.getTime() + 60 * 60 * 1000); // שעה אחת אחרי
        setEnd(roundTo15Minutes(newEnd));
      }
    } else {
      setEnd(roundedDate);
    }
    
    setShowTimePicker(false);
  };

  const apply = () => {
    const filters = {
      availableNow,
      covered,
      ev,
      maxPrice,
      maxDistance,
      start: start ? start.toISOString() : null,
      end: end ? end.toISOString() : null,
    };
    
    const params = { filters };
    
    // אם נבחר מיקום, הוסף אותו
    if (selectedLocation) {
      params.coords = selectedLocation;
      params.query = locationQuery;
    }
    
    navigation.navigate('SearchResults', params);
  };

  const clear = () => {
    setAvailableNow(false);
    setCovered(false);
    setEv(false);
    setMaxPrice(null);
    setMaxDistance(null);
    setStart(null);
    setEnd(null);
    setLocationQuery('');
    setSelectedLocation(null);
    setShowSuggestions(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>חיפוש מתקדם</Text>

      {/* חיפוש מיקום */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="location-outline" size={16} color="#fff" />
          </View>
          <Text style={styles.section}>מיקום</Text>
        </View>
        <Text style={styles.helperText}>הזן כתובת או מקום לחיפוש חניות בסביבה.</Text>
        
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={theme.colors.subtext} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="הזן כתובת או שם מקום..."
            placeholderTextColor={theme.colors.subtext}
            value={locationQuery}
            onChangeText={setLocationQuery}
            returnKeyType="search"
          />
          {locationQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setLocationQuery('');
                setSelectedLocation(null);
                setShowSuggestions(false);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.subtext} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* הצעות חיפוש */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => `${item.place_id || index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleLocationSelect(item)}
                >
                  <Ionicons name="location" size={16} color={theme.colors.primary} />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
        
        {/* מיקום נבחר */}
        {selectedLocation && (
          <View style={styles.selectedLocationContainer}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.selectedLocationText} numberOfLines={2}>
              נבחר: {locationQuery}
            </Text>
          </View>
        )}
      </View>

      {/* העדפות זמינות */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="options-outline" size={16} color="#fff" />
          </View>
          <Text style={styles.section}>העדפות זמינות</Text>
        </View>
        <Text style={styles.helperText}>שפרו את הדיוק לפי מצב המקום ותשתיות.</Text>

        <Row style={{ marginTop: 8 }}>
          <View style={styles.rowLeft}>
            <Ionicons name="flash-outline" size={18} color={theme.colors.primary} style={{ marginEnd: 8 }} />
            <Text style={styles.label}>זמין עכשיו</Text>
          </View>
          <Switch
            value={availableNow}
            onValueChange={setAvailableNow}
            trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </Row>

        <Row>
          <View style={styles.rowLeft}>
            <Ionicons name="home-outline" size={18} color={theme.colors.primary} style={{ marginEnd: 8 }} />
            <Text style={styles.label}>חניה מקורה</Text>
          </View>
          <Switch
            value={covered}
            onValueChange={setCovered}
            trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </Row>

        <Row>
          <View style={styles.rowLeft}>
            <Ionicons name="battery-charging-outline" size={18} color={theme.colors.primary} style={{ marginEnd: 8 }} />
            <Text style={styles.label}>טעינת רכב חשמלי</Text>
          </View>
          <Switch
            value={ev}
            onValueChange={setEv}
            trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </Row>
      </View>

      {/* מחיר ומרחק */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="cash-outline" size={16} color="#fff" />
          </View>
        <Text style={styles.section}>מחיר ומרחק</Text>
        </View>
        <Text style={styles.helperText}>בחרו סף מחיר ומרחק נוח להליכה.</Text>

        <Text style={[styles.subSection]}>מחיר מקסימלי (₪)</Text>
        <View style={styles.chipsRow}>
          {prices.map(p => (
            <Chip key={`p-${p}`} label={`₪${p}`} active={maxPrice === p} onPress={() => setMaxPrice(maxPrice === p ? null : p)} />
          ))}
        </View>

        <Text style={[styles.subSection, { marginTop: theme.spacing.lg }]}>מרחק מקסימלי</Text>
        <View style={styles.chipsRow}>
          {distances.map(d => (
            <Chip key={`d-${d}`} label={`${d} ק״מ`} active={maxDistance === d} onPress={() => setMaxDistance(maxDistance === d ? null : d)} />
          ))}
        </View>
      </View>

      {/* טווח זמן */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="time-outline" size={16} color="#fff" />
          </View>
          <Text style={styles.section}>טווח זמן</Text>
        </View>
        <Text style={styles.helperText}>הגדירו התחלה וסיום, נעדכן תוצאות בהתאם.</Text>

        <Row>
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} style={{ marginEnd: 8 }} />
            <Text style={styles.label}>התחלה</Text>
          </View>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => openTimePicker('start')} activeOpacity={0.9}>
            <Ionicons name="calendar" size={14} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
            <Text style={styles.pickerText}>
              {start ? `${start.toLocaleDateString('he-IL')} ${start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : 'בחר תאריך/שעה'}
            </Text>
          </TouchableOpacity>
        </Row>

        <Row>
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-clear-outline" size={18} color={theme.colors.primary} style={{ marginEnd: 8 }} />
            <Text style={styles.label}>סיום</Text>
          </View>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => openTimePicker('end')} activeOpacity={0.9}>
            <Ionicons name="time" size={14} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
            <Text style={styles.pickerText}>
              {end ? `${end.toLocaleDateString('he-IL')} ${end.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : 'בחר תאריך/שעה'}
            </Text>
          </TouchableOpacity>
        </Row>
      </View>

      <View style={{ height: theme.spacing.lg }} />

      <ZpButton title="הצג תוצאות" onPress={apply} />

      <TouchableOpacity style={styles.buttonGhost} onPress={clear} activeOpacity={0.9}>
        <Text style={styles.buttonGhostText}>איפוס מסננים</Text>
      </TouchableOpacity>

      <View style={{ height: theme.spacing.lg }} />
      
      {/* TimePickerWheel Modal */}
      <TimePickerWheel
        visible={showTimePicker}
        initial={timePickerMode === 'start' ? (start || new Date()) : (end || new Date())}
        minimumDate={timePickerMode === 'end' ? start : new Date()}
        title={timePickerMode === 'start' ? 'בחרו זמן התחלה' : 'בחרו זמן סיום'}
        onClose={() => setShowTimePicker(false)}
        onConfirm={handleTimePickerConfirm}
      />
    </ScrollView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: { padding: spacing.lg, backgroundColor: colors.bg, paddingBottom: Math.max(70, spacing.lg) },

    // כותרת ראשית – נשארת במרכז
    header: {
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: spacing.lg,
      color: colors.text,
    },

    // === כל הכותרות המשניות והטקסטים מיושרים לשמאל ===
    section: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'left' },
    subSection: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      textAlign: 'left',
    },
    label: { fontSize: 15, color: colors.text, textAlign: 'left' },
    helperText: { fontSize: 12, color: colors.subtext, marginTop: 4, marginBottom: spacing.sm, textAlign: 'left' },

    // Header קטן לכל Card
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
    cardIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginEnd: 8,
      backgroundColor: colors.primary,
    },

    // Card
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },

    // Rows
    rowLeft: { flexDirection: 'row', alignItems: 'center' },

    // Chips – מיושרים לשמאל
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    chipWrapper: { marginLeft: spacing.sm, marginBottom: spacing.sm, borderRadius: 999 }, // ריווח לשמאל
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chipIdle: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginLeft: spacing.sm,
      marginBottom: spacing.sm,
    },
    chipActive: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
      marginLeft: spacing.sm,
      marginBottom: spacing.sm,
    },
    chipText: { color: colors.accent, fontWeight: '700', textAlign: 'left' },
    chipTextActive: { color: '#fff', fontWeight: '700', textAlign: 'left' },

    // Pickers – טקסט מיושר לשמאל
    pickerBtn: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: borderRadii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    pickerText: { fontSize: 14, color: colors.text, textAlign: 'left' },

    // Ghost button
    buttonGhost: {
      marginTop: spacing.md,
      paddingVertical: 12,
      borderRadius: borderRadii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    buttonGhostText: { color: colors.primary, fontSize: 15, fontWeight: '700', textAlign: 'center' },

    // Search input styles
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadii.sm,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginTop: spacing.sm,
    },
    searchIcon: {
      marginEnd: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      textAlign: 'right',
    },
    clearButton: {
      marginStart: 8,
    },

    // Suggestions styles
    suggestionsContainer: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadii.sm,
      marginTop: spacing.xs,
      maxHeight: 200,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      marginStart: 8,
      textAlign: 'right',
    },

    // Selected location styles
    selectedLocationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success + '10',
      borderWidth: 1,
      borderColor: colors.success + '30',
      borderRadius: borderRadii.sm,
      padding: 12,
      marginTop: spacing.sm,
    },
    selectedLocationText: {
      flex: 1,
      fontSize: 14,
      color: colors.success,
      marginStart: 8,
      fontWeight: '600',
      textAlign: 'right',
    },
  });
}

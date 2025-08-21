// screens/AdvancedSearchScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Platform, ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ZpButton from '../components/ui/ZpButton';

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

  const [start, setStart] = useState(initial.start ? new Date(initial.start) : null);
  const [end, setEnd] = useState(initial.end ? new Date(initial.end) : null);

  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

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
    navigation.navigate('SearchResults', { filters }); // חוזר עם מסננים
  };

  const clear = () => {
    setAvailableNow(false);
    setCovered(false);
    setEv(false);
    setMaxPrice(null);
    setMaxDistance(null);
    setStart(null);
    setEnd(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>חיפוש מתקדם</Text>

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
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowStart(true)} activeOpacity={0.9}>
            <Ionicons name="calendar" size={14} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
            <Text style={styles.pickerText}>{start ? start.toLocaleString() : 'בחר תאריך/שעה'}</Text>
          </TouchableOpacity>
        </Row>
        {showStart && (
          <DateTimePicker
            value={start || new Date()}
            mode="datetime"
            is24Hour
            onChange={(_, date) => {
              setShowStart(Platform.OS === 'ios');
              if (date) {
                setStart(date);
                if (end && date >= end) {
                  const e = new Date(date);
                  e.setHours(e.getHours() + 1, 0, 0, 0);
                  setEnd(e);
                }
              }
            }}
          />
        )}

        <Row>
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-clear-outline" size={18} color={theme.colors.primary} style={{ marginEnd: 8 }} />
            <Text style={styles.label}>סיום</Text>
          </View>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowEnd(true)} activeOpacity={0.9}>
            <Ionicons name="time" size={14} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
            <Text style={styles.pickerText}>{end ? end.toLocaleString() : 'בחר תאריך/שעה'}</Text>
          </TouchableOpacity>
        </Row>
        {showEnd && (
          <DateTimePicker
            value={end || (start ? new Date(start.getTime() + 60 * 60 * 1000) : new Date())}
            mode="datetime"
            is24Hour
            minimumDate={start || undefined}
            onChange={(_, date) => {
              setShowEnd(Platform.OS === 'ios');
              if (date) setEnd(date);
            }}
          />
        )}
      </View>

      <View style={{ height: theme.spacing.lg }} />

      <ZpButton title="הצג תוצאות" onPress={apply} />

      <TouchableOpacity style={styles.buttonGhost} onPress={clear} activeOpacity={0.9}>
        <Text style={styles.buttonGhostText}>איפוס מסננים</Text>
      </TouchableOpacity>

      <View style={{ height: theme.spacing.lg }} />
    </ScrollView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: { padding: spacing.lg, backgroundColor: colors.bg },

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
  });
}

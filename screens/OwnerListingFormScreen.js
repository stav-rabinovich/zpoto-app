// [MOBILE] screens/OwnerListingFormScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as listingsRepo from '../../data/listingsRepo';
import { osmReverse } from '../../utils/osm';
import { useTheme } from '@shopify/restyle';
import ZpButton from '../components/ui/ZpButton';
import { API_BASE } from '../../src/config/api'; // ← חשוב: קובץ הקונפיג מהשלב הקודם

// קטגוריות רכבים מצומצמות לפי הפרשי גודל
const VEHICLE_TYPES = [
  { key: 'small',     label: 'קטן (מיני/קומפקטי)' },
  { key: 'medium',    label: 'בינוני (משפחתי)' },
  { key: 'large_suv', label: 'גדול / SUV' },
  { key: 'van_com',   label: 'מסחרי/וואן' },
];

export default function OwnerListingFormScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  // מזהה בקשה (אם לא קיים, נוצר חדש)
  const listingId = route?.params?.id || `req_${Date.now()}`;

  // שדות טופס
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [pricePerHour, setPricePerHour] = useState('12');
  const [description, setDescription] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });

  // טעינת בקשה קיימת לעריכה (אם יש)
  useEffect(() => {
    (async () => {
      if (!route?.params?.id) return;
      const existing = await listingsRepo.getById(route.params.id);
      if (existing) {
        setTitle(existing.title || '');
        setAddress(existing.address || '');
        setPricePerHour(String(existing.pricePerHour ?? 12));
        setDescription(existing.description || '');
        setVehicleTypes(Array.isArray(existing.vehicleTypes) ? existing.vehicleTypes : []);
        setPhotos(Array.isArray(existing.photos) ? existing.photos : []);
        setCoords({
          latitude: existing.latitude ?? null,
          longitude: existing.longitude ?? null,
        });
      }
    })();
  }, [route?.params?.id]);

  // --- תמונות ---
  async function requestMediaPerm() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'לא ניתנה הרשאה לגלריה.');
      return false;
    }
    return true;
  }

  async function addPhoto() {
    const ok = await requestMediaPerm();
    if (!ok) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: Math.max(0, 5 - photos.length),
      quality: 0.6,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (res.canceled) return;
    const picked = (res.assets || []).map(a => a.uri);
    setPhotos(prev => [...prev, ...picked].slice(0, 5));
  }

  function removePhoto(uri) {
    setPhotos(prev => prev.filter(x => x !== uri));
  }

  // --- מיקום (מחליף כתובת ידנית) ---
  async function requestLocationPerm() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      Alert.alert('הרשאה נדרשת', 'לא ניתנה הרשאה למיקום.');
      return false;
    }
    return true;
  }

  async function useCurrentLocation() {
    const ok = await requestLocationPerm();
    if (!ok) return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = pos.coords;
    setCoords({ latitude, longitude });

    // ממלא את הכתובת לפי המיקום ומחליף את מה שהוזן ידנית
    const rev = await osmReverse(latitude, longitude, 'he').catch(() => null);
    if (rev?.address) setAddress(rev.address);
  }

  // בחירה מרובה של סוגי רכבים
  function toggleVehicleType(key) {
    setVehicleTypes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  // --- שליחת בקשה לאישור מנהל (מקומי + שרת) ---
  async function submitRequest() {
    try {
      if (!title.trim()) return Alert.alert('חסר מידע', 'שם החנייה חובה');
      if (!address.trim()) return Alert.alert('חסר מידע', 'כתובת חובה');

      const request = {
        id: listingId,
        // בקשה שממתינה לאישור מנהל
        kind: 'listing_request',
        status: 'pending_review',
        isApproved: false,
        submittedAt: Date.now(),

        // נתוני החנייה המבוקשת
        title,
        address,
        description,
        vehicleTypes,
        pricePerHour: Number(pricePerHour || 12),
        photos,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      // 1) שמירה מקומית (מה שהיה קודם)
      await listingsRepo.upsert(request);

      // 2) שליחה לשרת — חדש
      await fetch(`${API_BASE}/api/listing-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          address,
          description,
          vehicleTypes,
          pricePerHour: Number(pricePerHour || 12),
          photos,                // כרגע URI מקומיים; בשלב הבא נוסיף העלאה לענן
          lat: coords.latitude,
          lng: coords.longitude,
        }),
      });

      Alert.alert('הבקשה נשלחה', 'בקשתך נקלטה וממתינה לאישור מנהל.');
      navigation?.goBack?.();
    } catch (e) {
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח את הבקשה. נסה שוב.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>הגשת בקשה לחנייה</Text>

      <View style={styles.card}>
        <Text style={styles.label}>שם/כותרת</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="לדוגמה: חנייה ברחוב הרצל 12"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
        />

        <Text style={[styles.label, { marginTop: theme.spacing.md }]}>כתובת</Text>
        <TextInput
          style={styles.inputAddress}
          value={address}
          onChangeText={setAddress}
          placeholder="לדוגמה: רחוב הרצל 12, תל אביב"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
          textAlignVertical="top"
          multiline
          numberOfLines={2}
        />

        {/* פאנל GPS – מבהיר שזה מחליף הזנה ידנית */}
        <View style={styles.gpsPanel}>
          <Text style={styles.gpsPanelTitle}>מילוי כתובת לפי המיקום שלך</Text>
          <Text style={styles.gpsPanelHint}>
            בלחיצה על הכפתור נזהה את המיקום ונמלא את שדה הכתובת באופן אוטומטי. הפעולה מחליפה כל טקסט שהוזן ידנית.
          </Text>
          <TouchableOpacity style={styles.gpsButton} onPress={useCurrentLocation} activeOpacity={0.9}>
            <Text style={styles.gpsButtonText}>מלא כתובת לפי GPS (מחליף הזנה ידנית)</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            קואורדינטות: {coords.latitude ? coords.latitude.toFixed(6) : '-'}, {coords.longitude ? coords.longitude.toFixed(6) : '-'}
          </Text>
        </View>

        <Text style={[styles.label, { marginTop: theme.spacing.md }]}>מחיר לשעה (₪)</Text>
        <TextInput
          style={styles.input}
          value={pricePerHour}
          onChangeText={(t) => setPricePerHour(String(t.replace(/[^\d]/g, '')))}
          keyboardType="numeric"
          placeholder="12"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
        />

        <Text style={[styles.label, { marginTop: theme.spacing.md }]}>תיאור החנייה</Text>
        <TextInput
          style={styles.inputMultiline}
          value={description}
          onChangeText={setDescription}
          placeholder="לדוגמה: חנייה מקורה, מתאימה לרכב פרטי/ג׳יפון, כניסה עם שלט, גישה נוחה…"
          placeholderTextColor={theme.colors.subtext}
          textAlign="right"
          textAlignVertical="top"
          multiline
          numberOfLines={5}
        />

        <Text style={[styles.label, { marginTop: theme.spacing.md }]}>סוגי רכב מתאימים (בחירה מרובה)</Text>
        <View style={styles.vehiclesRow}>
          {VEHICLE_TYPES.map(v => {
            const active = vehicleTypes.includes(v.key);
            return (
              <TouchableOpacity
                key={v.key}
                onPress={() => toggleVehicleType(v.key)}
                activeOpacity={0.9}
                style={[styles.vehicleChip, active && styles.vehicleChipActive]}
              >
                <Text style={[styles.vehicleChipText, active && styles.vehicleChipTextActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.hint, { marginTop: theme.spacing.md }]}>
          המודעה תופיע באתר רק לאחר אישור מנהל. צירוף פרטים ותמונות איכותיות מזרזים את האישור.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.label, styles.photosLabel]}>תמונות (עד 5)</Text>
        <View style={styles.photosRow}>
          {photos.map((uri) => (
            <View key={uri} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity style={styles.removeBadge} onPress={() => removePhoto(uri)} activeOpacity={0.85}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity style={[styles.photoAdd, styles.photo]} onPress={addPhoto} activeOpacity={0.9}>
              <Text style={styles.photoAddPlus}>＋</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* כפתור שליחת בקשה — ממורכז ורחב כמעט-מלא */}
      <View style={styles.buttonRow}>
        <ZpButton title="שליחת בקשה לאישור" onPress={submitRequest} style={styles.ctaButton} />
      </View>

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: { padding: spacing.lg, backgroundColor: colors.bg, alignItems: 'flex-start' },
    header: { fontSize: 20, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center', color: colors.text, alignSelf: 'stretch' },
    card: {
      backgroundColor: colors.surface, borderRadius: borderRadii.md, padding: spacing.lg, marginBottom: spacing.md,
      borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 }, elevation: 2, alignSelf: 'stretch', alignItems: 'flex-start',
    },
    label: { fontSize: 14, fontWeight: '700', marginTop: spacing.sm, marginBottom: 6, color: colors.text, textAlign: 'left', alignSelf: 'stretch' },
    input: {
      height: 52, borderRadius: borderRadii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      paddingHorizontal: 12, fontSize: 15, color: colors.text, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 }, elevation: 1, textAlign: 'right', alignSelf: 'stretch',
    },
    inputAddress: {
      minHeight: 64, borderRadius: borderRadii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, textAlign: 'right', alignSelf: 'stretch',
    },
    inputMultiline: {
      minHeight: 110, borderRadius: borderRadii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, textAlign: 'right', alignSelf: 'stretch',
    },
    hint: { fontSize: 12, color: colors.subtext, marginTop: 4, textAlign: 'left', alignSelf: 'stretch' },
    gpsPanel: {
      alignSelf: 'stretch', marginTop: spacing.sm, padding: spacing.md, borderRadius: borderRadii.sm, borderWidth: 1,
      borderColor: colors.border, backgroundColor: colors.bg, gap: 8,
    },
    gpsPanelTitle: { fontSize: 14, fontWeight: '800', color: colors.text, textAlign: 'left' },
    gpsPanelHint: { fontSize: 12, color: colors.subtext, textAlign: 'left' },
    gpsButton: {
      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.primary,
      backgroundColor: colors.surface, alignSelf: 'flex-start',
    },
    gpsButtonText: { color: colors.primary, fontWeight: '800', textAlign: 'left' },
    vehiclesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignSelf: 'stretch', marginTop: spacing.xs },
    vehicleChip: {
      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    },
    vehicleChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
    vehicleChipText: { fontSize: 13, color: colors.text, textAlign: 'left', fontWeight: '700' },
    vehicleChipTextActive: { color: colors.primary },
    photosLabel: { marginBottom: spacing.sm + 6 },
    photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.xs, alignSelf: 'stretch' },
    photoWrap: { position: 'relative' },
    photo: {
      width: 96, height: 96, borderRadius: borderRadii.sm, backgroundColor: '#f1f5f9', alignItems: 'flex-start',
      justifyContent: 'flex-start', borderWidth: 1, borderColor: colors.border
    },
    photoAdd: { borderWidth: 1, borderColor: colors.primary + '55', backgroundColor: colors.bg },
    photoAddPlus: { fontSize: 24, fontWeight: '800', color: colors.primary, textAlign: 'left', padding: 8 },
    removeBadge: {
      position: 'absolute', top: -6, left: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.error,
      alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 }, elevation: 2
    },
    removeText: { color: '#fff', fontWeight: '800', lineHeight: 18, textAlign: 'left' },
    buttonRow: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
    ctaButton: { width: '96%', alignSelf: 'center' },
  });
}

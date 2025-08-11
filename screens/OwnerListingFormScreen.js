// screens/OwnerListingFormScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, Switch, Image, FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { LISTINGS_KEY } from './OwnerDashboardScreen';
import { Ionicons } from '@expo/vector-icons';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import { osmLookup } from '../utils/osm';

export default function OwnerListingFormScreen({ route, navigation }) {
  const listingId = route?.params?.id || null;

  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('12');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [active, setActive] = useState(true);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // מצב אישור הזמנות: 'auto' | 'manual'
  const [approvalMode, setApprovalMode] = useState('auto');

  const loadForEdit = useCallback(async () => {
    if (!listingId) { setLoading(false); return; }
    const raw = await AsyncStorage.getItem(LISTINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const item = list.find(x => x.id === listingId);
    if (!item) { setLoading(false); return; }
    setTitle(item.title || '');
    setAddress(item.address || '');
    setPrice(String(item.price ?? ''));
    setLatitude(item.latitude ? String(item.latitude) : '');
    setLongitude(item.longitude ? String(item.longitude) : '');
    setActive(Boolean(item.active));
    setImages(Array.isArray(item.images) ? item.images : []);
    setApprovalMode(item.approvalMode === 'manual' ? 'manual' : 'auto');
    setLoading(false);
  }, [listingId]);

  useEffect(() => { loadForEdit(); }, [loadForEdit]);

  const useCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('אין הרשאה', 'אפשר הרשאת מיקום כדי להשתמש במיקום הנוכחי.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      setLatitude(String(coords.latitude));
      setLongitude(String(coords.longitude));
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לקבל מיקום נוכחי.');
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('אין הרשאה', 'אפשר גישה לגלריה כדי להעלות תמונות.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: 5,
    });
    if (!res.canceled) {
      const uris = res.assets.map(a => ({ uri: a.uri }));
      setImages(prev => [...prev, ...uris].slice(0, 10));
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('אין הרשאה', 'אפשר גישה למצלמה כדי לצלם תמונות.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (!res.canceled) {
      setImages(prev => [...prev, { uri: res.assets[0].uri }].slice(0, 10));
    }
  }, []);

  const removeImage = useCallback((uri) => {
    setImages(prev => prev.filter(i => i.uri !== uri));
  }, []);

  const save = useCallback(async () => {
    if (!title.trim()) { Alert.alert('שגיאה', 'נא להזין שם/כותרת לחניה.'); return; }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) { Alert.alert('שגיאה', 'מחיר לשעה חייב להיות מספר חיובי.'); return; }

    const latNum = latitude ? Number(latitude) : null;
    const lngNum = longitude ? Number(longitude) : null;
    // תוקן: היה typo ב-Number.isNaN (נכתב בטעות עם ן סופית) וזו הייתה הסיבה שהשמירה לא עבדה
    if ((latitude && Number.isNaN(latNum)) || (longitude && Number.isNaN(lngNum))) {
      Alert.alert('שגיאה', 'קואורדינטות לא תקינות.'); return;
    }

    const raw = await AsyncStorage.getItem(LISTINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];

    if (listingId) {
      const i = list.findIndex(x => x.id === listingId);
      if (i === -1) { Alert.alert('שגיאה', 'החניה לא נמצאה.'); return; }
      list[i] = {
        ...list[i],
        title: title.trim(),
        address: address.trim(),
        price: priceNum,
        latitude: latNum ?? undefined,
        longitude: lngNum ?? undefined,
        images,
        active,
        approvalMode, // שמירת מצב אישור הזמנות
        updatedAt: new Date().toISOString(),
      };
    } else {
      list.unshift({
        id: `ls-${Date.now()}`,
        title: title.trim(),
        address: address.trim(),
        price: priceNum,
        latitude: latNum ?? undefined,
        longitude: lngNum ?? undefined,
        images,
        active: true,
        approvalMode, // ברירת מחדל לפי המתג במסך
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(list));
    navigation.replace('OwnerDashboard');
  }, [listingId, title, address, price, latitude, longitude, active, images, approvalMode, navigation]);

  if (loading) {
    return <View style={styles.center}><Text>טוען…</Text></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding' })}>
      <FlatList
        data={images}
        keyExtractor={(item) => item.uri}
        numColumns={3}
        columnWrapperStyle={{ gap: 10 }}
        ListHeaderComponent={
          <View style={styles.wrap}>
            <Text style={styles.header}>{listingId ? 'עריכת חניה' : 'יצירת חניה חדשה'}</Text>

            <View style={styles.card}>
              <Text style={styles.label}>שם/כותרת</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="לדוגמה: חניה מקורה ברח׳ הרצל 10"
              />

              <Text style={styles.label}>כתובת</Text>
              <PlacesAutocomplete
                placeholder="רחוב, מספר, עיר"
                initialText={address}
                onSelect={async (item) => {
                  const details = await osmLookup(item.placeId);
                  if (details) {
                    setAddress(details.address || item.description || '');
                    if (typeof details.latitude === 'number') setLatitude(String(details.latitude));
                    if (typeof details.longitude === 'number') setLongitude(String(details.longitude));
                  } else {
                    setAddress(item.description || '');
                  }
                }}
                containerStyle={{ marginBottom: 8 }}
              />
              {/* לא לשכוח לאפשר גם עריכה ידנית ב-TextInput אם תרצה, כרגע ה-Autocomplete שולט */}

              <Text style={styles.label}>מחיר לשעה (₪)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="לדוגמה: 12"
                keyboardType="numeric"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Latitude</Text>
                  <TextInput
                    style={styles.input}
                    value={latitude}
                    onChangeText={setLatitude}
                    placeholder="לדוגמה: 32.08"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Longitude</Text>
                  <TextInput
                    style={styles.input}
                    value={longitude}
                    onChangeText={setLongitude}
                    placeholder="לדוגמה: 34.78"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.smallBtn} onPress={useCurrentLocation}>
                <Ionicons name="locate" size={16} color="#00C6FF" style={{ marginEnd: 6 }} />
                <Text style={styles.smallBtnText}>קח מיקום נוכחי</Text>
              </TouchableOpacity>

              {listingId && (
                <View style={styles.switchRow}>
                  <Text style={styles.label}>חניה פעילה</Text>
                  <Switch value={active} onValueChange={setActive} />
                </View>
              )}
            </View>

            {/* הגדרות אישור הזמנות */}
            <View style={styles.card}>
              <Text style={styles.section}>אישור הזמנות</Text>
              <View style={styles.switchRow}>
                <Text style={styles.label}>אישור ידני לכל הזמנה</Text>
                <Switch
                  value={approvalMode === 'manual'}
                  onValueChange={(v) => setApprovalMode(v ? 'manual' : 'auto')}
                />
              </View>
              <Text style={styles.hint}>
                במצב "אישור ידני" — הזמנות יישמרו כ־"ממתין לאישור" ולא יוגדרו להן התראות עד אישור.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>תמונות החניה</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.imageBtn} onPress={pickFromLibrary}>
                  <Ionicons name="images" size={18} color="#0b6aa8" style={{ marginEnd: 6 }} />
                  <Text style={styles.imageBtnText}>מהגלריה</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                  <Ionicons name="camera" size={18} color="#0b6aa8" style={{ marginEnd: 6 }} />
                  <Text style={styles.imageBtnText}>צלם</Text>
                </TouchableOpacity>
              </View>
              {images.length === 0 && (
                <Text style={[styles.hint, { marginTop: 8 }]}>אין תמונות עדיין. מומלץ להעלות 1–5 תמונות.</Text>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.thumb}>
            <Image source={{ uri: item.uri }} style={styles.thumbImg} />
            <TouchableOpacity style={styles.removeX} onPress={() => removeImage(item.uri)}>
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View style={{ padding: 14 }}>
            <TouchableOpacity style={styles.primary} onPress={save}>
              <Text style={styles.primaryText}>{listingId ? 'שמור שינויים' : 'צור חניה'}</Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        }
        contentContainerStyle={{ padding: 14, backgroundColor: '#f6f9fc', gap: 10 }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  wrap: { backgroundColor: '#f6f9fc', paddingBottom: 10 },
  header: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ecf1f7' },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 13, color: '#555', marginTop: 6, marginBottom: 6 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#e3e9f0', backgroundColor: '#fff', paddingHorizontal: 12, fontSize: 15 },
  smallBtn: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#00C6FF', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' },
  smallBtnText: { color: '#00C6FF', fontWeight: '700' },
  switchRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imageBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cfe3ff', backgroundColor: '#eaf4ff' },
  imageBtnText: { color: '#0b6aa8', fontWeight: '800' },
  thumb: { width: 92, height: 92, borderRadius: 10, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#e6edf6', backgroundColor: '#f7fbff', marginBottom: 10, marginRight: 10 },
  thumbImg: { width: '100%', height: '100%' },
  removeX: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#00C6FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  hint: { fontSize: 12, color: '#6c7a89' },
});

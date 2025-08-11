// screens/BookingScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Alert,
  ScrollView, KeyboardAvoidingView, TextInput, Keyboard, Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { scheduleBookingNotifications, cancelBookingNotifications } from '../utils/notify';

const PROFILE_KEY = 'profile';
const VEHICLES_KEY = 'vehicles';
const BOOKINGS_KEY = 'bookings';
const LISTINGS_KEY = 'owner_listings';

function msToHhMm(ms) {
  if (ms <= 0) return '00:00';
  const totalMin = Math.floor(ms / (60 * 1000));
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}`;
}
function paymentLabel(key) {
  switch (key) {
    case 'paypal': return 'PayPal';
    case 'applepay': return 'Apple Pay';
    case 'card':
    default: return 'כרטיס אשראי';
  }
}
function hasOverlap(bookings, startISO, endISO, excludeId = null) {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return bookings.some(b => {
    if (excludeId && b.id === excludeId) return false;
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    return s < be && e > bs;
  });
}

export default function BookingScreen({ route, navigation }) {
  const params = route?.params || {};
  const spot = params.spot || params.parkingSpot || null;
  const editingId = params.bookingId || null;

  const pricePerHour = typeof spot?.price === 'number' ? spot.price : 10;

  const [start, setStart] = useState(() => {
    const s = params.initialStart ? new Date(params.initialStart) : new Date();
    s.setMinutes(0, 0, 0);
    return s;
  });
  const [end, setEnd] = useState(() => {
    const e = params.initialEnd ? new Date(params.initialEnd) : new Date();
    e.setHours(e.getHours() + 1, 0, 0, 0);
    return e;
  });

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [plate, setPlate] = useState('');
  const [carDesc, setCarDesc] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);
        if (rawProfile) {
          const p = JSON.parse(rawProfile);
          if (p?.payment) setPaymentMethod(p.payment);
        }
        const rawVehicles = await AsyncStorage.getItem(VEHICLES_KEY);
        const list = rawVehicles ? JSON.parse(rawVehicles) : [];
        setVehicles(list);
        const def = list.find(v => v.isDefault) || list[0];
        if (def) {
          setSelectedVehicleId(def.id);
          setPlate(def.plate || '');
          setCarDesc(def.desc || '');
        } else {
          const savedPlate = await AsyncStorage.getItem('plate');
          const savedDesc  = await AsyncStorage.getItem('carDesc');
          if (savedPlate) setPlate(savedPlate);
          if (savedDesc)  setCarDesc(savedDesc);
        }
      } catch {
        try {
          const savedPlate = await AsyncStorage.getItem('plate');
          const savedDesc  = await AsyncStorage.getItem('carDesc');
          if (savedPlate) setPlate(savedPlate);
          if (savedDesc)  setCarDesc(savedDesc);
        } catch {}
      }
    })();
  }, []);

  const { hours, total, invalid } = useMemo(() => {
    const diffMs = end - start;
    const h = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    return { hours: h, total: h * pricePerHour, invalid: diffMs <= 0 };
  }, [start, end, pricePerHour]);

  const now = new Date();
  const isActive = spot && start <= now && now < end;
  const timeLeft = isActive ? end - now : 0;

  const bumpEnd = (mins) => setEnd(prev => new Date(prev.getTime() + mins * 60 * 1000));

  const upsertBooking = async (booking) => {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (booking.id) {
      const idx = list.findIndex(b => b.id === booking.id);
      if (idx !== -1) list[idx] = booking;
      else list.unshift(booking);
    } else {
      list.unshift(booking);
    }
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
  };

  const confirm = useCallback(async () => {
    if (!spot) { navigation.goBack(); return; }
    if (invalid) { Alert.alert('שגיאה', 'שעת הסיום חייבת להיות אחרי שעת ההתחלה.'); return; }
    if (!plate.trim()) { Alert.alert('שגיאה', 'נא להזין מספר רכב.'); return; }

    try {
      const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const startISO = new Date(start).toISOString();
      const endISO   = new Date(end).toISOString();
      if (hasOverlap(existing, startISO, endISO, editingId)) {
        Alert.alert('חפיפת הזמנות', 'יש כבר הזמנה אחרת בשעות האלו. עדכן את הזמנים ונסה שוב.');
        return;
      }

      await AsyncStorage.setItem('plate', plate.trim());
      await AsyncStorage.setItem('carDesc', (carDesc || '').trim());

      // בדיקת מצב אישור החניה (אם זו חניית Owner)
      let approvalMode = 'auto';
      try {
        if (spot?.ownerListingId) {
          const rawL = await AsyncStorage.getItem(LISTINGS_KEY);
          const list = rawL ? JSON.parse(rawL) : [];
          const item = list.find(x => x.id === spot.ownerListingId);
          if (item?.approvalMode === 'manual') approvalMode = 'manual';
        }
      } catch {}

      if (editingId) {
        const prev = existing.find(b => b.id === editingId);
        if (prev?.notificationIds) {
          try { await cancelBookingNotifications(prev.notificationIds); } catch {}
        }
      }

      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;

      const bookingBase = {
        spot: {
          id: spot.id,
          address: spot.address,
          title: spot.title || spot.address || 'חניה',
          price: pricePerHour,
          latitude: spot.latitude,
          longitude: spot.longitude,
          images: spot.images || [],
        },
        ownerListingId: spot.ownerListingId ?? null,
        plate: plate.trim(),
        carDesc: (carDesc || '').trim(),
        vehicleId: selectedVehicle ? selectedVehicle.id : null,
        paymentMethod,
        start: startISO,
        end: endISO,
        hours,
        total,
        alerted30: false,
        status: approvalMode === 'manual' ? 'pending' : 'confirmed',
        updatedAt: new Date().toISOString(),
      };

      const booking = editingId
        ? { ...bookingBase, id: editingId }
        : { ...bookingBase, id: `b-${Date.now()}`, createdAt: new Date().toISOString() };

      // התראות רק בהזמנה מאושרת
      if (booking.status === 'confirmed') {
        try {
          const notifIds = await scheduleBookingNotifications(booking);
          booking.notificationIds = notifIds;
        } catch {}
      }

      await upsertBooking(booking);

      Keyboard.dismiss();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (booking.status === 'pending') {
        Alert.alert(
          'הזמנה נשלחה לאישור',
          `ההזמנה ממתינה לאישור בעל/ת החניה.\nחניה: ${booking.spot.title}\nכתובת: ${booking.spot.address || '—'}\nמס׳ רכב: ${booking.plate}\nרכב: ${booking.carDesc || 'לא צוין'}\nמתאריך: ${dayjs(start).format('DD/MM/YYYY HH:mm')}\nעד: ${dayjs(end).format('DD/MM/YYYY HH:mm')}\nמשך: ${hours} שעות\nסה״כ משוער: ₪${total}`,
          [{ text: 'סגור', onPress: () => navigation.navigate('Bookings') }]
        );
      } else {
        Alert.alert(
          editingId ? 'הזמנה עודכנה' : 'הזמנה בוצעה (דמו)',
          `חניה: ${booking.spot.title}
כתובת: ${booking.spot.address || '—'}
מס׳ רכב: ${booking.plate}
רכב: ${booking.carDesc || 'לא צוין'}
אמצעי תשלום: ${paymentLabel(paymentMethod)}
מתאריך: ${dayjs(start).format('DD/MM/YYYY HH:mm')}
עד: ${dayjs(end).format('DD/MM/YYYY HH:mm')}
משך: ${hours} שעות
סה״כ: ₪${total}`,
          [{ text: 'סגור', onPress: () => navigation.navigate('Bookings') }]
        );
      }
    } catch (e) {}
  }, [spot, plate, carDesc, start, end, hours, total, invalid, navigation, pricePerHour, editingId, vehicles, selectedVehicleId, paymentMethod]);

  if (!spot) {
    return (
      <View style={styles.center}>
        <Text>לא התקבלה חניה</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>חזרה</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = spot.images || [];

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding' })}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.header}>פרטי הזמנה</Text>

          <View style={styles.card}>
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:10 }}>
                {images.map((img, idx) => (
                  <Image key={`${img.uri}-${idx}`} source={{ uri: img.uri }} style={styles.heroImg} />
                ))}
              </ScrollView>
            )}

            <Text style={styles.title}>{spot.title || spot.address || 'חניה'}</Text>
            <Text style={styles.line}>כתובת: {spot.address || '—'}</Text>
            {!!spot.distanceKm && <Text style={styles.line}>מרחק: {Number(spot.distanceKm).toFixed(2)} ק״מ</Text>}
            <Text style={styles.line}>מחיר לשעה: ₪{pricePerHour}</Text>

            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>פעיל עכשיו • נותר: {msToHhMm(timeLeft)}</Text>
              </View>
            )}
            <Text style={[styles.hint, { marginTop: 6 }]}>
              {spot.ownerListingId ? 'ייתכן וההזמנה תדרוש אישור בעל/ת החניה.' : 'חניית דמו – אישור מיידי.'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>בחר תאריך ושעות</Text>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>התחלה</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.pickerText}>{dayjs(start).format('DD/MM/YYYY HH:mm')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>סיום</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.pickerText}>{dayjs(end).format('DD/MM/YYYY HH:mm')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={start}
                mode="datetime"
                is24Hour
                onChange={(_, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) {
                    const s = new Date(date);
                    if (s >= end) {
                      const newEnd = new Date(s);
                      newEnd.setHours(newEnd.getHours() + 1, 0, 0, 0);
                      setEnd(newEnd);
                    }
                    setStart(s);
                  }
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={end}
                mode="datetime"
                is24Hour
                minimumDate={start}
                onChange={(_, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) setEnd(new Date(date));
                }}
              />
            )}

            <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
              <TouchableOpacity style={styles.quickBtn} onPress={() => bumpEnd(30)}>
                <Text style={styles.quickBtnText}>+30 דק׳</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => bumpEnd(60)}>
                <Text style={styles.quickBtnText}>+60 דק׳</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => bumpEnd(-30)}>
                <Text style={styles.quickBtnText}>-30 דק׳</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>החיוב לפי שעות שימוש, עיגול מעלה לשעה הקרובה (מינימום שעה).</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>הרכב להזמנה</Text>

            <Text style={styles.label}>מספר רכב</Text>
            <TextInput
              style={styles.input}
              placeholder="לדוגמה: 12-345-67"
              value={plate}
              onChangeText={setPlate}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.label}>תיאור רכב (לא חובה)</Text>
            <TextInput
              style={styles.input}
              placeholder="לדוגמה: מאזדה 3 לבנה"
              value={carDesc}
              onChangeText={setCarDesc}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>תשלום</Text>
            <Text style={styles.line}>אמצעי תשלום: {paymentLabel(paymentMethod)}</Text>
            <Text style={styles.hint}>אפשר לערוך את ברירת המחדל במסך ״הפרופיל שלי״.</Text>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryText}>סה״כ שעות: {hours}</Text>
            <Text style={styles.summaryText}>סה״כ לתשלום: ₪{total}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (invalid || !plate.trim()) && { opacity: 0.6 }]}
            disabled={invalid || !plate.trim()}
            onPress={confirm}
          >
            <Text style={styles.buttonText}>{editingId ? 'שמור שינויים' : 'שלח הזמנה'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonGhost} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonGhostText}>חזרה</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container:{ padding:20, backgroundColor:'#f6f9fc' },
  center:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' },
  header:{ fontSize:22, fontWeight:'800', marginBottom:12, textAlign:'center' },
  card:{ backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{ width:0, height:3 }, elevation:2 },
  title:{ fontSize:18, fontWeight:'700', marginBottom:6 },
  line:{ fontSize:15, marginVertical:2 },
  hint:{ fontSize:12, color:'#6c7a89' },
  section:{ fontSize:16, fontWeight:'700', marginBottom:10 },
  row:{ flexDirection:'row', gap:12 }, col:{ flex:1 },
  label:{ fontSize:13, color:'#555', marginTop:6, marginBottom:6 },
  pickerBtn:{ paddingVertical:12, paddingHorizontal:14, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fafbff' },
  pickerText:{ fontSize:15 },
  input:{ height:48, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fff', paddingHorizontal:12, marginBottom:10, fontSize:15 },
  summary:{ backgroundColor:'#eef8ff', borderColor:'#d6ecff', borderWidth:1, borderRadius:12, padding:12, marginTop:4, marginBottom:12 },
  summaryText:{ fontSize:16, fontWeight:'600' },
  button:{ backgroundColor:'#00C6FF', paddingVertical:14, borderRadius:12, alignItems:'center' },
  buttonText:{ color:'#fff', fontSize:16, fontWeight:'800' },
  buttonGhost:{ marginTop:10, paddingVertical:12, borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#00C6FF', backgroundColor:'#fff' },
  buttonGhostText:{ color:'#00C6FF', fontSize:15, fontWeight:'700' },
  quickBtn:{ paddingVertical:10, paddingHorizontal:12, backgroundColor:'#eaf7ff', borderRadius:10, borderWidth:1, borderColor:'#cfefff' },
  quickBtnText:{ color:'#007acc', fontWeight:'700' },
  activeBadge:{ marginTop:6, alignSelf:'flex-start', backgroundColor:'#e8fff2', borderColor:'#b9f5cf', borderWidth:1, borderRadius:8, paddingHorizontal:10, paddingVertical:6 },
  activeText:{ color:'#0a7a3e', fontWeight:'700' },
  heroImg:{ width:200, height:120, borderRadius:10, marginRight:8 },
});

// screens/BookingScreen.js
// RTL מלא. בחירת התחלה וסיום (פאנל גלגלים ייעודי, החלקה ימ/שמ ליום קודם/הבא), בלי קיצורי 15/30.
// נשמרו כללי מינימום שעה, חפיפות, התראות, ועוד.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  Keyboard,
  Image,
  I18nManager,
  Modal,
  FlatList,
  PanResponder,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/he';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { scheduleBookingNotifications, cancelBookingNotifications } from '../utils/notify';
import { useTheme } from '@shopify/restyle';
import ZpButton from '../components/ui/ZpButton';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { createBooking } from '../services/api/bookings';
import NetworkStatus from '../components/NetworkStatus';

dayjs.locale('he');

// ודא ש-RTL מאופשר (בעיקר לאנדרואיד)
try { I18nManager.allowRTL(true); } catch {}

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
const roundTo5 = (d) => {
  const dt = new Date(d);
  const m = dt.getMinutes();
  const rounded = Math.round(m / 5) * 5;
  dt.setMinutes(rounded, 0, 0);
  return dt;
};

// ===== WheelPicker כללי עם Snap =====
const ITEM_H = 40;
function WheelPicker({
  data, value, onChange, height = ITEM_H * 5, style, textStyle,
}) {
  const listRef = React.useRef(null);
  const selectedIndex = Math.max(0, data.findIndex(d => d.value === value));
  const snapTo = (index) => {
    const clamped = Math.max(0, Math.min(index, data.length - 1));
    listRef.current?.scrollToOffset({ offset: clamped * ITEM_H, animated: true });
    onChange?.(data[clamped].value);
  };
  React.useEffect(() => {
    const id = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: selectedIndex * ITEM_H, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onScrollEnd = (e) => {
    const offset = e.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ITEM_H);
    snapTo(index);
  };
  const renderItem = ({ item }) => {
    const isActive = item.value === value;
    return (
      <View style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'flex-end', alignSelf: 'stretch', paddingHorizontal: 12 }}>
        <Text style={[{ fontSize: 16, color: isActive ? '#111827' : '#94A3B8', fontWeight: isActive ? '800' : '600', textAlign: 'right', writingDirection: 'rtl' }, textStyle]}>
          {item.label}
        </Text>
      </View>
    );
  };
  return (
    <View style={[{ height, overflow: 'hidden' }, style]}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: (height - ITEM_H) / 2, height: ITEM_H, left: 0, right: 0,
                 borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', zIndex: 1 }}
      />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        contentContainerStyle={{ paddingTop: (height - ITEM_H) / 2, paddingBottom: (height - ITEM_H) / 2 }}
      />
    </View>
  );
}

// ===== עזר לפאנל =====
const roundTo5local = (d) => { const x = new Date(d); x.setMinutes(Math.round(x.getMinutes()/5)*5, 0, 0); return x; };
const clampToMin = (date, min) => (!min || date >= min) ? date : new Date(min);

const daysArray = (baseMin, span = 180) => {
  const out = [];
  const startDay = baseMin ? new Date(baseMin) : new Date();
  startDay.setHours(0,0,0,0);
  for (let i=0; i<=span; i++){
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    out.push({ value: d.getTime(), label: dayjs(d).format('DD/MM ddd') });
  }
  return out;
};
const hoursArray = () => Array.from({ length: 24 }, (_, h) => ({ value: h, label: String(h).padStart(2,'0') }));
const minutesArray = (step = 5) => Array.from({ length: 60/step }, (_, i) => {
  const m = i*step;
  return { value: m, label: String(m).padStart(2,'0') };
});

// ===== הפאנל התחתון לבחירת תאריך/שעה =====
function WheelsDateTimePanel({ visible, initial, onClose, onConfirm, minimumDate, title='בחרו תאריך ושעה' }) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const gradStart = theme.colors?.gradientStart ?? theme.colors.primary;
  const gradEnd   = theme.colors?.gradientEnd ?? theme.colors.primary;

  const min = minimumDate ? roundTo5local(new Date(minimumDate)) : null;
  const init = clampToMin(roundTo5local(initial), min);

  const [selDay, setSelDay]   = useState(new Date(init.getFullYear(), init.getMonth(), init.getDate(), 0, 0, 0, 0).getTime());
  const [selHour, setSelHour] = useState(init.getHours());
  const [selMin, setSelMin]   = useState(init.getMinutes());

  useEffect(() => {
    if (!visible) return;
    const i = clampToMin(roundTo5local(initial), min);
    const d0 = new Date(i); d0.setHours(0,0,0,0);
    setSelDay(d0.getTime());
    setSelHour(i.getHours());
    setSelMin(i.getMinutes());
  }, [visible, initial, minimumDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMinDay = !!min && new Date(selDay).getTime() === new Date(min.getFullYear(),min.getMonth(),min.getDate(),0,0,0,0).getTime();
  const minHour  = isMinDay ? min.getHours() : 0;
  const minMin   = (isMinDay && selHour === minHour) ? min.getMinutes() : 0;

  const dayData = daysArray(min);
  const hourData = hoursArray().map(it => ({
    ...it, label: (isMinDay && it.value < minHour) ? `· ${String(it.value).padStart(2,'0')}` : it.label
  }));
  const minuteData = minutesArray(5).map(it => ({
    ...it, label: (isMinDay && selHour === minHour && it.value < minMin) ? `· ${String(it.value).padStart(2,'0')}` : it.label
  }));

  // חיצים + החלקה ימ/שמ לשינוי יום
  const swipeResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dy) < 10,
      onPanResponderRelease: (_, g) => {
        const i = dayData.findIndex(d => d.value === selDay);
        if (g.dx > 30 && i > 0) setSelDay(dayData[i - 1].value);               // ימינה = יום קודם
        else if (g.dx < -30 && i < dayData.length - 1) setSelDay(dayData[i + 1].value); // שמאלה = יום הבא
      },
    })
  ).current;

  const compose = () => {
    let dt = new Date(selDay);
    dt.setHours(selHour, selMin, 0, 0);
    dt = roundTo5local(dt);
    dt = clampToMin(dt, min);
    return dt;
  };

  const headerStr = dayjs(compose()).format('dddd • DD/MM/YYYY • HH:mm');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <LinearGradient colors={[gradStart, gradEnd]} start={{ x:0,y:1 }} end={{ x:1,y:0 }} style={styles.modalHeaderGrad}>
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalSubtitle}>{headerStr}</Text>
          </LinearGradient>

          <View style={styles.dayRow} {...swipeResponder.panHandlers}>
            {/* ימני = יום קודם */}
            <TouchableOpacity
              onPress={() => {
                const i = dayData.findIndex(d => d.value === selDay);
                if (i > 0) setSelDay(dayData[i - 1].value);
              }}
              style={styles.arrowBtn}
              activeOpacity={0.9}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={{ flex:1, alignItems:'center' }}>
              <WheelPicker
                data={dayData}
                value={selDay}
                onChange={(val) => {
                  setSelDay(val);
                  if (isMinDay && selHour < minHour) setSelHour(minHour);
                  if (isMinDay && selHour === minHour && selMin < minMin) setSelMin(minMin);
                }}
                height={ITEM_H * 5}
              />
            </View>

            {/* שמאלי = יום הבא */}
            <TouchableOpacity
              onPress={() => {
                const i = dayData.findIndex(d => d.value === selDay);
                if (i < dayData.length - 1) setSelDay(dayData[i + 1].value);
              }}
              style={styles.arrowBtn}
              activeOpacity={0.9}
            >
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.hmWrapWheels}>
            <View style={styles.hmColWheel}>
              <Text style={styles.hmLabel}>שעה</Text>
              <WheelPicker
                data={hourData}
                value={Math.max(selHour, minHour)}
                onChange={(h) => {
                  if (isMinDay && h < minHour) h = minHour;
                  setSelHour(h);
                  if (isMinDay && h === minHour && selMin < minMin) setSelMin(minMin);
                }}
              />
            </View>

            <View style={styles.hmColWheel}>
              <Text style={styles.hmLabel}>דקות</Text>
              <WheelPicker
                data={minuteData}
                value={Math.max(selMin, (isMinDay && selHour === minHour) ? minMin : 0)}
                onChange={(m) => {
                  if (isMinDay && selHour === minHour && m < minMin) m = minMin;
                  setSelMin(m);
                }}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, styles.modalBtnGhost, { marginStart: 8 }]} activeOpacity={0.9}>
              <Text style={styles.modalBtnGhostText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(compose())} style={[styles.modalBtn, styles.modalBtnPrimary]} activeOpacity={0.9}>
              <Text style={styles.modalBtnPrimaryText}>אישור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function BookingScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token } = useAuth();

  const params = route?.params || {};
  const spot = params.spot || params.parkingSpot || null; // תמיכה בשני שמות פרופס
  const editingId = params.bookingId || null;

  const pricePerHour = typeof spot?.price === 'number' ? spot.price : 10;

  const [start, setStart] = useState(() => {
    const s = params.initialStart ? new Date(params.initialStart) : new Date();
    s.setSeconds(0, 0);
    return roundTo5(s);
  });
  const [end, setEnd] = useState(() => {
    const e = params.initialEnd ? new Date(params.initialEnd) : new Date();
    e.setHours(e.getHours() + 1, 0, 0, 0); // ברירת מחדל: שעה אחרי ההתחלה
    return e;
  });

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [plate, setPlate] = useState('');
  const [carDesc, setCarDesc] = useState('');

  // פאנל גלגלים
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelMode, setPanelMode] = useState('start'); // 'start' | 'end'

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

  const MIN_MS = 60 * 60 * 1000; // מינימום שעה

  const { hours, total, invalid } = useMemo(() => {
    const diffMs = end - start;
    const h = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    return { hours: h, total: h * pricePerHour, invalid: diffMs <= 0 };
  }, [start, end, pricePerHour]);

  const now = new Date();
  const isActive = spot && start <= now && now < end;
  const timeLeft = isActive ? end - now : 0;

  const upsertBooking = async (booking) => {
    let serverSuccess = false;
    
    try {
      // בדיקה אם המשתמש מחובר
      if (!isAuthenticated) {
        throw new Error('המשתמש לא מחובר - נדרשת התחברות');
      }
      
      if (!token) {
        throw new Error('לא נמצא טוקן אימות - נדרשת התחברות מחדש');
      }
      
      // שליחה לשרת באמצעות השירות החדש
      if (booking.spot?.parkingId || booking.spot?.id) {
        // חיפוש ה-parking ID האמיתי
        let parkingId;
        
        if (booking.spot.parkingId) {
          parkingId = parseInt(booking.spot.parkingId);
        } else if (booking.spot.id && booking.spot.id.startsWith('parking-')) {
          // אם ה-ID הוא 'parking-15', נחלץ את 15
          const numericId = booking.spot.id.replace('parking-', '');
          parkingId = parseInt(numericId);
        } else {
          parkingId = parseInt(booking.spot.id);
        }
        
        if (isNaN(parkingId)) {
          throw new Error(`מזהה חניה לא תקין: ${booking.spot.id}`);
        }
        
        const serverBooking = {
          parkingId: parkingId,
          startTime: booking.start,
          endTime: booking.end,
          status: booking.status === 'confirmed' ? 'CONFIRMED' : 'PENDING'
        };
        
        console.log('🚀 Creating booking on server:', serverBooking);
        console.log('🔍 Token available:', !!token);
        console.log('🔍 Token value:', token ? `${token.substring(0, 20)}...` : 'null');
        console.log('🔍 User authenticated:', !!isAuthenticated);
        
        const result = await createBooking(serverBooking);
        console.log('📨 Server response:', result);
        
        if (result.success) {
          console.log('✅ Server booking created successfully:', result.data);
          booking.serverId = result.data.id;
          serverSuccess = true;
          
          // הודעת הצלחה
          Alert.alert(
            'הזמנה נשלחה בהצלחה! ✅',
            'ההזמנה נשמרה בשרת ותוצג בכל המכשירים שלך.'
          );
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('לא נמצא מזהה חניה תקין');
      }
    } catch (error) {
      console.error('❌ Failed to send booking to server:', error);
      
      // הודעה מותאמת אישית לסוגי שגיאות שונים
      if (error.message.includes('מחובר') || error.message.includes('טוקן')) {
        Alert.alert(
          'נדרשת התחברות 🔐', 
          `${error.message}\n\nההזמנה נשמרה מקומית. להתחבר ולסנכרן?`,
          [
            { text: 'לא עכשיו', style: 'cancel' },
            { 
              text: 'התחבר', 
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else if (error.message.includes('חיבור') || error.message.includes('Network') || error.message.includes('timeout')) {
        Alert.alert(
          'בעיית חיבור 🌐', 
          `לא ניתן להתחבר לשרת כרגע.\n\nההזמנה נשמרה מקומית ותסונכרן אוטומטי כשהחיבור יחזור.`,
          [
            { text: 'הבנתי', style: 'default' }
          ]
        );
      } else {
        Alert.alert(
          'שגיאה בשליחה לשרת', 
          `${error.message}\n\nההזמנה נשמרה מקומית ותישלח כשהבעיה תיפתר.`
        );
      }
    }
    
    // שמירה מקומית (תמיד - כגיבוי או כפתרון זמני)
    try {
      const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      
      // סמן אם ההזמנה נשלחה לשרת בהצלחה
      booking.syncedToServer = serverSuccess;
      booking.lastSyncAttempt = new Date().toISOString();
      
      if (booking.id) {
        const idx = list.findIndex(b => b.id === booking.id);
        if (idx !== -1) list[idx] = booking;
        else list.unshift(booking);
      } else {
        list.unshift(booking);
      }
      
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
      console.log('💾 Booking saved locally');
    } catch (localError) {
      console.error('❌ Failed to save booking locally:', localError);
      Alert.alert('שגיאה קריטית', 'לא ניתן לשמור את ההזמנה גם לא מקומית');
    }
    
    return serverSuccess;
  };

  const openPanel = (mode) => {
    setPanelMode(mode);
    setPanelVisible(true);
  };

  const handlePanelConfirm = (picked) => {
    if (panelMode === 'start') {
      setStart(roundTo5(picked));
      if (end - picked < MIN_MS) {
        const e = new Date(picked.getTime() + MIN_MS);
        setEnd(roundTo5(e));
      }
    } else {
      if (picked - start < MIN_MS) {
        const e = new Date(start.getTime() + MIN_MS);
        setEnd(roundTo5(e));
      } else {
        setEnd(roundTo5(picked));
      }
    }
    setPanelVisible(false);
  };

  const confirm = useCallback(async () => {
    if (!spot) { navigation.goBack(); return; }
    if (!plate.trim()) { Alert.alert('שגיאה', 'נא להזין מספר רכב.'); return; }
    if (end - start < MIN_MS) {
      Alert.alert('שגיאה', 'הסיום חייב להיות לפחות שעה אחרי ההתחלה.');
      return;
    }

    let serverSyncSuccess = false;

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
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        hours,
        total,
        alerted30: false,
        status: approvalMode === 'manual' ? 'pending' : 'confirmed',
        updatedAt: new Date().toISOString(),
      };

      const booking = editingId
        ? { ...bookingBase, id: editingId }
        : { ...bookingBase, id: `b-${Date.now()}`, createdAt: new Date().toISOString() };

      if (booking.status === 'confirmed') {
        try {
          const notifIds = await scheduleBookingNotifications(booking);
          booking.notificationIds = notifIds;
        } catch {}
      }

      serverSyncSuccess = await upsertBooking(booking);

      Keyboard.dismiss();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const syncStatus = serverSyncSuccess ? '✅ נשמרה בשרת' : '📱 נשמרה מקומית';
      const statusText = editingId ? 'הזמנה עודכנה' : (booking.status === 'pending' ? 'הזמנה נשלחה לאישור' : 'הזמנה בוצעה');
      
      Alert.alert(
        `${statusText} ${syncStatus}`,
        `חניה: ${booking.spot.title}
כתובת: ${booking.spot.address || '—'}
מס׳ רכב: ${booking.plate}
רכב: ${booking.carDesc || 'לא צוין'}
אמצעי תשלום: ${paymentLabel(paymentMethod)}
מתאריך: ${dayjs(start).format('DD/MM/YYYY HH:mm')}
עד: ${dayjs(end).format('DD/MM/YYYY HH:mm')}
משך: ${hours} שעות
סה״כ: ₪${total}${!serverSyncSuccess ? '\n\n💡 ההזמנה תסונכרן לשרת כשתתחבר' : ''}`,
        [{ text: 'סגור', onPress: () => navigation.navigate('Bookings') }]
      );
    } catch (e) {}
  }, [spot, plate, carDesc, start, end, hours, total, navigation, pricePerHour, editingId, vehicles, selectedVehicleId, paymentMethod]);

  if (!spot) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>לא התקבלה חניה</Text>
      </View>
    );
  }

  const images = spot.images || [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding' })}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        style={{ direction: 'rtl' }}
      >
        {/* מצב חיבור לשרת */}
        <NetworkStatus showDetails={true} />
        
        {/* כרטיס מידע על החניה */}
        <View style={styles.card}>
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ flexDirection: 'row-reverse' }}>
              {images.map((img, idx) => (
                <Image key={`${img?.uri || 'img'}-${idx}`} source={{ uri: img.uri }} style={styles.heroImg} />
              ))}
            </ScrollView>
          )}

          {/* כותרת שם החניה — במרכז */}
          <Text style={styles.title}>{spot.title || spot.address || 'חניה'}</Text>

          <Text style={styles.line}>כתובת: {spot.address || '—'}</Text>
          {!!spot.distanceKm && <Text style={styles.line}>מרחק: {Number(spot.distanceKm).toFixed(2)} ק״מ</Text>}
          <Text style={styles.line}>מחיר לשעה: ₪{pricePerHour}</Text>

          {isActive && (
            <View style={styles.activeBadge}>
              <Ionicons name="time-outline" size={14} color={theme.colors.success} style={{ marginStart: 6 }} />
              <Text style={styles.activeText}>פעיל עכשיו • נותר: {msToHhMm(timeLeft)}</Text>
            </View>
          )}

          <Text style={[styles.hint, { marginTop: 6 }]}>
            {spot.ownerListingId ? 'ייתכן וההזמנה תדרוש אישור בעל/ת החניה.' : 'חניית דמו – אישור מיידי.'}
          </Text>
        </View>

        {/* בחירת זמנים – התחלה/סיום (כפתור פותח פאנל גלגלים) */}
        <View style={styles.card}>
          <Text style={styles.section}>בחרו תאריך ושעה</Text>

          {/* התחלה */}
          <View style={{ marginTop: 6, alignItems: 'flex-start' }}>
            <View style={styles.rowHeader}>
              <Ionicons name="play" size={14} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
              <Text style={styles.labelStrong}>התחלה</Text>
            </View>
            <View style={styles.fieldsRow}>
              <TouchableOpacity style={styles.fieldButton} onPress={() => openPanel('start')} activeOpacity={0.9}>
                <Ionicons name="calendar-outline" size={16} style={styles.fieldIcon} />
                <Text style={styles.fieldButtonText}>{dayjs(start).format('DD/MM/YYYY • HH:mm')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* סיום */}
          <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
            <View style={styles.rowHeader}>
              <Ionicons name="square" size={12} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
              <Text style={styles.labelStrong}>סיום</Text>
            </View>
            <View style={styles.fieldsRow}>
              <TouchableOpacity style={styles.fieldButton} onPress={() => openPanel('end')} activeOpacity={0.9}>
                <Ionicons name="time-outline" size={16} style={styles.fieldIcon} />
                <Text style={styles.fieldButtonText}>{dayjs(end).format('DD/MM/YYYY • HH:mm')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* הוסרה תיבת הטווח */}
          <Text style={[styles.hint, { marginTop: theme.spacing.xs }]}>
            מינימום שעה בין התחלה לסיום. החיוב לפי שעות שימוש (עיגול מעלה).
          </Text>
        </View>

        {/* פרטי רכב */}
        <View style={styles.card}>
          <Text style={styles.section}>הרכב להזמנה</Text>

          <Text style={styles.label}>מספר רכב</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: 12-345-67"
            value={plate}
            onChangeText={setPlate}
            keyboardType="numbers-and-punctuation"
            placeholderTextColor={theme.colors.subtext}
          />

        <Text style={styles.label}>תיאור רכב (לא חובה)</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: מאזדה 3 לבנה"
            value={carDesc}
            onChangeText={setCarDesc}
            placeholderTextColor={theme.colors.subtext}
          />
        </View>

        {/* סיכום — עכשיו מעל התשלום, כולל כותרת */}
        <View style={styles.summary}>
          <Text style={styles.section}>סיכום ההזמנה</Text>

          <View style={styles.summaryItem}>
            <Ionicons name="play" size={16} style={{ marginEnd: 6 }} />
            <Text style={styles.summaryText}>התחלה: {dayjs(start).format('DD/MM/YYYY HH:mm')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="square" size={14} style={{ marginEnd: 6 }} />
            <Text style={styles.summaryText}>סיום: {dayjs(end).format('DD/MM/YYYY HH:mm')}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Ionicons name="hourglass-outline" size={16} style={{ marginEnd: 6 }} />
            <Text style={styles.summaryText}>סה״כ שעות: {hours}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="cash-outline" size={16} style={{ marginEnd: 6 }} />
            <Text style={styles.summaryText}>סה״כ לתשלום: ₪{total}</Text>
          </View>
        </View>

        {/* תשלום — הועבר לתחתית העמוד (לפני הכפתור) */}
        <View style={styles.card}>
          <Text style={styles.section}>תשלום</Text>
          <Text style={styles.line}>אמצעי תשלום: {paymentLabel(paymentMethod)}</Text>
          <Text style={styles.hint}>אפשר לערוך את ברירת המחדל במסך ״הפרופיל שלי״.</Text>
        </View>

        {/* פעולות */}
        <ZpButton
          title={editingId ? 'שמור שינויים' : 'שלח הזמנה'}
          onPress={confirm}
          disabled={invalid || !plate.trim()}
          style={{ opacity: (invalid || !plate.trim()) ? 0.6 : 1 }}
          textStyle={{ textAlign: 'left' }}
        />

        <View style={{ height: theme.spacing.lg }} />
      </ScrollView>

      {/* פאנל גלגלים */}
      <WheelsDateTimePanel
        visible={panelVisible}
        initial={panelMode === 'start' ? start : end}
        minimumDate={panelMode === 'start' ? new Date() : new Date(start.getTime() + MIN_MS)}
        onClose={() => setPanelVisible(false)}
        onConfirm={handlePanelConfirm}
        title={panelMode === 'start' ? 'בחרו התחלה' : 'בחרו סיום'}
      />
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  const textBase = { textAlign: 'left', writingDirection: 'rtl', color: colors.text };
  return StyleSheet.create({
    container:{ padding: spacing.lg, backgroundColor: colors.bg, direction:'rtl' },
    center:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor: colors.bg, direction:'rtl' },
    centerText:{ ...textBase, marginBottom: spacing.md },

    // (הכותרת הראשית הוסרה מה־UI; נשארת למקרה עתידי)
    header:{ color: colors.text, fontSize:22, fontWeight:'800', marginBottom: spacing.md, textAlign:'center', writingDirection:'rtl' },

    // Card בסיסי
    card:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2,
      borderWidth:1, borderColor: colors.border,
      direction:'rtl'
    },

    // טקסטים שמאלה
    section:{ ...textBase, fontSize:16, fontWeight:'800', marginBottom: 6 },
    title:{ ...textBase, textAlign:'center', fontSize:18, fontWeight:'800', marginBottom:6 },
    line:{ ...textBase, fontSize:15, marginVertical:2 },
    hint:{ textAlign:'left', writingDirection:'rtl', color: colors.subtext, fontSize:12 },

    // Inputs
    label:{ textAlign:'left', writingDirection:'rtl', fontSize:13, color: colors.subtext, marginTop:6, marginBottom:6 },
    labelStrong:{ ...textBase, fontSize:14, fontWeight:'800' },
    input:{
      height:48, borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal:12, fontSize:15, marginBottom:8,
      color: colors.text, textAlign:'left', writingDirection:'rtl'
    },

    // אזור בחירת זמן — שמאלה
    rowHeader:{ flexDirection:'row', alignItems:'center', marginBottom: 4 },
    fieldsRow:{ flexDirection:'row', gap: 8, marginTop: 6 },
    fieldButton:{
      flex:1,
      height:48,
      borderRadius: borderRadii.sm,
      borderWidth:1,
      borderColor: colors.border,
      backgroundColor:'#F7F9FF',
      alignItems:'flex-start',
      justifyContent:'center',
      paddingHorizontal:12
    },
    fieldButtonText:{ ...textBase, fontSize:16, fontWeight:'800' },
    fieldIcon:{ position:'absolute', right:12, color: colors.subtext },

    // Summary — מעוצב מעט יותר מזמין
    summary:{
      backgroundColor:'#F7F9FF',
      borderColor: colors.border,
      borderWidth:1,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginTop: 4,
      marginBottom: spacing.md,
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1,
    },
    summaryDivider:{
      height:1, backgroundColor:'#E6ECF5', marginVertical:8, alignSelf:'stretch'
    },
    summaryItem:{ flexDirection:'row', alignItems:'center', marginBottom: 6 },
    summaryText:{ ...textBase, fontSize:16, fontWeight:'700' },

    // Active badge
    activeBadge:{
      marginTop:6, alignSelf:'flex-start',
      backgroundColor:'#e8fff2', borderColor:'#b9f5cf', borderWidth:1,
      borderRadius: 999, paddingHorizontal:10, paddingVertical:6, flexDirection:'row-reverse', alignItems:'center'
    },
    activeText:{ color: colors.success, fontWeight:'800', textAlign:'right', writingDirection:'rtl' },

    // Images
    heroImg:{ width: 200, height: 120, borderRadius: borderRadii.sm, marginStart:8, backgroundColor: colors.bg },

    // ===== Styles לפאנל =====
    modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
    modalSheet:{
      backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      overflow:'hidden', borderColor: colors.border, borderTopWidth: 1,
      shadowColor:'#000', shadowOpacity:0.12, shadowRadius:16, shadowOffset:{ width:0, height:-6 }, elevation:10
    },
    modalHeaderGrad:{ paddingTop: 10, paddingBottom: 14, paddingHorizontal: spacing.lg },
    dragHandle:{ alignSelf:'center', width: 42, height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.75)', marginBottom: 8 },
    modalTitle:{ textAlign:'right', color:'#fff', fontSize:16, fontWeight:'800' },
    modalSubtitle:{ textAlign:'right', color:'rgba(255,255,255,0.9)', fontSize:12, marginTop: 4 },

    dayRow:{
      flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      backgroundColor:'#F6F8FF', borderTopWidth:1, borderBottomWidth:1, borderColor:'#E2E8F0'
    },
    arrowBtn:{
      width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center',
      backgroundColor:'#FFFFFF', borderWidth:1, borderColor:'#E2E8F0'
    },

    hmWrapWheels:{
      flexDirection:'row-reverse', justifyContent:'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor:'#FFFFFF'
    },
    hmColWheel:{ flex:1, alignItems:'center' },
    hmLabel:{ color: colors.subtext, fontSize:13, fontWeight:'700', marginBottom: 6 },

    modalFooter:{
      paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm,
      flexDirection: 'row-reverse', backgroundColor:'#FFFFFF'
    },
    modalBtn:{ flex:1, height:48, borderRadius: 12, alignItems:'center', justifyContent:'center', borderWidth:1 },
    modalBtnGhost:{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
    modalBtnGhostText:{ color: colors.text, fontWeight:'800' },
    modalBtnPrimary:{ backgroundColor: colors.primary, borderColor: colors.primary },
    modalBtnPrimaryText:{ color:'#fff', fontWeight:'800' },
  });
}

// screens/BookingsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import * as bookingsRepo from '../data/bookingsRepo';
import * as listingsRepo from '../data/listingsRepo';
import BookingLifecycleWatcher from '../components/BookingLifecycleWatcher';
import { BOOKING_STATUS } from '../data/bookingsRepo';

export default function BookingsScreen() {
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const route = useRoute();
  const navigation = useNavigation();

  const load = useCallback(async () => {
    const [ls, bs] = await Promise.all([listingsRepo.getAll(), bookingsRepo.getAll()]);
    setListings(ls);
    setBookings(bs.sort((a, b) => (new Date(b.startAt) - new Date(a.startAt))));
  }, []);

  // טעינה ראשונית
  useEffect(() => {
    load();
  }, [load]);

  // רענון כשמסך נכנס לפוקוס (כשחוזרים ממסך יצירת הזמנה)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await bookingsRepo.sweepAndAutoTransition();
        await load();
        // אם הגיע פרמטר refresh מהניווט – ננקה אותו
        if (route?.params?.refresh) {
          navigation.setParams({ refresh: undefined });
        }
      })();
    }, [load, route?.params?.refresh, navigation])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await bookingsRepo.sweepAndAutoTransition();
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  async function makeBooking(listing) {
    try {
      const start = new Date();
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const booking = await bookingsRepo.requestBooking({
        listingId: listing.id,
        renterId: 'me', // החלף למזהה משתמש בפועל אם יש
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        pricePerHour: listing.pricePerHour,
        title: `הזמנה לחניה ${listing.title || listing.id}`,
      });

      if (booking.status === BOOKING_STATUS.PENDING) {
        Alert.alert('הזמנה נוצרה', 'ההזמנה ממתינה לאישור בעל החניה.');
    } else if (booking.status === BOOKING_STATUS.APPROVED) {
        Alert.alert('הזמנה מאושרת', 'ההזמנה אושרה אוטומטית.');
      } else {
        Alert.alert('הזמנה נוצרה', `סטטוס: ${booking.status}`);
      }
      await onRefresh();
    } catch (e) {
      Alert.alert('שגיאה', 'לא הצלחנו ליצור הזמנה. נסה שוב.');
    }
  }

  async function extend(booking) {
    try {
      const newEnd = new Date((new Date(booking.endAt)).getTime() + 30 * 60 * 1000);
      const updated = await bookingsRepo.extend(booking.id, newEnd.toISOString());
      Alert.alert('הוארך', `זמן סיום חדש: ${formatDate(updated.endAt)}\nחיוב משוער: ${bookingsRepo.calcTotalPrice(updated)} ₪`);
      await onRefresh();
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו להאריך.');
    }
  }

  async function finishNow(booking) {
    try {
      const updated = await bookingsRepo.finishNow(booking.id);
      Alert.alert('הסתיים', `החיוב הסופי: ${bookingsRepo.calcTotalPrice(updated)} ₪`);
      await onRefresh();
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לסיים כעת.');
    }
  }

  return (
    <View style={styles.container}>
      <BookingLifecycleWatcher />

      <Text style={styles.header}>חניות זמינות (דמו)</Text>
      {listings.length === 0 ? (
        <Text style={styles.emptyHint}>אין חניות לדוגמה כרגע. צור חניה חדשה במסך הבעלים.</Text>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <View style={styles.listingCard}>
              <Text style={styles.listingTitle}>{item.title || 'חניה'}</Text>
              <Text style={styles.row}>מחיר לשעה: {item.pricePerHour ?? '-'} ₪</Text>
              <Text style={styles.row}>אישור: {item.approvalMode === 'manual' ? 'ידני' : 'אוטומטי'}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => makeBooking(item)}>
                <Text style={styles.btnText}>הזמן לשעה עכשיו</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Text style={styles.subHeader}>ההזמנות שלי</Text>
      {bookings.length === 0 ? (
        <Text style={styles.emptyHint}>אין עדיין הזמנות. צור הזמנה מאחת החניות למעלה, או חזור ממסך אחר — המסך יתעדכן אוטומטית.</Text>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.id)}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
          renderItem={({ item }) => (
            <View style={styles.bookingCard}>
              <Text style={styles.bookingTitle}>{item.title || 'הזמנה'}</Text>
              <Text style={styles.row}>סטטוס: {prettyStatus(item.status)}</Text>
              <Text style={styles.row}>מתאריך: {formatDate(item.startAt)} עד {formatDate(item.endAt)}</Text>
              <Text style={styles.row}>חיוב משוער: {bookingsRepo.calcTotalPrice(item)} ₪</Text>

              {item.status === BOOKING_STATUS.ACTIVE && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => extend(item)}>
                    <Text style={styles.btnText}>Extend +30m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.secondaryBtn, styles.danger]} onPress={() => finishNow(item)}>
                    <Text style={styles.btnText}>Finish Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function prettyStatus(s) {
  switch (s) {
    case BOOKING_STATUS.PENDING: return 'ממתינה לאישור';
    case BOOKING_STATUS.APPROVED: return 'מאושרת (עתידית)';
    case BOOKING_STATUS.ACTIVE: return 'פעילה';
    case BOOKING_STATUS.COMPLETED: return 'הושלמה';
    case BOOKING_STATUS.REJECTED: return 'נדחתה';
    case BOOKING_STATUS.CANCELED: return 'בוטלה';
    default: return String(s || '-');
  }
}

function formatDate(v) {
  if (!v) return '-';
  try {
    const d = new Date(v);
    const dd = d.toLocaleDateString('he-IL');
    const tt = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${dd} ${tt}`;
  } catch {
    return String(v);
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 18, fontWeight: '700', margin: 12 },
  subHeader: { fontSize: 16, fontWeight: '700', marginHorizontal: 12, marginTop: 12 },
  emptyHint: { marginHorizontal: 12, color: '#6b7280' },
  listingCard: { width: 240, backgroundColor: '#f7f7fb', borderRadius: 12, padding: 12, marginRight: 10, borderWidth: 1, borderColor: '#ececf1' },
  listingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  bookingCard: { backgroundColor: '#f7f7fb', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ececf1' },
  bookingTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  row: { fontSize: 13, color: '#333' },
  primaryBtn: { backgroundColor: '#4f46e5', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  secondaryBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center', flex: 1 },
  danger: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});

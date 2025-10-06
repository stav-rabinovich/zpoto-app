// screens/OwnerPendingScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { getOwnerBookings, updateBookingStatus, getPendingApprovalBookings, formatCurrency } from '../services/api/owner';
import { getStatusText, getStatusColor, formatBookingDate } from '../services/api/bookings';

export default function OwnerPendingScreen() {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getOwnerBookings();
      if (result.success) {
        const pendingBookings = getPendingApprovalBookings(result.data);
        // מיון לפי תאריך יצירה (חדש יותר קודם)
        const sortedPending = pendingBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPending(sortedPending);
      } else {
        console.error('Failed to load bookings:', result.error);
        setPending([]);
      }
    } catch (error) {
      console.error('Load pending bookings error:', error);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  async function approve(bookingId) {
    try {
      const result = await updateBookingStatus(bookingId, 'CONFIRMED');
      if (result.success) {
        Alert.alert('אושר', 'ההזמנה אושרה בהצלחה');
        await load(); // רענון הרשימה
      } else {
        Alert.alert('שגיאה', result.error || 'לא הצלחנו לאשר. נסה שוב.');
      }
    } catch (error) {
      console.error('Approve booking error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה באישור ההזמנה');
    }
  }

  async function reject(bookingId) {
    try {
      const result = await updateBookingStatus(bookingId, 'CANCELLED');
      if (result.success) {
        Alert.alert('נדחה', 'ההזמנה נדחתה');
        await load(); // רענון הרשימה
      } else {
        Alert.alert('שגיאה', result.error || 'לא הצלחנו לדחות. נסה שוב.');
      }
    } catch (error) {
      console.error('Reject booking error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בדחיית ההזמנה');
    }
  }

  const renderItem = ({ item }) => {
    const hours = Math.ceil((new Date(item.endTime) - new Date(item.startTime)) / (1000 * 60 * 60));
    const total = (item.totalPriceCents || 0) / 100;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>הזמנה #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.row}>משתמש: {item.user?.email || 'לא ידוע'}</Text>
        <Text style={styles.row}>חניה: {item.parking?.title || item.parking?.address || `#${item.parkingId}`}</Text>
        <Text style={styles.row}>מתאריך: {formatBookingDate(item.startTime)} עד {formatBookingDate(item.endTime)}</Text>
        <Text style={styles.row}>משך: {hours} שעות • סה״כ: {formatCurrency(total)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.approve]} onPress={() => approve(item.id)}>
            <Text style={styles.btnText}>אישור</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => reject(item.id)}>
            <Text style={styles.btnText}>דחייה</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>טוען בקשות בהמתנה…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pending.length === 0 ? (
        <View style={styles.center}>
          <Text>אין בקשות בהמתנה כרגע</Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ padding: 12 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  card: {
    backgroundColor: '#f7f7fb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ececf1',
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  row: { fontSize: 14, color: '#333', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  approve: { backgroundColor: '#16a34a' },
  reject: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '600' },
});

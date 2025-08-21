// screens/OwnerPendingScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as bookingsRepo from '../../data/bookingsRepo';
import { BOOKING_STATUS } from '../../data/bookingsRepo';

export default function OwnerPendingScreen() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await bookingsRepo.byStatus(BOOKING_STATUS.PENDING);
      setPending(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const items = await bookingsRepo.byStatus(BOOKING_STATUS.PENDING);
      setPending(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } finally {
      setRefreshing(false);
    }
  }, []);

  async function approve(id) {
    try {
      await bookingsRepo.setStatus(id, BOOKING_STATUS.APPROVED);
      Alert.alert('אושר', 'ההזמנה אושרה בהצלחה');
      onRefresh();
    } catch (e) {
      Alert.alert('שגיאה', 'לא הצלחנו לאשר. נסה שוב.');
    }
  }

  async function reject(id) {
    try {
      await bookingsRepo.setStatus(id, BOOKING_STATUS.REJECTED);
      Alert.alert('נדחה', 'ההזמנה נדחתה');
      onRefresh();
    } catch (e) {
      Alert.alert('שגיאה', 'לא הצלחנו לדחות. נסה שוב.');
    }
  }

  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title || 'בקשת הזמנה'}</Text>
        <Text style={styles.row}>חניה: {item.listingId}</Text>
        <Text style={styles.row}>מתאריך: {formatDate(item.startAt)} עד {formatDate(item.endAt)}</Text>
        <Text style={styles.row}>מחיר לשעה: {item.pricePerHour ?? '-'} ₪</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  card: {
    backgroundColor: '#f7f7fb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ececf1',
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  row: { fontSize: 14, color: '#333', marginBottom: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  approve: { backgroundColor: '#16a34a' },
  reject: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '600' },
});

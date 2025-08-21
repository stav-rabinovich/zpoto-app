// screens/OwnerMyListingsScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as listingsRepo from '../data/listingsRepo';

export default function OwnerMyListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const ls = await listingsRepo.getAll();
    setListings(ls.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  async function toggleStatus(l) {
    const newStatus = (l.status ?? 'active') === 'active' ? 'paused' : 'active';
    await listingsRepo.setStatus(l.id, newStatus);
    await load();
  }

  function edit(l) {
    navigation?.navigate?.('OwnerListingForm', { id: l.id });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>החניות שלי</Text>

      <FlatList
        data={listings}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>אין חניות עדיין. צור חניה חדשה.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title || 'חניה'}</Text>
            <Text style={styles.row}>כתובת: {item.address || '-'}</Text>
            <Text style={styles.row}>מחיר לשעה: {item.pricePerHour ?? '-'} ₪</Text>
            <Text style={styles.row}>
              סטטוס: {(item.status ?? 'active') === 'active' ? 'פעילה (נראית בחיפוש)' : 'מושהית'}
            </Text>
            <Text style={styles.row}>אישור: {item.approvalMode === 'manual' ? 'ידני' : 'אוטומטי'}</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.primary]} onPress={() => edit(item)}>
                <Text style={styles.btnText}>עריכה</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={() => toggleStatus(item)}>
                <Text style={styles.btnText}>
                  {(item.status ?? 'active') === 'active' ? 'השהה' : 'הפעל'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', margin: 16 },
  empty: { marginHorizontal: 16, color: '#6b7280' },
  card: { backgroundColor: '#f7f7fb', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ececf1' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  row: { fontSize: 13, color: '#333' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  primary: { backgroundColor: '#4f46e5' },
  secondary: { backgroundColor: '#2563eb' },
  btnText: { color: '#fff', fontWeight: '700' },
});

// screens/OwnerMyListingsScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useAuth } from '../contexts/AuthContext';
import { getOwnerParkings, updateOwnerParking, getParkingStatus, formatCurrency } from '../services/api/owner';

export default function OwnerMyListingsScreen({ navigation }) {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const [parkings, setParkings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const result = await getOwnerParkings();
      if (result.success) {
        // מיון לפי תאריך יצירה (חדש יותר קודם)
        const sortedParkings = result.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setParkings(sortedParkings);
      } else {
        console.error('Failed to load parkings:', result.error);
        setParkings([]);
      }
    } catch (error) {
      console.error('Load parkings error:', error);
      setParkings([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  async function toggleStatus(parking) {
    const newIsActive = !parking.isActive;
    
    try {
      const result = await updateOwnerParking(parking.id, { isActive: newIsActive });
      if (result.success) {
        await load(); // רענון הרשימה
        Alert.alert(
          'עודכן', 
          `החניה ${newIsActive ? 'הופעלה' : 'הושהתה'} בהצלחה`
        );
      } else {
        Alert.alert('שגיאה', result.error || 'לא ניתן לעדכן את סטטוס החניה');
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעדכון הסטטוס');
    }
  }

  function edit(l) {
    navigation?.navigate?.('OwnerListingForm', { id: l.id });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>החניות שלי</Text>

      <FlatList
        data={parkings}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          loading ? 
            <Text style={styles.empty}>טוען חניות...</Text> :
            <Text style={styles.empty}>אין חניות עדיין. צור חניה חדשה.</Text>
        }
        renderItem={({ item }) => {
          const statusInfo = getParkingStatus(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{item.title || 'חניה'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                  <Text style={styles.statusText}>{statusInfo.text}</Text>
                </View>
              </View>
              <Text style={styles.row}>כתובת: {item.address || '-'}</Text>
              <Text style={styles.row}>מחיר לשעה: {formatCurrency(item.firstHourPrice || 10)}</Text>
              {/* // 📝 LEGACY CODE - Approval Mode Display (Commented Out) */}
              {/* <Text style={styles.row}>
                מצב אישור: {item.approvalMode === 'AUTO' ? 'אוטומטי' : 'ידני'}
              </Text> */}

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.primary]} onPress={() => edit(item)}>
                  <Text style={styles.btnText}>עריכה</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={() => toggleStatus(item)}>
                  <Text style={styles.btnText}>
                    {item.isActive ? 'השהה' : 'הפעל'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', margin: 16 },
  empty: { marginHorizontal: 16, color: '#6b7280' },
  card: { backgroundColor: '#f7f7fb', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ececf1' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  row: { fontSize: 13, color: '#333', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  primary: { backgroundColor: '#4f46e5' },
  secondary: { backgroundColor: '#2563eb' },
  btnText: { color: '#fff', fontWeight: '700' },
});

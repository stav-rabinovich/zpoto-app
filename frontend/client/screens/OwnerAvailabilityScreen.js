// screens/OwnerAvailabilityScreen.js
// מסך הגדרת זמינות חניה - ימים ושעות
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const DAYS = [
  { id: 0, name: 'ראשון', key: 'sunday' },
  { id: 1, name: 'שני', key: 'monday' },
  { id: 2, name: 'שלישי', key: 'tuesday' },
  { id: 3, name: 'רביעי', key: 'wednesday' },
  { id: 4, name: 'חמישי', key: 'thursday' },
  { id: 5, name: 'שישי', key: 'friday' },
  { id: 6, name: 'שבת', key: 'saturday' },
];

const TIME_SLOTS = [
  { label: '00:00-06:00', start: 0, end: 6 },
  { label: '06:00-12:00', start: 6, end: 12 },
  { label: '12:00-18:00', start: 12, end: 18 },
  { label: '18:00-24:00', start: 18, end: 24 },
];

export default function OwnerAvailabilityScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token } = useAuth();
  const parkingId = route.params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parking, setParking] = useState(null);
  
  // מבנה: { sunday: [0,6,12,18], monday: [6,12], ... }
  // כל מספר מייצג את תחילת משבצת זמן פנויה
  const [availability, setAvailability] = useState({});

  useEffect(() => {
    loadParking();
  }, [parkingId]);

  const loadParking = async () => {
    if (!parkingId || !token) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/owner/parkings/${parkingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParking(response.data);
      
      // טעינת זמינות קיימת (אם יש)
      if (response.data.availability) {
        try {
          const parsed = typeof response.data.availability === 'string' 
            ? JSON.parse(response.data.availability) 
            : response.data.availability;
          setAvailability(parsed || {});
        } catch {
          setAvailability({});
        }
      }
    } catch (error) {
      console.error('Load parking error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את פרטי החניה');
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (dayKey, slotStart) => {
    setAvailability(prev => {
      const daySlots = prev[dayKey] || [];
      const exists = daySlots.includes(slotStart);
      
      return {
        ...prev,
        [dayKey]: exists 
          ? daySlots.filter(s => s !== slotStart)
          : [...daySlots, slotStart].sort((a, b) => a - b)
      };
    });
  };

  const toggleDay = (dayKey) => {
    setAvailability(prev => {
      const daySlots = prev[dayKey] || [];
      const allSlots = TIME_SLOTS.map(s => s.start);
      
      // אם כל המשבצות מסומנות - נבטל הכל
      // אחרת - נסמן הכל
      const isFullDay = allSlots.every(slot => daySlots.includes(slot));
      
      return {
        ...prev,
        [dayKey]: isFullDay ? [] : allSlots
      };
    });
  };

  const saveAvailability = async () => {
    if (!parkingId || !token) return;
    
    setSaving(true);
    try {
      await api.patch(`/api/owner/parkings/${parkingId}`, {
        availability: JSON.stringify(availability)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('הצלחה', 'זמינות החניה עודכנה', [
        { text: 'אישור', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Save availability error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את הזמינות');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  if (!parking) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>לא נמצאה חניה</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* כותרת */}
        <View style={styles.header}>
          <Text style={styles.title}>{parking.title}</Text>
          <Text style={styles.subtitle}>הגדר מתי החניה פנויה להשכרה</Text>
        </View>

        {/* הסבר */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            סמן את משבצות הזמן בהן החניה פנויה. לקוחות יוכלו להזמין רק בזמנים אלו.
          </Text>
        </View>

        {/* לוח זמינות */}
        {DAYS.map(day => {
          const daySlots = availability[day.key] || [];
          const isFullDay = TIME_SLOTS.every(slot => daySlots.includes(slot.start));
          
          return (
            <View key={day.id} style={styles.dayCard}>
              {/* כותרת יום */}
              <TouchableOpacity 
                style={styles.dayHeader}
                onPress={() => toggleDay(day.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.dayName}>{day.name}</Text>
                <View style={styles.dayHeaderRight}>
                  <Text style={styles.dayStatus}>
                    {isFullDay ? 'כל היום' : daySlots.length > 0 ? `${daySlots.length} משבצות` : 'סגור'}
                  </Text>
                  <Ionicons 
                    name={isFullDay ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={24} 
                    color={isFullDay ? theme.colors.success : theme.colors.border} 
                  />
                </View>
              </TouchableOpacity>

              {/* משבצות זמן */}
              <View style={styles.slotsRow}>
                {TIME_SLOTS.map(slot => {
                  const isActive = daySlots.includes(slot.start);
                  
                  return (
                    <TouchableOpacity
                      key={slot.start}
                      style={[styles.slot, isActive && styles.slotActive]}
                      onPress={() => toggleSlot(day.key, slot.start)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.slotText, isActive && styles.slotTextActive]}>
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* כפתור שמירה */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveAvailability}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginLeft: 8 }} />
              <Text style={styles.saveButtonText}>שמור זמינות</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing } = theme;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      padding: spacing.lg,
      paddingBottom: 40,
    },
    loadingText: {
      marginTop: 16,
      color: colors.subtext,
      fontSize: 14,
    },
    errorText: {
      color: colors.error,
      fontSize: 16,
      textAlign: 'center',
    },
    header: {
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.subtext,
      textAlign: 'center',
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoText: {
      flex: 1,
      marginRight: 12,
      fontSize: 13,
      color: colors.subtext,
      lineHeight: 18,
    },
    dayCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: spacing.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.bg,
    },
    dayName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    dayHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dayStatus: {
      fontSize: 13,
      color: colors.subtext,
    },
    slotsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing.sm,
      gap: 8,
    },
    slot: {
      flex: 1,
      minWidth: '45%',
      padding: spacing.sm,
      borderRadius: 8,
      backgroundColor: colors.bg,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    slotActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    slotText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    slotTextActive: {
      color: 'white',
    },
    saveButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.success,
      padding: spacing.lg,
      borderRadius: 12,
      marginTop: spacing.xl,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}

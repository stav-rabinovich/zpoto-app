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
  { label: '00:00-04:00', start: 0, end: 4 },
  { label: '04:00-08:00', start: 4, end: 8 },
  { label: '08:00-12:00', start: 8, end: 12 },
  { label: '12:00-16:00', start: 12, end: 16 },
  { label: '16:00-20:00', start: 16, end: 20 },
  { label: '20:00-24:00', start: 20, end: 24 },
];

export default function OwnerAvailabilityScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token, logout, handleUserBlocked } = useAuth();
  const parkingId = route.params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parking, setParking] = useState(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  
  // מבנה: { sunday: [0,6,12,18], monday: [6,12], ... }
  // כל מספר מייצג את תחילת משבצת זמן פנויה
  const [availability, setAvailability] = useState({});

  // פונקציה למיגרציה מבלוקים ישנים (6 שעות) לחדשים (4 שעות)
  const migrateOldAvailability = (oldAvailability) => {
    const migrated = {};
    
    Object.keys(oldAvailability).forEach(dayKey => {
      const oldSlots = oldAvailability[dayKey] || [];
      const newSlots = [];
      
      // מיפוי מבלוקים ישנים לחדשים
      oldSlots.forEach(oldSlot => {
        switch(oldSlot) {
          case 0:  // 00:00-06:00 -> 00:00-04:00 + 04:00-08:00
            newSlots.push(0, 4);
            break;
          case 6:  // 06:00-12:00 -> 08:00-12:00 (חלקי)
            if (!newSlots.includes(4)) newSlots.push(4); // 04:00-08:00
            newSlots.push(8); // 08:00-12:00
            break;
          case 12: // 12:00-18:00 -> 12:00-16:00 + 16:00-20:00 (חלקי)
            newSlots.push(12, 16);
            break;
          case 18: // 18:00-24:00 -> 16:00-20:00 + 20:00-24:00
            if (!newSlots.includes(16)) newSlots.push(16); // 16:00-20:00
            newSlots.push(20); // 20:00-24:00
            break;
        }
      });
      
      // הסרת כפילויות ומיון
      migrated[dayKey] = [...new Set(newSlots)].sort((a, b) => a - b);
    });
    
    return migrated;
  };

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
      
      // טעינת זמינות קיימת (אם יש) עם מיגרציה
      if (response.data.availability) {
        try {
          const parsed = typeof response.data.availability === 'string' 
            ? JSON.parse(response.data.availability) 
            : response.data.availability;
          
          // בדיקה אם צריך מיגרציה (אם יש בלוקים ישנים)
          const needsMigration = Object.values(parsed).some(daySlots => 
            Array.isArray(daySlots) && daySlots.some(slot => [6, 18].includes(slot))
          );
          
          if (needsMigration) {
            console.log('🔄 Migrating old availability format to new 4-hour blocks');
            const migratedAvailability = migrateOldAvailability(parsed);
            setAvailability(migratedAvailability);
            
            // שמירה אוטומטית של הפורמט החדש
            setTimeout(() => {
              api.patch(`/api/owner/parkings/${parkingId}`, {
                availability: JSON.stringify(migratedAvailability)
              }, {
                headers: { Authorization: `Bearer ${token}` }
              }).catch(err => console.log('Auto-migration save failed:', err));
            }, 1000);
          } else {
            setAvailability(parsed || {});
          }
        } catch {
          setAvailability({});
        }
      }
    } catch (error) {
      // בדיקה אם המשתמש חסום
      if (error.isUserBlocked || error.response?.status === 403) {
        console.log('🚫 User blocked in availability - using central handler');
        await handleUserBlocked(navigation, Alert);
        return;
      }
      
      console.error('Load parking error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את פרטי החניה');
    } finally {
      setLoading(false);
    }
  };

  // בדיקת התנגשויות לפני הסרת בלוקי זמן
  const checkConflictsBeforeRemoval = async (dayKey, slotsToRemove) => {
    if (!parkingId || !token || slotsToRemove.length === 0) return { hasConflicts: false, conflicts: [] };
    
    setCheckingConflicts(true);
    try {
      const response = await api.post(`/api/owner/parkings/${parkingId}/check-availability-conflicts`, {
        dayKey,
        timeSlots: slotsToRemove
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      console.error('Conflict check error:', error);
      return { hasConflicts: false, conflicts: [] };
    } finally {
      setCheckingConflicts(false);
    }
  };

  // הצגת הודעת התנגשות מעוצבת
  const showConflictAlert = (conflicts) => {
    const conflictsList = conflicts.map(booking => {
      const startDate = new Date(booking.startTime).toLocaleDateString('he-IL');
      const startTime = new Date(booking.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(booking.endTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const userName = booking.userName || booking.userEmail || 'לא ידוע';
      
      return `• ${userName}\n  ${startDate} ${startTime}-${endTime}`;
    }).join('\n\n');

    Alert.alert(
      '🚫 לא ניתן לשנות זמינות',
      `יש הזמנות מאושרות בזמנים אלו:\n\n${conflictsList}\n\n❌ לא ניתן להסיר זמינות כשיש הזמנות קיימות.\n\n💡 תוכל לשנות זמינות רק לאחר סיום ההזמנות.`,
      [
        { text: 'הבנתי', style: 'default' }
      ]
    );
  };

  const toggleSlot = async (dayKey, slotStart) => {
    const daySlots = availability[dayKey] || [];
    const exists = daySlots.includes(slotStart);
    
    // אם מוסיפים בלוק - אין צורך בבדיקה
    if (!exists) {
      setAvailability(prev => ({
        ...prev,
        [dayKey]: [...daySlots, slotStart].sort((a, b) => a - b)
      }));
      return;
    }
    
    // אם מסירים בלוק - בדיקת התנגשויות
    const conflictCheck = await checkConflictsBeforeRemoval(dayKey, [slotStart]);
    
    if (conflictCheck.hasConflicts) {
      showConflictAlert(conflictCheck.conflicts);
      return; // לא מבצעים את השינוי
    }
    
    // אין התנגשויות - מבצעים את השינוי
    setAvailability(prev => ({
      ...prev,
      [dayKey]: daySlots.filter(s => s !== slotStart)
    }));
  };

  const toggleDay = async (dayKey) => {
    const daySlots = availability[dayKey] || [];
    const allSlots = TIME_SLOTS.map(s => s.start);
    const isFullDay = allSlots.every(slot => daySlots.includes(slot));
    
    // אם מפעילים יום שלם - אין צורך בבדיקה
    if (!isFullDay) {
      setAvailability(prev => ({
        ...prev,
        [dayKey]: allSlots
      }));
      return;
    }
    
    // אם מכבים יום שלם - בדיקת התנגשויות לכל הבלוקים
    const conflictCheck = await checkConflictsBeforeRemoval(dayKey, daySlots);
    
    if (conflictCheck.hasConflicts) {
      // אסור לכבות - יש הזמנות קיימות
      showConflictAlert(conflictCheck.conflicts);
      return; // לא מאפשרים כיבוי בכלל
    }
    
    // אין התנגשויות - מכבים את היום
    setAvailability(prev => ({
      ...prev,
      [dayKey]: []
    }));
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
            סמן את בלוקי הזמן בהן החניה פנויה. כל בלוק מכסה 4 שעות. לקוחות יוכלו להזמין רק בזמנים אלו.
          </Text>
        </View>

        {/* הסבר על בדיקת התנגשויות */}
        <View style={styles.warningBox}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.warning} />
          <Text style={styles.warningText}>
            🛡️ הגנה חכמה: המערכת תמנע הסרת זמינות אם יש הזמנות מאושרות באותם זמנים.
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
                      style={[
                        styles.slot, 
                        isActive && styles.slotActive,
                        checkingConflicts && styles.slotDisabled
                      ]}
                      onPress={() => toggleSlot(day.key, slot.start)}
                      activeOpacity={0.7}
                      disabled={checkingConflicts}
                    >
                      {checkingConflicts ? (
                        <ActivityIndicator size="small" color={isActive ? "white" : theme.colors.primary} />
                      ) : (
                        <Text style={[styles.slotText, isActive && styles.slotTextActive]}>
                          {slot.label}
                        </Text>
                      )}
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
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warning + '10',
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.warning + '30',
    },
    warningText: {
      flex: 1,
      marginRight: 12,
      fontSize: 13,
      color: colors.warning,
      lineHeight: 18,
      fontWeight: '600',
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
      minWidth: '30%', // שונה מ-45% ל-30% כדי להכיל 6 בלוקים
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
    slotDisabled: {
      opacity: 0.6,
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

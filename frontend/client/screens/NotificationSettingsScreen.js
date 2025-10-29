// screens/NotificationSettingsScreen.js
// מסך הגדרות התראות

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationSettingsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token, handleUserBlocked } = useAuth();

  const [settings, setSettings] = useState({
    bookingReminders: true,
    bookingConfirmations: true,
    availabilityChanges: false,
    systemUpdates: true,
  });
  const [loading, setLoading] = useState(true);

  // טעינת הגדרות
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // כרגע נשתמש בהגדרות ברירת מחדל
    // בעתיד נוכל לטעון מהשרת
    setLoading(false);
  };

  // עדכון הגדרה
  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // כאן נוכל לשמור בשרת
    console.log(`Updated ${key} to ${value}`);
  };

  // יצירת התראת בדיקה
  const sendTestNotification = async () => {
    try {
      await api.post('/api/notifications/test', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('✅ הצלחה', 'התראת בדיקה נשלחה בהצלחה');
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('❌ שגיאה', 'לא הצלחנו לשלוח התראת בדיקה');
    }
  };

  const renderSettingItem = (key, title, description, icon) => (
    <View key={key} style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      
      <Switch
        value={settings[key]}
        onValueChange={(value) => updateSetting(key, value)}
        trackColor={{ false: '#E5E7EB', true: theme.colors.primary + '40' }}
        thumbColor={settings[key] ? theme.colors.primary : '#9CA3AF'}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>טוען הגדרות...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* כותרת */}
        <View style={styles.header}>
          <Text style={styles.title}>הגדרות התראות</Text>
          <Text style={styles.subtitle}>
            בחר איזה התראות תרצה לקבל
          </Text>
        </View>

        {/* הגדרות התראות */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>התראות הזמנות</Text>
          
          {renderSettingItem(
            'bookingReminders',
            'תזכורות הזמנות',
            'קבל תזכורת 2 שעות לפני תחילת ההזמנה',
            'time-outline'
          )}
          
          {renderSettingItem(
            'bookingConfirmations',
            'אישורי הזמנות',
            'קבל התראה כשהזמנה חדשה מתקבלת',
            'checkmark-circle-outline'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>התראות מערכת</Text>
          
          {renderSettingItem(
            'availabilityChanges',
            'שינויי זמינות',
            'קבל התראה כשמישהו משנה זמינות חניה',
            'calendar-outline'
          )}
          
          {renderSettingItem(
            'systemUpdates',
            'עדכוני מערכת',
            'קבל התראות על עדכונים חשובים במערכת',
            'information-circle-outline'
          )}
        </View>

        {/* כפתור בדיקה */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={sendTestNotification}
            activeOpacity={0.8}
          >
            <Ionicons name="send-outline" size={20} color="#fff" />
            <Text style={styles.testButtonText}>שלח התראת בדיקה</Text>
          </TouchableOpacity>
        </View>

        {/* מידע נוסף */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>על התראות</Text>
              <Text style={styles.infoText}>
                התראות עוזרות לך להישאר מעודכן על הזמנות חדשות ופעילות בחניות שלך. 
                תוכל לשנות הגדרות אלו בכל עת.
              </Text>
            </View>
          </View>
        </View>

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
    loadingText: {
      textAlign: 'center',
      marginTop: 50,
      color: colors.subtext,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.subtext,
      lineHeight: 20,
    },
    section: {
      margin: spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.md,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.subtext,
      lineHeight: 18,
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: spacing.md,
      borderRadius: 12,
      gap: 8,
    },
    testButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    infoSection: {
      margin: spacing.lg,
      marginTop: spacing.xl,
    },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: colors.primary + '10',
      padding: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    infoContent: {
      flex: 1,
      marginRight: spacing.md,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: colors.primary,
      lineHeight: 20,
    },
  });
}

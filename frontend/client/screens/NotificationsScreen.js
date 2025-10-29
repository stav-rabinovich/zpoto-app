// screens/NotificationsScreen.js
// מסך התראות לבעלי חניה

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token, handleUserBlocked } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // טעינת התראות
  const loadNotifications = useCallback(async () => {
    if (!token) return;
    
    try {
      const [notificationsRes, countRes] = await Promise.all([
        api.get('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get('/api/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setNotifications(notificationsRes.data.data || []);
      setUnreadCount(countRes.data.count || 0);
      
    } catch (error) {
      // בדיקה אם המשתמש חסום
      if (error.isUserBlocked || error.response?.status === 403) {
        console.log('🚫 User blocked in notifications - using central handler');
        await handleUserBlocked(navigation, Alert);
        return;
      }
      
      console.error('Load notifications error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את ההתראות');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, navigation, handleUserBlocked]);

  // רענון
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  // טעינה בכניסה למסך
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // סימון התראה כנקראה
  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // עדכון מקומי
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  // סימון כל ההתראות כנקראות
  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // עדכון מקומי
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Mark all as read error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את ההתראות');
    }
  };

  // מחיקת התראה
  const deleteNotification = async (notificationId) => {
    Alert.alert(
      'מחיקת התראה',
      'האם אתה בטוח שברצונך למחוק התראה זו?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/notifications/${notificationId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              // הסרה מקומית
              setNotifications(prev => prev.filter(n => n.id !== notificationId));
              
            } catch (error) {
              console.error('Delete notification error:', error);
              Alert.alert('שגיאה', 'לא הצלחנו למחוק את ההתראה');
            }
          }
        }
      ]
    );
  };

  // עיצוב התראה
  const renderNotification = (notification) => {
    const isUnread = !notification.isRead;
    const createdAt = new Date(notification.createdAt);
    const timeAgo = getTimeAgo(createdAt);
    
    return (
      <TouchableOpacity
        key={notification.id}
        style={[styles.notificationCard, isUnread && styles.unreadCard]}
        onPress={() => !isUnread && markAsRead(notification.id)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}>
            <Ionicons 
              name={getNotificationIcon(notification.type)} 
              size={20} 
              color={theme.colors.primary} 
            />
          </View>
          
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationBody}>
              {notification.body}
            </Text>
            <Text style={styles.notificationTime}>
              {timeAgo}
            </Text>
          </View>
          
          <View style={styles.notificationActions}>
            {isUnread && <View style={styles.unreadDot} />}
            <TouchableOpacity
              onPress={() => deleteNotification(notification.id)}
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>טוען התראות...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* כותרת עם פעולות */}
      <View style={styles.header}>
        <Text style={styles.title}>התראות</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>סמן הכל כנקרא</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationSettings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* סטטיסטיקות */}
      {unreadCount > 0 && (
        <View style={styles.statsCard}>
          <Ionicons name="notifications" size={20} color={theme.colors.primary} />
          <Text style={styles.statsText}>
            יש לך {unreadCount} התראות חדשות
          </Text>
        </View>
      )}

      {/* רשימת התראות */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#94A3B8" />
            <Text style={styles.emptyTitle}>אין התראות</Text>
            <Text style={styles.emptySubtitle}>
              התראות על הזמנות חדשות יופיעו כאן
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// פונקציות עזר
function getNotificationIcon(type) {
  switch (type) {
    case 'booking_reminder':
      return 'time-outline';
    case 'booking_confirmed':
      return 'checkmark-circle-outline';
    case 'availability_changed':
      return 'calendar-outline';
    default:
      return 'notifications-outline';
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  
  return date.toLocaleDateString('he-IL');
}

function makeStyles(theme) {
  const { colors, spacing } = theme;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      color: colors.subtext,
      fontSize: 14,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    markAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.primary + '20',
      borderRadius: 8,
    },
    markAllText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 12,
    },
    settingsButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.primary + '20',
    },
    statsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: spacing.lg,
      padding: spacing.md,
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      gap: 8,
    },
    statsText: {
      color: colors.primary,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    notificationsList: {
      padding: spacing.lg,
      gap: 12,
    },
    notificationCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unreadCard: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '05',
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    notificationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    unreadTitle: {
      fontWeight: '700',
    },
    notificationBody: {
      fontSize: 14,
      color: colors.subtext,
      lineHeight: 20,
      marginBottom: 8,
    },
    notificationTime: {
      fontSize: 12,
      color: colors.subtext,
    },
    notificationActions: {
      alignItems: 'center',
      gap: 8,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    deleteButton: {
      padding: 4,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.subtext,
      textAlign: 'center',
    },
  });
}

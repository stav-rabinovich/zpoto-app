// screens/OwnerCommissionsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function OwnerCommissionsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token, handleUserBlocked } = useAuth();

  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const loadCommissions = useCallback(async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // קבלת מזהה המשתמש
      const userResponse = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userId = userResponse.data.id;

      // קבלת עמלות החודש
      const response = await api.get(
        `/api/commissions/owner/${userId}/commissions?year=${selectedMonth.year}&month=${selectedMonth.month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setCommissions(response.data.data.commissions);
        setSummary(response.data.data.summary);
        console.log('💰 Commissions loaded:', response.data.data.summary);
      }
    } catch (error) {
      console.error('💰 Error loading commissions:', error);
      if (error.response?.status === 403) {
        await handleUserBlocked(navigation);
        return;
      }
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את נתוני העמלות');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedMonth, handleUserBlocked, navigation]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const changeMonth = (direction) => {
    setSelectedMonth(prev => {
      let newMonth = prev.month + direction;
      let newYear = prev.year;
      
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
      
      return { year: newYear, month: newMonth };
    });
  };

  const renderCommissionItem = ({ item }) => {
    const booking = item.booking;
    const parking = booking.parking;
    
    return (
      <View style={styles.commissionCard}>
        <View style={styles.commissionHeader}>
          <View style={styles.commissionInfo}>
            <Text style={styles.commissionTitle} numberOfLines={1}>
              {parking.title || parking.address}
            </Text>
            <Text style={styles.commissionDate}>
              {formatDate(booking.startTime)} • {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
            </Text>
          </View>
          <View style={styles.commissionAmount}>
            <Text style={styles.commissionNetAmount}>
              ₪{(item.netOwnerCents / 100).toFixed(2)}
            </Text>
            <Text style={styles.commissionNetLabel}>נטו</Text>
          </View>
        </View>
        
        <View style={styles.commissionDetails}>
          <View style={styles.commissionDetailRow}>
            <Text style={styles.commissionDetailLabel}>סכום כולל:</Text>
            <Text style={styles.commissionDetailValue}>
              ₪{(item.totalPriceCents / 100).toFixed(2)}
            </Text>
          </View>
          <View style={styles.commissionDetailRow}>
            <Text style={styles.commissionDetailLabel}>עמלת זפוטו ({(item.commissionRate * 100).toFixed(0)}%):</Text>
            <Text style={styles.commissionDetailValue}>
              ₪{(item.commissionCents / 100).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.commissionDetailRow, styles.commissionDetailRowHighlight]}>
            <Text style={styles.commissionDetailLabelHighlight}>נטו לך:</Text>
            <Text style={styles.commissionDetailValueHighlight}>
              ₪{(item.netOwnerCents / 100).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* בחירת חודש */}
      <View style={styles.monthSelector}>
        <TouchableOpacity 
          style={styles.monthButton}
          onPress={() => changeMonth(-1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.monthDisplay}>
          <Text style={styles.monthText}>
            {new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('he-IL', {
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.monthButton}
          onPress={() => changeMonth(1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* סיכום חודשי */}
      {summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>₪{summary.totalNetOwnerILS}</Text>
              <Text style={styles.summaryLabel}>נטו לתשלום</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.count}</Text>
              <Text style={styles.summaryLabel}>הזמנות</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>₪{summary.totalCommissionILS}</Text>
              <Text style={styles.summaryLabel}>עמלת זפוטו</Text>
            </View>
          </View>
          
          <View style={styles.payoutInfo}>
            <Ionicons name="calendar" size={16} color={theme.colors.accent} />
            <Text style={styles.payoutText}>
              תשלום ב-1 לחודש הבא
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color={theme.colors.subtext} />
      <Text style={styles.emptyTitle}>אין הכנסות החודש</Text>
      <Text style={styles.emptySubtitle}>
        כשיהיו הזמנות בחניות שלך, תראה כאן את פירוט ההכנסות
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>טוען נתוני עמלות...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={commissions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCommissionItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCommissions(true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  
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
      marginTop: spacing.md,
      fontSize: 16,
      color: colors.subtext,
    },
    listContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    header: {
      marginBottom: spacing.lg,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    monthButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthDisplay: {
      marginHorizontal: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    monthText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: spacing.md,
    },
    summaryItem: {
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.success,
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.subtext,
      textAlign: 'center',
    },
    payoutInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    payoutText: {
      fontSize: 14,
      color: colors.subtext,
      marginStart: spacing.sm,
    },
    commissionCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    commissionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    commissionInfo: {
      flex: 1,
      marginEnd: spacing.md,
    },
    commissionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    commissionDate: {
      fontSize: 13,
      color: colors.subtext,
    },
    commissionAmount: {
      alignItems: 'flex-end',
    },
    commissionNetAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.success,
    },
    commissionNetLabel: {
      fontSize: 12,
      color: colors.subtext,
    },
    commissionDetails: {
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    commissionDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    commissionDetailRowHighlight: {
      backgroundColor: `${colors.success}08`,
      marginHorizontal: -spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadii.sm,
      marginTop: spacing.xs,
    },
    commissionDetailLabel: {
      fontSize: 13,
      color: colors.subtext,
    },
    commissionDetailValue: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    commissionDetailLabelHighlight: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.success,
    },
    commissionDetailValueHighlight: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.success,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.subtext,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: spacing.lg,
    },
  });
}

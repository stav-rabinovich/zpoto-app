// screens/OwnerDashboardScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Image, ActivityIndicator } from 'react-native';
// הוסרנו AsyncStorage - עובדים רק מהשרת
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ZpButton from '../components/ui/ZpButton';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
// הוסרנו LISTINGS_KEY - עובדים רק מהשרת

export default function OwnerDashboardScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const { isAuthenticated, token, logout, isLoggingOut, handleUserBlocked, blockingInProgress } = useAuth();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);


  const load = useCallback(async () => {
    if (!token || isLoggingOut || blockingInProgress) {
      // לא מציגים הודעה - סביר שזה אחרי logout או בתהליך חסימה
      console.log('🔐 No token, logging out, or blocking in progress - skipping load');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get('/api/owner/parkings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ls = response.data || [];
      ls.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      });
      setListings(ls);
    } catch (error) {
      // בדיקה אם המשתמש חסום
      if (error.isUserBlocked || error.response?.status === 403) {
        console.log('🚫 User blocked in dashboard - using central handler');
        await handleUserBlocked(navigation);
        return;
      }
      
      // טיפול ב-401 בלי הודעה - פשוט חוזר למסך הבית
      if (error.response?.status === 401) {
        console.log('🔐 Token invalid in dashboard - redirecting home');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
        return;
      }
      
      console.log('⚠️ Load parkings error (non-blocking):', error.message || 'Unknown error');
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את החניות שלך');
    } finally {
      setLoading(false);
    }
  }, [token, navigation, isLoggingOut, blockingInProgress, handleUserBlocked]);

  useEffect(() => {
    load(); // טעינה ראשונית
  }, []); 
  
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const toggleActive = async (id) => {
    try {
      const parking = listings.find(x => x.id === id);
      if (!parking) return;
      
      await api.patch(`/api/owner/parkings/${id}`, {
        isActive: !parking.isActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // עדכון מקומי
      setListings(prev => prev.map(p => 
        p.id === id ? { ...p, isActive: !p.isActive } : p
      ));
    } catch (error) {
      console.log('⚠️ Toggle active error (non-blocking):', error.message || 'Unknown error');
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הסטטוס');
    }
  };

  const removeListing = (id) => {
    Alert.alert('למחוק חניה?', 'פעולה זו לא ניתנת לביטול', [
      { text: 'בטל', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/api/owner/parkings/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setListings(prev => prev.filter(x => x.id !== id));
          } catch (error) {
            console.log('⚠️ Delete error (non-blocking):', error.message || 'Unknown error');
            Alert.alert('שגיאה', 'לא הצלחנו למחוק את החניה');
          }
        }
      }
    ]);
  };

  // 📝 LEGACY CODE - Approval Mode Toggle (Commented Out)
  // const toggleApprovalMode = async (parkingId) => {
  //   // This functionality was removed as all bookings are now auto-approved
  // };

  const renderListing = ({ item }) => {
    const thumb = Array.isArray(item.images) && item.images[0]?.uri;
    const isActive = item.isActive ?? item.active ?? false;
    // const isManualApproval = item.approvalMode === 'MANUAL'; // Legacy code

    return (
      <View style={styles.card}>
        {/* כותרת */}
        <Text style={styles.title} numberOfLines={2}>{item.title || 'חניה ללא שם'}</Text>
        
        {!!thumb && <Image source={{ uri: thumb }} style={styles.thumb} />}
        
        <Text style={styles.line}>📍 {item.address || 'כתובת לא זמינה'}</Text>
        
        {/* // 📝 LEGACY CODE - Approval Mode Controls (Commented Out) */}
        {/* מצב אישור - הוסר כיוון שכל ההזמנות מאושרות אוטומטית */}
        {/* <View style={styles.approvalModeContainer}>
          <Text style={styles.approvalModeLabel}>מצב אישור:</Text>
          <TouchableOpacity
            onPress={() => toggleApprovalMode(item.id)}
            style={[styles.approvalModeButton, isManualApproval && styles.approvalModeButtonManual]}
            activeOpacity={0.8}
          >
            <Text style={[styles.approvalModeText, isManualApproval && styles.approvalModeTextManual]}>
              {isManualApproval ? '✋ ידני' : '⚡ אוטומטי'}
            </Text>
          </TouchableOpacity>
        </View> */}

        {/* כפתורי ניהול */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('OwnerPricing', { id: item.id })} 
            style={styles.actionButton} 
            activeOpacity={0.85}
          >
            <Ionicons name="pricetag" size={22} color={theme.colors.warning} />
            <Text style={[styles.actionButtonText, { color: theme.colors.warning }]}>מחירון</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('OwnerAvailability', { id: item.id })} 
            style={styles.actionButton} 
            activeOpacity={0.85}
          >
            <Ionicons name="calendar" size={22} color={theme.colors.accent} />
            <Text style={[styles.actionButtonText, { color: theme.colors.accent }]}>שעות</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('OwnerListingDetail', { id: item.id })} 
            style={styles.actionButton} 
            activeOpacity={0.85}
          >
            <Ionicons name="bar-chart" size={22} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>דוח</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => toggleActive(item.id)} 
            style={[styles.actionButton, isActive && styles.actionButtonActive]} 
            activeOpacity={0.85}
          >
            <Ionicons name={isActive ? 'toggle' : 'toggle-outline'} size={26} color={isActive ? theme.colors.success : theme.colors.subtext} />
            <Text style={[styles.actionButtonText, { color: isActive ? theme.colors.success : theme.colors.subtext }]}>
              {isActive ? 'פעיל' : 'כבוי'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.subtext }}>טוען חניות...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        data={listings}
        keyExtractor={i => String(i.id)}
        renderItem={renderListing}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.header}>ניהול החניות</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>אין עדיין חניות מאושרות</Text>
            <Text style={styles.emptyHint}>הגש בקשה או המתן לאישור</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
      />
      
      {/* כפתור הוסף חניה בתחתית */}
      <View style={styles.floatingButtonContainer}>
        <ZpButton
          title="הוסף חניה"
          onPress={() => navigation.navigate('OwnerListingForm')}
          leftIcon={<Ionicons name="add" size={18} color="#fff" style={{ marginEnd: 6 }} />}
          style={styles.floatingButton}
        />
      </View>
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    wrap:{ flex:1, backgroundColor: colors.bg, padding: spacing.lg },
    headerContainer:{ 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: spacing.md 
    },
    header:{ fontSize:20, fontWeight:'800', color: colors.text, flex: 1, textAlign: 'center' },

    floatingButtonContainer: {
      position: 'absolute',
      bottom: spacing.lg,
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: 'transparent',
    },
    floatingButton: {
      width: '100%',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },

    // כרטיס חניה
    card:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth:1, borderColor: colors.border,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    cardActive:{ borderColor:'#b9f5cf', backgroundColor:'#f7fffb' },

    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: spacing.md,
    },
    actionButton: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.bg,
      borderWidth: 2,
      borderColor: colors.border,
      flex: 1,
      minWidth: '22%',
      gap: 6,
    },
    actionButtonActive: {
      backgroundColor: colors.success + '15',
      borderColor: colors.success,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },

    title:{ fontSize:17, fontWeight:'800', marginBottom: spacing.sm, color: colors.text, textAlign: 'right' },
    line:{ fontSize:14, color: colors.text, marginVertical:3, textAlign: 'right' },
    
    approvalModeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.bg,
      borderRadius: borderRadii.sm,
    },
    approvalModeLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    approvalModeButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: borderRadii.sm,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    approvalModeButtonManual: {
      backgroundColor: colors.warning,
      borderColor: colors.warning,
    },
    approvalModeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    approvalModeTextManual: {
      color: '#FFFFFF',
    },
    
    emptyContainer: {
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    emptyHint: {
      fontSize: 14,
      color: colors.subtext,
      textAlign: 'center',
    },

    statusPill:{
      paddingVertical:4, paddingHorizontal:10,
      borderRadius: 999, fontSize:12, overflow:'hidden',
      borderWidth:1, borderColor: colors.border, color: colors.text, backgroundColor: colors.bg
    },
    pillOn:{ color: colors.success, borderColor:'#b9f5cf', backgroundColor:'#f7fffb' },
    pillOff:{ color:'#fff', borderColor:'#d66', backgroundColor:'#d66' },
    pillManual:{ color: colors.warning, borderColor:'#ffd79a', backgroundColor:'#fff7e6' },

    thumb:{ width:'100%', height:160, borderRadius: borderRadii.sm, marginBottom:8, backgroundColor: colors.bg },

    secondaryBtn:{
      flex:1,
      backgroundColor: colors.surface,
      paddingVertical:12,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.primary,
      alignItems:'center',
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
    secondaryBtnText:{ color: colors.primary, fontWeight:'800' },

    empty:{ color: colors.subtext, textAlign:'center', marginTop: 8 },
  });
}

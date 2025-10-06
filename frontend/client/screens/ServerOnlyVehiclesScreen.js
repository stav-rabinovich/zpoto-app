/**
 * מסך ניהול רכבים - Server-Only Architecture
 * כל הנתונים מהשרת, אין שמירה מקומית כלל
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';

import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from '../hooks/useOfflineMode';
import useServerOnlyVehicles from '../hooks/useServerOnlyVehicles';
import OfflineScreen from '../components/offline/OfflineScreen';
import ServerErrorScreen from '../components/offline/ServerErrorScreen';

export default function ServerOnlyVehiclesScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  
  const { user, isAuthenticated } = useAuthContext();
  const { isFullyOnline, isOfflineMode, isServerDown, retryConnection } = useOfflineMode();
  
  const {
    vehicles,
    loading,
    refreshing,
    error,
    loadVehicles,
    refreshVehicles,
    deleteVehicle,
    setDefaultVehicle,
    getVehicleStats,
    getVehicleDisplayName,
    formatLicensePlate,
    getColorDisplayName,
    isEmpty,
    isOnline,
    canManageVehicles,
    statusMessage
  } = useServerOnlyVehicles();

  const [deletingVehicleId, setDeletingVehicleId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // טעינה ראשונית
  useEffect(() => {
    if (isAuthenticated && isFullyOnline) {
      loadVehicles();
    }
  }, [isAuthenticated, isFullyOnline, loadVehicles]);

  /**
   * רענון רכבים
   */
  const handleRefresh = useCallback(async () => {
    if (!isFullyOnline) {
      Alert.alert('אין חיבור לשרת', 'בדוק את החיבור לאינטרנט ונסה שוב.');
      return;
    }
    
    await refreshVehicles();
  }, [isFullyOnline, refreshVehicles]);

  /**
   * מחיקת רכב
   */
  const handleDeleteVehicle = useCallback(async (vehicle) => {
    if (!isFullyOnline) {
      Alert.alert('אין חיבור לשרת', 'מחיקת רכב דורשת חיבור לאינטרנט.');
      return;
    }

    Alert.alert(
      'מחיקת רכב',
      `האם אתה בטוח שברצונך למחוק את הרכב ${formatLicensePlate(vehicle.licensePlate)}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, מחק',
          style: 'destructive',
          onPress: async () => {
            setDeletingVehicleId(vehicle.id);
            
            try {
              const result = await deleteVehicle(vehicle.id);
              
              if (result.success) {
                Alert.alert('רכב נמחק', 'הרכב נמחק בהצלחה.');
              } else {
                Alert.alert('שגיאה', result.error);
              }
            } catch (error) {
              Alert.alert('שגיאה', 'אירעה שגיאה במחיקת הרכב.');
            } finally {
              setDeletingVehicleId(null);
            }
          }
        }
      ]
    );
  }, [isFullyOnline, deleteVehicle, formatLicensePlate]);

  /**
   * הגדרת רכב כברירת מחדל
   */
  const handleSetDefault = useCallback(async (vehicle) => {
    if (!isFullyOnline) {
      Alert.alert('אין חיבור לשרת', 'הגדרת ברירת מחדל דורשת חיבור לאינטרנט.');
      return;
    }

    if (vehicle.isDefault) {
      return; // כבר ברירת מחדל
    }

    setSettingDefaultId(vehicle.id);
    
    try {
      const result = await setDefaultVehicle(vehicle.id);
      
      if (result.success) {
        // הצלחה - לא צריך הודעה, העדכון יראה בUI
      } else {
        Alert.alert('שגיאה', result.error);
      }
    } catch (error) {
      Alert.alert('שגיאה', 'אירעה שגיאה בהגדרת ברירת המחדל.');
    } finally {
      setSettingDefaultId(null);
    }
  }, [isFullyOnline, setDefaultVehicle]);

  /**
   * עריכת רכב
   */
  const handleEditVehicle = useCallback((vehicle) => {
    if (!canManageVehicles) {
      Alert.alert('אין חיבור לשרת', 'עריכת רכב דורשת חיבור לאינטרנט.');
      return;
    }
    
    navigation.navigate('EditVehicle', { vehicleId: vehicle.id });
  }, [canManageVehicles, navigation]);

  /**
   * הוספת רכב חדש
   */
  const handleAddVehicle = useCallback(() => {
    if (!canManageVehicles) {
      if (!isAuthenticated) {
        navigation.navigate('Login');
      } else {
        Alert.alert('אין חיבור לשרת', 'הוספת רכב דורשת חיבור לאינטרנט.');
      }
      return;
    }
    
    navigation.navigate('AddVehicle');
  }, [canManageVehicles, isAuthenticated, navigation]);

  /**
   * רנדור פריט רכב
   */
  const renderVehicleItem = useCallback(({ item: vehicle }) => {
    const isDeleting = deletingVehicleId === vehicle.id;
    const isSettingDefault = settingDefaultId === vehicle.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.vehicleItem,
          { backgroundColor: colors.surface },
          vehicle.isDefault && { borderColor: colors.primary, borderWidth: 2 }
        ]}
        onPress={() => handleEditVehicle(vehicle)}
        disabled={isDeleting || isSettingDefault}
      >
        {/* כותרת וסטטוס */}
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleTitle}>
            <Ionicons 
              name={vehicle.isDefault ? "car" : "car-outline"} 
              size={20} 
              color={vehicle.isDefault ? colors.primary : colors.subtext} 
            />
            <Text style={[
              styles.licensePlate, 
              { color: colors.text },
              vehicle.isDefault && { fontWeight: '700' }
            ]}>
              {formatLicensePlate(vehicle.licensePlate)}
            </Text>
          </View>
          
          {vehicle.isDefault && (
            <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.defaultBadgeText}>ברירת מחדל</Text>
            </View>
          )}
        </View>

        {/* פרטי רכב */}
        <View style={styles.vehicleDetails}>
          <Text style={[styles.vehicleDescription, { color: colors.text }]}>
            {getVehicleDisplayName(vehicle) || 'רכב ללא תיאור'}
          </Text>
          
          {vehicle.color && (
            <View style={styles.colorInfo}>
              <View style={[
                styles.colorDot, 
                { backgroundColor: vehicle.color === 'white' ? colors.border : vehicle.color }
              ]} />
              <Text style={[styles.colorText, { color: colors.subtext }]}>
                {getColorDisplayName(vehicle.color)}
              </Text>
            </View>
          )}
        </View>

        {/* פעולות */}
        <View style={styles.vehicleActions}>
          {!vehicle.isDefault && !isSettingDefault && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.primary }]}
              onPress={() => handleSetDefault(vehicle)}
            >
              <Ionicons name="star-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                הגדר כברירת מחדל
              </Text>
            </TouchableOpacity>
          )}
          
          {isSettingDefault && (
            <View style={styles.loadingAction}>
              <Text style={[styles.loadingText, { color: colors.subtext }]}>
                מגדיר כברירת מחדל...
              </Text>
            </View>
          )}
          
          {!isDeleting && (
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: colors.error }]}
              onPress={() => handleDeleteVehicle(vehicle)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          )}
          
          {isDeleting && (
            <View style={styles.loadingAction}>
              <Text style={[styles.loadingText, { color: colors.subtext }]}>
                מוחק...
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [
    colors,
    deletingVehicleId,
    settingDefaultId,
    handleEditVehicle,
    handleSetDefault,
    handleDeleteVehicle,
    formatLicensePlate,
    getVehicleDisplayName,
    getColorDisplayName
  ]);

  // בדיקת הרשאות
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            נדרשת התחברות
          </Text>
          <Text style={[styles.errorMessage, { color: colors.subtext }]}>
            יש להתחבר כדי לנהל רכבים
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>התחבר</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // מסך offline
  if (isOfflineMode) {
    return (
      <OfflineScreen
        title="אין חיבור לאינטרנט"
        message="ניהול רכבים דורש חיבור לאינטרנט. בדוק את החיבור ונסה שוב."
        onRetry={retryConnection}
        retryText="נסה שוב"
      />
    );
  }

  // מסך שרת לא זמין
  if (isServerDown) {
    return (
      <ServerErrorScreen
        title="השרת לא זמין"
        error={{ status: 503, message: 'השרת לא זמין כרגע' }}
        onRetry={retryConnection}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  // מסך שגיאה בטעינה
  if (error && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            שגיאה בטעינת רכבים
          </Text>
          <Text style={[styles.errorMessage, { color: colors.subtext }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stats = getVehicleStats();

  return (
    <View style={styles.container}>
      {/* כותרת */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          הרכבים שלי
        </Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => setShowStatsModal(true)}
          >
            <Ionicons name="stats-chart-outline" size={20} color={colors.subtext} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddVehicle}
            disabled={!canManageVehicles}
          >
            <Ionicons 
              name="add" 
              size={24} 
              color={canManageVehicles ? colors.primary : colors.subtext} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* סטטיסטיקות מהירות */}
      {!isEmpty && (
        <View style={[styles.quickStats, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>
              רכבים
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons 
              name={stats.hasDefault ? "star" : "star-outline"} 
              size={20} 
              color={stats.hasDefault ? colors.success : colors.subtext} 
            />
            <Text style={[styles.statLabel, { color: colors.subtext }]}>
              ברירת מחדל
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {stats.makes.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>
              יצרנים
            </Text>
          </View>
        </View>
      )}

      {/* רשימת רכבים */}
      <FlatList
        data={vehicles}
        renderItem={renderVehicleItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color={colors.subtext} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              אין רכבים
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.subtext }]}>
              הוסף את הרכב הראשון שלך כדי להתחיל להזמין חניות
            </Text>
            <TouchableOpacity
              style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
              onPress={handleAddVehicle}
              disabled={!canManageVehicles}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>הוסף רכב ראשון</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* אינדיקטור מצב */}
      {!isOnline && (
        <View style={[styles.statusBar, { backgroundColor: colors.warning }]}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.statusBarText}>
            אין חיבור לשרת - הנתונים עלולים להיות לא עדכניים
          </Text>
        </View>
      )}

      {/* מודל סטטיסטיקות */}
      <VehicleStatsModal
        visible={showStatsModal}
        stats={stats}
        onClose={() => setShowStatsModal(false)}
        colors={colors}
      />
    </View>
  );
}

// רכיב מודל סטטיסטיקות
function VehicleStatsModal({ visible, stats, onClose, colors }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>סגור</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>סטטיסטיקות רכבים</Text>
            <View style={{ width: 50 }} />
          </View>
        </View>
        
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 12, marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
              סיכום כללי
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: colors.subtext }}>סה"כ רכבים:</Text>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{stats.total}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: colors.subtext }}>יש ברירת מחדל:</Text>
              <Text style={{ color: stats.hasDefault ? colors.success : colors.error, fontWeight: '600' }}>
                {stats.hasDefault ? 'כן' : 'לא'}
              </Text>
            </View>
            
            {stats.defaultVehicle && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: colors.subtext }}>רכב ברירת מחדל:</Text>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  {stats.defaultVehicle.licensePlate}
                </Text>
              </View>
            )}
          </View>

          {stats.makes.length > 0 && (
            <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 12, marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
                יצרנים ({stats.makes.length})
              </Text>
              {stats.makes.map((make, index) => (
                <Text key={index} style={{ color: colors.subtext, marginBottom: 4 }}>
                  • {make}
                </Text>
              ))}
            </View>
          )}

          {stats.colors.length > 0 && (
            <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
                צבעים ({stats.colors.length})
              </Text>
              {stats.colors.map((color, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: color === 'white' ? colors.border : color,
                    marginRight: 8
                  }} />
                  <Text style={{ color: colors.subtext }}>{color}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statsButton: {
      padding: 8,
      marginRight: 8,
    },
    addButton: {
      padding: 8,
    },
    quickStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 16,
      marginHorizontal: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    listContainer: {
      padding: 16,
    },
    vehicleItem: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    vehicleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    vehicleTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    licensePlate: {
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
    },
    defaultBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    defaultBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    vehicleDetails: {
      marginBottom: 12,
    },
    vehicleDescription: {
      fontSize: 16,
      marginBottom: 4,
    },
    colorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 6,
    },
    colorText: {
      fontSize: 14,
    },
    vehicleActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 4,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
    },
    loadingAction: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    loadingText: {
      fontSize: 12,
      fontStyle: 'italic',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
    },
    addFirstButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    addFirstButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    statusBarText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 6,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    errorMessage: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    loginButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
  });
}

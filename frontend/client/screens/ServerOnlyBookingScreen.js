/**
 * מסך הזמנות חדש - Server-Only Architecture
 * כל הנתונים מהשרת, אין שמירה מקומית כלל
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  Modal,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/he';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';

// השתמש במערכת החדשה
import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from '../hooks/useOfflineMode';
import { useUserVehicles, usePaymentMethods } from '../hooks/useOptimizedData';
import { bookingsAPI, vehiclesAPI } from '../utils/server-only-api';
import OfflineScreen from '../components/offline/OfflineScreen';
import ServerErrorScreen from '../components/offline/ServerErrorScreen';
import ZpButton from '../components/ui/ZpButton';

dayjs.locale('he');

// ודא ש-RTL מאופשר
try { I18nManager.allowRTL(true); } catch {}

function msToHhMm(ms) {
  if (ms <= 0) return '00:00';
  const totalMin = Math.floor(ms / (60 * 1000));
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export default function ServerOnlyBookingScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  
  const { user, isAuthenticated } = useAuthContext();
  const { isFullyOnline, isOfflineMode, isServerDown, retryConnection } = useOfflineMode();
  
  // טעינת נתונים מהשרת
  const { data: vehicles, loading: vehiclesLoading, refresh: refreshVehicles } = useUserVehicles();
  const { data: paymentMethods, loading: paymentLoading } = usePaymentMethods();

  // פרמטרים מהניווט
  const { spot, selectedDate, startTime, endTime } = route.params || {};

  // State של הטופס
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State של UI
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // אתחול נתונים
  useEffect(() => {
    initializeBookingData();
  }, [vehicles, paymentMethods]);

  /**
   * אתחול נתוני ההזמנה מהשרת
   */
  const initializeBookingData = useCallback(() => {
    if (!isAuthenticated || !isFullyOnline) return;

    // בחירת רכב ברירת מחדל
    if (vehicles && vehicles.length > 0 && !selectedVehicle) {
      const defaultVehicle = vehicles.find(v => v.isDefault) || vehicles[0];
      setSelectedVehicle(defaultVehicle);
    }

    // בחירת אמצעי תשלום ברירת מחדל
    if (paymentMethods && paymentMethods.length > 0 && !selectedPayment) {
      const defaultPayment = paymentMethods.find(p => p.isDefault) || paymentMethods[0];
      setSelectedPayment(defaultPayment);
    }
  }, [vehicles, paymentMethods, selectedVehicle, selectedPayment, isAuthenticated, isFullyOnline]);

  /**
   * יצירת הזמנה - רק בשרת
   */
  const handleCreateBooking = useCallback(async () => {
    if (!isFullyOnline) {
      Alert.alert(
        'אין חיבור לשרת',
        'יצירת הזמנה דורשת חיבור לשרת. בדוק את החיבור ונסה שוב.',
        [
          { text: 'נסה שוב', onPress: retryConnection },
          { text: 'ביטול', style: 'cancel' }
        ]
      );
      return;
    }

    // ולידציה
    if (!selectedVehicle) {
      Alert.alert('שגיאה', 'נא לבחור רכב');
      return;
    }

    if (!spot || !startTime || !endTime) {
      Alert.alert('שגיאה', 'חסרים פרטי ההזמנה');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚗 Creating server-only booking...');

      const bookingData = {
        parkingId: spot.id,
        vehicleId: selectedVehicle.id,
        paymentMethodId: selectedPayment?.id,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        notes: notes.trim() || null,
        totalPrice: calculateTotalPrice(),
      };

      console.log('📝 Booking data:', bookingData);

      const response = await bookingsAPI.create(bookingData);
      
      console.log('✅ Booking created successfully:', response.data);

      // הצגת הודעת הצלחה
      Alert.alert(
        'הזמנה נוצרה בהצלחה!',
        `ההזמנה שלך נשמרה בשרת.\nמספר הזמנה: ${response.data.id}`,
        [
          {
            text: 'צפה בהזמנות',
            onPress: () => navigation.navigate('MyBookings')
          },
          {
            text: 'חזור לבית',
            onPress: () => navigation.navigate('Home'),
            style: 'cancel'
          }
        ]
      );

    } catch (error) {
      console.error('❌ Booking creation failed:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה ביצירת ההזמנה';
      setError(errorMessage);
      
      Alert.alert(
        'שגיאה ביצירת הזמנה',
        errorMessage,
        [
          { text: 'נסה שוב', onPress: handleCreateBooking },
          { text: 'ביטול', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [
    isFullyOnline,
    selectedVehicle,
    selectedPayment,
    spot,
    startTime,
    endTime,
    notes,
    retryConnection,
    navigation
  ]);

  /**
   * חישוב מחיר כולל
   */
  const calculateTotalPrice = useCallback(() => {
    if (!spot || !startTime || !endTime) return 0;
    
    const duration = new Date(endTime) - new Date(startTime);
    const hours = Math.ceil(duration / (1000 * 60 * 60));
    
    return hours * (spot.priceHr || 0);
  }, [spot, startTime, endTime]);

  /**
   * יצירת רכב חדש
   */
  const handleCreateVehicle = useCallback(async () => {
    if (!isFullyOnline) {
      Alert.alert('אין חיבור לשרת', 'יצירת רכב דורשת חיבור לשרת.');
      return;
    }

    navigation.navigate('AddVehicle', {
      onSuccess: () => {
        refreshVehicles();
      }
    });
  }, [isFullyOnline, navigation, refreshVehicles]);

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
            יש להתחבר כדי ליצור הזמנה
          </Text>
          <ZpButton
            title="התחבר"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
          />
        </View>
      </View>
    );
  }

  // מסך offline
  if (isOfflineMode) {
    return (
      <OfflineScreen
        title="אין חיבור לאינטרנט"
        message="יצירת הזמנה דורשת חיבור לאינטרנט. בדוק את החיבור ונסה שוב."
        onRetry={retryConnection}
        retryText="נסה שוב"
        customAction={{
          text: 'חזור',
          onPress: () => navigation.goBack()
        }}
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

  // מסך טעינה
  if (vehiclesLoading || paymentLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>
            טוען נתוני הזמנה מהשרת...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* כותרת */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            יצירת הזמנה
          </Text>
          
          <View style={styles.headerRight} />
        </View>

        {/* פרטי החניה */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            פרטי החניה
          </Text>
          
          <View style={styles.parkingInfo}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.parkingTitle, { color: colors.text }]}>
              {spot?.title || 'חניה'}
            </Text>
          </View>
          
          <View style={styles.timeInfo}>
            <View style={styles.timeItem}>
              <Ionicons name="time-outline" size={16} color={colors.subtext} />
              <Text style={[styles.timeText, { color: colors.subtext }]}>
                {dayjs(startTime).format('DD/MM/YYYY HH:mm')} - {dayjs(endTime).format('HH:mm')}
              </Text>
            </View>
            
            <View style={styles.priceItem}>
              <Ionicons name="card-outline" size={16} color={colors.success} />
              <Text style={[styles.priceText, { color: colors.success }]}>
                ₪{calculateTotalPrice()}
              </Text>
            </View>
          </View>
        </View>

        {/* בחירת רכב */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            בחירת רכב
          </Text>
          
          {vehicles && vehicles.length > 0 ? (
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setShowVehicleModal(true)}
            >
              <View style={styles.selectionContent}>
                <Ionicons name="car-outline" size={20} color={colors.primary} />
                <Text style={[styles.selectionText, { color: colors.text }]}>
                  {selectedVehicle ? 
                    `${selectedVehicle.licensePlate} - ${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`.trim() :
                    'בחר רכב'
                  }
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.subtext} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleCreateVehicle}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                הוסף רכב ראשון
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* בחירת אמצעי תשלום */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            אמצעי תשלום
          </Text>
          
          {paymentMethods && paymentMethods.length > 0 ? (
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setShowPaymentModal(true)}
            >
              <View style={styles.selectionContent}>
                <Ionicons name="card-outline" size={20} color={colors.primary} />
                <Text style={[styles.selectionText, { color: colors.text }]}>
                  {selectedPayment?.name || 'בחר אמצעי תשלום'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.subtext} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddPaymentMethod')}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                הוסף אמצעי תשלום
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* הערות */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            הערות (אופציונלי)
          </Text>
          
          <TextInput
            style={[styles.notesInput, { 
              backgroundColor: colors.bg,
              color: colors.text,
              borderColor: colors.border
            }]}
            placeholder="הוסף הערות להזמנה..."
            placeholderTextColor={colors.subtext}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlign="right"
          />
        </View>

        {/* הודעת שגיאה */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + '10' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>
              {error}
            </Text>
          </View>
        )}

        {/* כפתור יצירת הזמנה */}
        <View style={styles.bottomSection}>
          <ZpButton
            title={loading ? "יוצר הזמנה..." : "צור הזמנה"}
            onPress={handleCreateBooking}
            disabled={loading || !isFullyOnline || !selectedVehicle}
            loading={loading}
            style={[
              styles.createButton,
              (!isFullyOnline || !selectedVehicle) && styles.disabledButton
            ]}
            leftIcon={loading ? null : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
          />
          
          {!isFullyOnline && (
            <Text style={[styles.offlineWarning, { color: colors.warning }]}>
              נדרש חיבור לשרת ליצירת הזמנה
            </Text>
          )}
        </View>
      </ScrollView>

      {/* מודל בחירת רכב */}
      <VehicleSelectionModal
        visible={showVehicleModal}
        vehicles={vehicles || []}
        selectedVehicle={selectedVehicle}
        onSelect={(vehicle) => {
          setSelectedVehicle(vehicle);
          setShowVehicleModal(false);
        }}
        onClose={() => setShowVehicleModal(false)}
        onAddNew={handleCreateVehicle}
        colors={colors}
      />

      {/* מודל בחירת אמצעי תשלום */}
      <PaymentSelectionModal
        visible={showPaymentModal}
        paymentMethods={paymentMethods || []}
        selectedPayment={selectedPayment}
        onSelect={(payment) => {
          setSelectedPayment(payment);
          setShowPaymentModal(false);
        }}
        onClose={() => setShowPaymentModal(false)}
        onAddNew={() => navigation.navigate('AddPaymentMethod')}
        colors={colors}
      />
    </KeyboardAvoidingView>
  );
}

// רכיב מודל בחירת רכב
function VehicleSelectionModal({ visible, vehicles, selectedVehicle, onSelect, onClose, onAddNew, colors }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>ביטול</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>בחר רכב</Text>
            <TouchableOpacity onPress={onAddNew}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>הוסף</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={{ flex: 1, padding: 20 }}>
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={{
                padding: 16,
                backgroundColor: colors.surface,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: selectedVehicle?.id === vehicle.id ? 2 : 1,
                borderColor: selectedVehicle?.id === vehicle.id ? colors.primary : colors.border,
              }}
              onPress={() => onSelect(vehicle)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="car" size={24} color={colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                    {vehicle.licensePlate}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.subtext }}>
                    {`${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'רכב'}
                  </Text>
                </View>
                {selectedVehicle?.id === vehicle.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// רכיב מודל בחירת אמצעי תשלום
function PaymentSelectionModal({ visible, paymentMethods, selectedPayment, onSelect, onClose, onAddNew, colors }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>ביטול</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>בחר אמצעי תשלום</Text>
            <TouchableOpacity onPress={onAddNew}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>הוסף</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={{ flex: 1, padding: 20 }}>
          {paymentMethods.map((payment) => (
            <TouchableOpacity
              key={payment.id}
              style={{
                padding: 16,
                backgroundColor: colors.surface,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: selectedPayment?.id === payment.id ? 2 : 1,
                borderColor: selectedPayment?.id === payment.id ? colors.primary : colors.border,
              }}
              onPress={() => onSelect(payment)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="card" size={24} color={colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                    {payment.name}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.subtext }}>
                    {payment.type}
                  </Text>
                </View>
                {selectedPayment?.id === payment.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    scrollView: {
      flex: 1,
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
    headerRight: {
      width: 40,
    },
    section: {
      margin: 16,
      padding: 16,
      borderRadius: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    parkingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    parkingTitle: {
      fontSize: 16,
      marginLeft: 8,
    },
    timeInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timeItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timeText: {
      fontSize: 14,
      marginLeft: 4,
    },
    priceItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    priceText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 4,
    },
    selectionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: colors.bg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    selectionText: {
      fontSize: 16,
      marginLeft: 8,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: colors.primary + '10',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    addButtonText: {
      fontSize: 16,
      marginLeft: 8,
      fontWeight: '500',
    },
    notesInput: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      fontSize: 16,
      textAlignVertical: 'top',
      minHeight: 80,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      padding: 12,
      borderRadius: 8,
    },
    errorBannerText: {
      fontSize: 14,
      marginLeft: 8,
      flex: 1,
    },
    bottomSection: {
      padding: 20,
      paddingBottom: 40,
    },
    createButton: {
      marginBottom: 8,
    },
    disabledButton: {
      opacity: 0.6,
    },
    offlineWarning: {
      fontSize: 12,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 16,
      marginTop: 16,
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
      minWidth: 120,
    },
  });
}

/**
 * רכיב התראה לחפיפת הזמנות רכב
 * 🚗 מטרה: הצגת התראה ברורה כשנמצאת חפיפה בהזמנות של אותו רכב
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

const VehicleConflictAlert = ({
  visible,
  onClose,
  onViewBookings,
  conflictData,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (!conflictData || !visible) {
    return null;
  }

  const { message, conflictingBookings = [], vehicleIdentifier } = conflictData;

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeRange = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const startStr = start.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const endStr = end.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // אם זה באותו היום
    if (start.toDateString() === end.toDateString()) {
      const dateStr = start.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
      });
      return `${dateStr} | ${startStr} - ${endStr}`;
    }

    // אם זה בימים שונים
    return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {/* כותרת עם אייקון ורקע gradient */}
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.header}
          >
            <View style={styles.iconContainer}>
              <Ionicons 
                name="car-sport" 
                size={36} 
                color="white" 
              />
            </View>
            <Text style={styles.title}>חפיפת הזמנות רכב</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="סגור התראה"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* תוכן ההתראה */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* הודעה עיקרית */}
            <View style={styles.messageContainer}>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* פרטי הרכב - הוסר כי לא רלוונטי */}

            {/* רשימת הזמנות חופפות */}
            {conflictingBookings.length > 0 && (
              <View style={styles.conflictsSection}>
                <Text style={styles.sectionTitle}>
                  הזמנות חופפות ({conflictingBookings.length}):
                </Text>
                
                {conflictingBookings.map((booking, index) => (
                  <View key={booking.id || index} style={styles.conflictItem}>
                    <View style={styles.conflictHeader}>
                      <Ionicons 
                        name="location" 
                        size={16} 
                        color="#FF6B6B" 
                        style={styles.conflictIcon}
                      />
                      <Text style={styles.conflictTitle}>
                        {booking.parking?.title || 'חניה לא ידועה'}
                      </Text>
                    </View>
                    
                    {booking.parking?.address && (
                      <Text style={styles.conflictAddress}>
                        {booking.parking.address}
                      </Text>
                    )}
                    
                    <View style={styles.conflictTimeContainer}>
                      <Ionicons 
                        name="time" 
                        size={14} 
                        color="#4A5568" 
                        style={styles.timeIcon}
                      />
                      <Text style={styles.conflictTime}>
                        {formatTimeRange(booking.startTime, booking.endTime)}
                      </Text>
                    </View>

                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusBadge,
                        booking.status === 'CONFIRMED' && styles.confirmedBadge,
                        booking.status === 'PENDING' && styles.pendingBadge,
                      ]}>
                        <Text style={[
                          styles.statusText,
                          booking.status === 'CONFIRMED' && styles.confirmedText,
                          booking.status === 'PENDING' && styles.pendingText,
                        ]}>
                          {booking.status === 'CONFIRMED' ? 'מאושרת' : 
                           booking.status === 'PENDING' ? 'בהמתנה' : booking.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* הסבר והנחיות */}
            <View style={styles.explanationContainer}>
              <View style={styles.explanationHeader}>
                <Ionicons 
                  name="information-circle" 
                  size={20} 
                  color="#2B6CB0" 
                />
                <Text style={styles.explanationTitle}>למה זה קורה?</Text>
              </View>
              <Text style={styles.explanationText}>
                אותו רכב לא יכול להיות בשני מקומות בו זמנית. כדי לבצע הזמנה חדשה, 
                עליך לבטל או לשנות את ההזמנה הקיימת.
              </Text>
            </View>
          </ScrollView>

          {/* כפתורי פעולה */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={onClose}
              accessibilityLabel="חזור"
            >
              <Ionicons 
                name="arrow-back" 
                size={18} 
                color="white" 
                style={styles.buttonIcon}
              />
              <Text style={styles.primaryButtonText}>חזור</Text>
            </TouchableOpacity>

            {onViewBookings && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={onViewBookings}
                accessibilityLabel="צפה בהזמנות שלי"
              >
                <Ionicons 
                  name="list" 
                  size={18} 
                  color="#FF6B6B" 
                  style={styles.buttonIcon}
                />
                <Text style={styles.secondaryButtonText}>צפה בהזמנות שלי</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', // רקע שקוף עדין
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 28,
    width: Math.min(screenWidth - 40, 400),
    maxHeight: '85%',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden',
    alignSelf: 'center', // מרכז את המלבן
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    justifyContent: 'flex-start', // התחל מהשמאל
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'left', // צמוד לאייקון
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginLeft: 12, // מרווח קטן מהאייקון
  },
  closeButton: {
    padding: 4,
    position: 'absolute',
    right: 22,
    top: 36, // הורדה לגובה הטקסט
  },
  content: {
    paddingHorizontal: 0, // פחות padding כדי לאפשר מרכוז טוב יותר
    paddingVertical: 20,
  },
  contentContainer: {
    alignItems: 'center', // מרכז את המלבנים
    justifyContent: 'center', // מרכז גם אנכית
  },
  messageContainer: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FED7D7',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '85%', // קצת יותר צר כדי להיות ממורכז יותר
    alignSelf: 'center', // מרכז
  },
  message: {
    fontSize: 17,
    color: '#C53030',
    fontWeight: '600',
    textAlign: 'left', // שינוי לשמאל
    lineHeight: 26,
  },
  vehicleInfo: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748', // צבע כהה קריא
    marginBottom: 8,
    textAlign: 'left', // שינוי לשמאל
  },
  vehicleText: {
    fontSize: 14,
    color: '#4A5568', // צבע אפור כהה קריא
    textAlign: 'left', // שינוי לשמאל
    backgroundColor: '#F7FAFC', // רקע בהיר
    padding: 12,
    borderRadius: 8,
  },
  conflictsSection: {
    marginBottom: 20,
    width: '85%', // קצת יותר צר כדי להיות ממורכז יותר
    alignSelf: 'center', // מרכז
  },
  conflictItem: {
    backgroundColor: '#F7FAFC', // רקע בהיר
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0', // מסגרת בהירה
  },
  conflictHeader: {
    flexDirection: 'row', // כיוון רגיל לשמאל
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'flex-start', // התחל מהשמאל
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748', // צבע כהה קריא
    textAlign: 'left', // שינוי לשמאל
  },
  conflictIcon: {
    marginRight: 8, // שינוי ל-marginRight כי עכשיו הכיוון רגיל
  },
  conflictAddress: {
    fontSize: 14,
    color: '#4A5568', // צבע אפור כהה קריא
    textAlign: 'left', // שינוי לשמאל
    marginBottom: 8,
  },
  conflictTimeContainer: {
    flexDirection: 'row', // כיוון רגיל לשמאל
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'flex-start', // התחל מהשמאל
  },
  timeIcon: {
    marginRight: 6, // שינוי חזרה ל-marginRight כי עכשיו הכיוון רגיל
  },
  conflictTime: {
    fontSize: 14,
    color: '#4A5568', // צבע אפור כהה קריא
    textAlign: 'left', // שינוי לשמאל
  },
  statusContainer: {
    alignItems: 'flex-start', // שינוי לשמאל
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  confirmedBadge: {
    backgroundColor: colors.successBackground,
  },
  pendingBadge: {
    backgroundColor: colors.warningBackground,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmedText: {
    color: colors.success,
  },
  pendingText: {
    color: colors.warning,
  },
  explanationContainer: {
    backgroundColor: '#EBF8FF', // רקע כחול בהיר
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '85%', // קצת יותר צר כדי להיות ממורכז יותר
    alignSelf: 'center', // מרכז
  },
  explanationHeader: {
    flexDirection: 'row', // כיוון רגיל לשמאל
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'flex-start', // התחל מהשמאל
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B6CB0', // כחול כהה
    marginLeft: 8, // שינוי ל-marginLeft כי האייקון עכשיו משמאל
    textAlign: 'left', // שינוי לשמאל
  },
  explanationText: {
    fontSize: 14,
    color: '#2D3748', // צבע כהה קריא
    lineHeight: 20,
    textAlign: 'left', // שינוי לשמאל
  },
  actions: {
    flexDirection: 'row-reverse', // הפוך כיוון כדי ש"צפה בהזמנות" יהיה מימין
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 20,
    gap: 16,
    width: '95%', // יותר רחב אבל עדיין ממורכז
    alignSelf: 'center', // מרכז
    justifyContent: 'center', // מרכז את הכפתורים
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
    textAlign: 'center',
  },
});

export default VehicleConflictAlert;

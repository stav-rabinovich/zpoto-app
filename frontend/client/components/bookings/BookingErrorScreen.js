/**
 * מסך שגיאות להזמנות - Server-Only Architecture
 * מחליף את כל ה-fallback המקומי במסכי שגיאה ברורים
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';

export default function BookingErrorScreen({
  type = 'general',
  title,
  message,
  error,
  onRetry,
  onGoBack,
  onGoHome,
  customActions = []
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // קבלת תוכן לפי סוג השגיאה
  const getErrorContent = () => {
    switch (type) {
      case 'offline':
        return {
          icon: 'cloud-offline-outline',
          title: title || 'אין חיבור לאינטרנט',
          message: message || 'הזמנות דורשות חיבור לאינטרנט. בדוק את החיבור ונסה שוב.',
          color: colors.warning,
          illustration: '📡'
        };
      
      case 'server':
        return {
          icon: 'server-outline',
          title: title || 'השרת לא זמין',
          message: message || 'השרת לא זמין כרגע. נסה שוב בעוד מספר דקות.',
          color: colors.error,
          illustration: '🔧'
        };
      
      case 'auth':
        return {
          icon: 'person-outline',
          title: title || 'נדרשת התחברות',
          message: message || 'יש להתחבר כדי לצפות בהזמנות ולבצע הזמנות חדשות.',
          color: colors.primary,
          illustration: '🔐'
        };
      
      case 'booking_failed':
        return {
          icon: 'alert-circle-outline',
          title: title || 'יצירת ההזמנה נכשלה',
          message: message || 'לא ניתן ליצור את ההזמנה כרגע. בדוק את החיבור ונסה שוב.',
          color: colors.error,
          illustration: '❌'
        };
      
      case 'load_failed':
        return {
          icon: 'refresh-outline',
          title: title || 'טעינת ההזמנות נכשלה',
          message: message || 'לא ניתן לטעון את ההזמנות מהשרת. בדוק את החיבור ונסה שוב.',
          color: colors.error,
          illustration: '📋'
        };
      
      case 'cancel_failed':
        return {
          icon: 'close-circle-outline',
          title: title || 'ביטול ההזמנה נכשל',
          message: message || 'לא ניתן לבטל את ההזמנה כרגע. נסה שוב או פנה לתמיכה.',
          color: colors.error,
          illustration: '🚫'
        };
      
      case 'empty':
        return {
          icon: 'calendar-outline',
          title: title || 'אין הזמנות',
          message: message || 'עדיין לא ביצעת הזמנות. התחל לחפש חניה ויצור את ההזמנה הראשונה שלך!',
          color: colors.subtext,
          illustration: '📅'
        };
      
      default:
        return {
          icon: 'alert-circle-outline',
          title: title || 'אירעה שגיאה',
          message: message || 'אירעה שגיאה לא צפויה. נסה שוב או פנה לתמיכה.',
          color: colors.error,
          illustration: '⚠️'
        };
    }
  };

  const errorContent = getErrorContent();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[errorContent.color + '10', colors.bg]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* איור */}
          <View style={[styles.illustrationContainer, { backgroundColor: errorContent.color + '10' }]}>
            <Text style={styles.illustration}>{errorContent.illustration}</Text>
          </View>
          
          {/* אייקון */}
          <View style={[styles.iconContainer, { backgroundColor: errorContent.color + '15' }]}>
            <Ionicons 
              name={errorContent.icon} 
              size={48} 
              color={errorContent.color} 
            />
          </View>
          
          {/* כותרת */}
          <Text style={[styles.title, { color: errorContent.color }]}>
            {errorContent.title}
          </Text>
          
          {/* הודעה */}
          <Text style={[styles.message, { color: colors.subtext }]}>
            {errorContent.message}
          </Text>
          
          {/* פרטי שגיאה טכניים */}
          {error && (
            <View style={[styles.errorDetails, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.error} />
              <Text style={[styles.errorDetailsText, { color: colors.error }]}>
                {typeof error === 'string' ? error : error.message || 'שגיאה לא ידועה'}
              </Text>
            </View>
          )}
          
          {/* פעולות */}
          <View style={styles.actions}>
            {/* כפתור ראשי */}
            {onRetry && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: errorContent.color }]}
                onPress={onRetry}
              >
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>נסה שוב</Text>
              </TouchableOpacity>
            )}
            
            {/* כפתורים משניים */}
            <View style={styles.secondaryActions}>
              {onGoBack && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={onGoBack}
                >
                  <Ionicons name="arrow-back-outline" size={18} color={colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                    חזור
                  </Text>
                </TouchableOpacity>
              )}
              
              {onGoHome && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={onGoHome}
                >
                  <Ionicons name="home-outline" size={18} color={colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                    בית
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* פעולות מותאמות אישית */}
            {customActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  action.primary ? styles.primaryButton : styles.secondaryButton,
                  action.primary ? 
                    { backgroundColor: action.color || colors.primary } :
                    { borderColor: action.color || colors.border }
                ]}
                onPress={action.onPress}
              >
                {action.icon && (
                  <Ionicons 
                    name={action.icon} 
                    size={18} 
                    color={action.primary ? '#fff' : (action.color || colors.text)} 
                  />
                )}
                <Text style={[
                  action.primary ? styles.primaryButtonText : styles.secondaryButtonText,
                  !action.primary && { color: action.color || colors.text }
                ]}>
                  {action.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* הודעת עזרה */}
          {type !== 'empty' && (
            <View style={styles.helpSection}>
              <Text style={[styles.helpTitle, { color: colors.subtext }]}>
                צריך עזרה?
              </Text>
              <Text style={[styles.helpText, { color: colors.subtext }]}>
                אם הבעיה נמשכת, פנה לתמיכה דרך ההגדרות
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    illustrationContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    illustration: {
      fontSize: 48,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 12,
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
      maxWidth: 300,
    },
    errorDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 24,
      maxWidth: 300,
    },
    errorDetailsText: {
      fontSize: 12,
      marginLeft: 6,
      flex: 1,
    },
    actions: {
      width: '100%',
      maxWidth: 300,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginBottom: 12,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    secondaryActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      marginHorizontal: 4,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 6,
    },
    helpSection: {
      alignItems: 'center',
      marginTop: 32,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      width: '100%',
      maxWidth: 300,
    },
    helpTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    helpText: {
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}

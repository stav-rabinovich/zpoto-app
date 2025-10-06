import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
// import ZpButton from '../ui/ZpButton'; // זמנית - נשתמש ב-TouchableOpacity

/**
 * מסך שגיאות שרת - מחליף את fallback מקומי
 */
export default function ServerErrorScreen({ 
  error,
  onRetry, 
  onGoBack,
  title = "שגיאה בשרת",
  showDetails = false
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const getErrorMessage = () => {
    if (!error) return "אירעה שגיאה לא צפויה בשרת.";
    
    if (error.status >= 500) {
      return "השרת נתקל בבעיה זמנית. אנא נסה שוב בעוד מספר דקות.";
    }
    
    if (error.status === 404) {
      return "המידע המבוקש לא נמצא. ייתכן שהוא הוסר או שונה.";
    }
    
    if (error.status === 403) {
      return "אין לך הרשאה לגשת למידע זה.";
    }
    
    if (error.status === 401) {
      return "נדרשת התחברות מחדש למערכת.";
    }
    
    return error.message || "אירעה שגיאה לא צפויה.";
  };

  const getErrorIcon = () => {
    if (!error) return "alert-circle-outline";
    
    if (error.status >= 500) return "server-outline";
    if (error.status === 404) return "search-outline";
    if (error.status === 403) return "lock-closed-outline";
    if (error.status === 401) return "person-outline";
    
    return "warning-outline";
  };

  const getErrorColor = () => {
    if (!error) return theme.colors.error;
    
    if (error.status >= 500) return theme.colors.error;
    if (error.status === 404) return theme.colors.warning;
    if (error.status === 403) return theme.colors.error;
    if (error.status === 401) return theme.colors.primary;
    
    return theme.colors.warning;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* אייקון */}
        <View style={[styles.iconContainer, { backgroundColor: getErrorColor() + '10' }]}>
          <Ionicons 
            name={getErrorIcon()} 
            size={80} 
            color={getErrorColor()} 
          />
        </View>

        {/* כותרת */}
        <Text style={styles.title}>{title}</Text>

        {/* הודעת שגיאה */}
        <Text style={styles.message}>{getErrorMessage()}</Text>

        {/* פרטי שגיאה (אם מבוקש) */}
        {showDetails && error && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorDetailsTitle}>פרטי שגיאה:</Text>
            <Text style={styles.errorDetailsText}>
              קוד: {error.status || 'לא ידוע'}
            </Text>
            {error.data && (
              <Text style={styles.errorDetailsText}>
                {JSON.stringify(error.data, null, 2)}
              </Text>
            )}
          </View>
        )}

        {/* פעולות */}
        <View style={styles.actions}>
          {onRetry && (
            <ZpButton
              title="נסה שוב"
              onPress={onRetry}
              style={styles.retryButton}
              leftIcon={<Ionicons name="refresh-outline" size={18} color="#fff" />}
            />
          )}
          
          {onGoBack && (
            <ZpButton
              title="חזור"
              onPress={onGoBack}
              style={[styles.backButton, { backgroundColor: theme.colors.secondary }]}
              leftIcon={<Ionicons name="arrow-back-outline" size={18} color="#fff" />}
            />
          )}
        </View>

        {/* הודעת עזרה */}
        <View style={styles.helpBox}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.helpText}>
            אם הבעיה נמשכת, נסה לסגור ולפתוח את האפליקציה מחדש
          </Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    content: {
      alignItems: 'center',
      maxWidth: 320,
      width: '100%',
    },
    iconContainer: {
      marginBottom: spacing.xl,
      padding: spacing.lg,
      borderRadius: borderRadii.full,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    message: {
      fontSize: 16,
      color: colors.subtext,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacing.lg,
    },
    errorDetails: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorDetailsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    errorDetailsText: {
      fontSize: 12,
      color: colors.subtext,
      fontFamily: 'monospace',
    },
    actions: {
      width: '100%',
      marginBottom: spacing.lg,
    },
    retryButton: {
      marginBottom: spacing.sm,
    },
    backButton: {
      marginBottom: spacing.sm,
    },
    helpBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '10',
      borderRadius: borderRadii.md,
      padding: spacing.md,
      width: '100%',
    },
    helpText: {
      fontSize: 14,
      color: colors.primary,
      marginLeft: spacing.sm,
      flex: 1,
      lineHeight: 20,
    },
  });
}

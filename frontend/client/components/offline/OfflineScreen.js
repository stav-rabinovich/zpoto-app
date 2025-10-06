import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
// import ZpButton from '../ui/ZpButton'; // זמנית - נשתמש ב-TouchableOpacity

/**
 * מסך "אין חיבור לשרת" - מחליף את כל ה-fallback המקומי
 */
export default function OfflineScreen({ 
  onRetry, 
  title = "אין חיבור לשרת", 
  message = "לא ניתן להתחבר לשרת כרגע. בדוק את החיבור לאינטרנט ונסה שוב.",
  showRetry = true,
  retryText = "נסה שוב",
  customAction = null
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* אייקון */}
        <View style={styles.iconContainer}>
          <Ionicons 
            name="cloud-offline-outline" 
            size={80} 
            color={theme.colors.error} 
          />
        </View>

        {/* כותרת */}
        <Text style={styles.title}>{title}</Text>

        <Text style={styles.message}>{message}</Text>

        {/* פעולות */}
        <View style={styles.actions}>
          {showRetry && onRetry && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={onRetry}
            >
              <Text style={styles.retryButtonText}>{retryText}</Text>
              <Ionicons name="refresh-outline" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
          
          {customAction && (
            <TouchableOpacity 
              style={[styles.customAction, { backgroundColor: colors.primary }]}
              onPress={customAction.onPress}
            >
              <Text style={styles.customActionText}>
                {customAction.text}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* טיפים */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>💡 טיפים לפתרון:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="wifi-outline" size={16} color={theme.colors.subtext} />
            <Text style={styles.tipText}>בדוק את החיבור לאינטרנט</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="refresh-outline" size={16} color={theme.colors.subtext} />
            <Text style={styles.tipText}>נסה לרענן את האפליקציה</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="time-outline" size={16} color={theme.colors.subtext} />
            <Text style={styles.tipText}>המתן מספר שניות ונסה שוב</Text>
          </View>
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
      backgroundColor: colors.error + '10',
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
      marginBottom: spacing.xl,
    },
    actions: {
      width: '100%',
      marginBottom: spacing.xl,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginBottom: 12,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    customAction: {
      padding: spacing.md,
      alignItems: 'center',
    },
    customActionText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600',
    },
    tips: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: borderRadii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },
    tipItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    tipText: {
      fontSize: 14,
      color: colors.subtext,
      marginLeft: spacing.sm,
      flex: 1,
    },
  });
}

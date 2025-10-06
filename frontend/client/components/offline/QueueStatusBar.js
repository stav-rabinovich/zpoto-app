import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useOfflineMode } from '../../hooks/useOfflineMode';

/**
 * רכיב להצגת מצב התור והחיבור
 */
export default function QueueStatusBar({ onPress, style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  
  const {
    isFullyOnline,
    isOfflineMode,
    isServerDown,
    queueStatus,
    hasQueuedRequests,
    getStatusMessage,
    getStatusColor,
    getStatusIcon
  } = useOfflineMode();

  // אם הכל תקין ואין תור, לא מציגים כלום
  if (isFullyOnline && !hasQueuedRequests) {
    return null;
  }

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();
  const statusMessage = getStatusMessage();

  const getQueueMessage = () => {
    if (!hasQueuedRequests) return null;
    
    const { total, pending, processing, failed } = queueStatus;
    
    if (processing > 0) {
      return `מעבד ${processing} בקשות...`;
    }
    
    if (pending > 0) {
      return `${pending} בקשות ממתינות`;
    }
    
    if (failed > 0) {
      return `${failed} בקשות נכשלו`;
    }
    
    return `${total} בקשות בתור`;
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: statusColor + '15' }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {/* אייקון סטטוס */}
        <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
          <Ionicons 
            name={statusIcon} 
            size={16} 
            color={statusColor} 
          />
        </View>

        {/* טקסט */}
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusMessage}
          </Text>
          
          {hasQueuedRequests && (
            <Text style={styles.queueText}>
              {getQueueMessage()}
            </Text>
          )}
        </View>

        {/* אייקון פעולה */}
        {onPress && (
          <Ionicons 
            name="chevron-forward-outline" 
            size={16} 
            color={theme.colors.subtext} 
          />
        )}
      </View>

      {/* אנימציה לעיבוד */}
      {queueStatus.processing > 0 && (
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { backgroundColor: statusColor }
            ]} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  
  return StyleSheet.create({
    container: {
      borderRadius: borderRadii.md,
      marginHorizontal: spacing.md,
      marginVertical: spacing.xs,
      overflow: 'hidden',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    textContainer: {
      flex: 1,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },
    queueText: {
      fontSize: 12,
      color: colors.subtext,
    },
    progressBar: {
      height: 2,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      width: '100%',
      opacity: 0.6,
    },
  });
}

// components/OfflineIndicator.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function OfflineIndicator() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { 
    isConnected, 
    isOffline, 
    syncInProgress, 
    fallbackStats, 
    syncPendingActions,
    toggleOfflineMode 
  } = useOfflineSync();

  // אל תציג כלום אם הכל בסדר
  if (isConnected && !isOffline && !syncInProgress && (!fallbackStats || fallbackStats.pendingActionsCount === 0)) {
    return null;
  }

  const getIndicatorConfig = () => {
    if (syncInProgress) {
      return {
        icon: null,
        text: 'מסנכרן...',
        backgroundColor: theme.colors.warning + '20',
        borderColor: theme.colors.warning,
        textColor: theme.colors.warning,
        showSpinner: true
      };
    }

    if (isOffline) {
      return {
        icon: 'cloud-offline-outline',
        text: 'מצב לא מקוון',
        backgroundColor: theme.colors.error + '20',
        borderColor: theme.colors.error,
        textColor: theme.colors.error,
        showSpinner: false
      };
    }

    if (!isConnected) {
      return {
        icon: 'wifi-outline',
        text: 'אין חיבור לאינטרנט',
        backgroundColor: theme.colors.error + '20',
        borderColor: theme.colors.error,
        textColor: theme.colors.error,
        showSpinner: false
      };
    }

    if (fallbackStats && fallbackStats.pendingActionsCount > 0) {
      return {
        icon: 'sync-outline',
        text: `${fallbackStats.pendingActionsCount} פעולות ממתינות`,
        backgroundColor: theme.colors.primary + '20',
        borderColor: theme.colors.primary,
        textColor: theme.colors.primary,
        showSpinner: false,
        actionable: true
      };
    }

    return null;
  };

  const config = getIndicatorConfig();
  if (!config) return null;

  const handlePress = () => {
    if (config.actionable && isConnected) {
      syncPendingActions();
    } else if (!isConnected && isOffline) {
      toggleOfflineMode(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        }
      ]}
      onPress={handlePress}
      disabled={syncInProgress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {config.showSpinner ? (
          <ActivityIndicator size="small" color={config.textColor} />
        ) : config.icon ? (
          <Ionicons name={config.icon} size={16} color={config.textColor} />
        ) : null}
        
        <Text style={[styles.text, { color: config.textColor }]}>
          {config.text}
        </Text>

        {config.actionable && (
          <Ionicons name="chevron-forward" size={16} color={config.textColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(theme) {
  const { spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: borderRadii.sm,
      marginHorizontal: spacing.md,
      marginVertical: spacing.xs,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    text: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
  });
}

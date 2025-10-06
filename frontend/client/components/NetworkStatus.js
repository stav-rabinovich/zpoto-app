import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { debugNetworkIssues } from '../utils/network';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function NetworkStatus({ showDetails = false }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  
  const {
    hasInternet,
    serverAvailable,
    isChecking,
    isOnline,
    isOffline,
    serverDown,
    checkConnection,
    getStatusText,
    getStatusColor,
    getStatusIcon
  } = useNetworkStatus();

  const showDebugInfo = async () => {
    try {
      const debug = await debugNetworkIssues();
      
      let message = `API Base: ${debug.apiBase}\n`;
      message += `Internet: ${debug.internetCheck ? '✅' : '❌'}\n`;
      message += `Server: ${debug.serverCheck ? '✅' : '❌'}\n`;
      message += `Hostname: ${debug.hostname || 'Unknown'}\n`;
      message += `Port: ${debug.port || 'Default'}\n`;
      
      if (debug.pingTime) {
        message += `Ping: ${debug.pingTime}ms\n`;
      }
      
      if (debug.internetError) {
        message += `\nInternet Error: ${debug.internetError}`;
      }
      
      if (debug.serverError) {
        message += `\nServer Error: ${debug.serverError}`;
      }
      
      Alert.alert('Network Debug Info', message);
    } catch (error) {
      Alert.alert('Debug Error', error.message);
    }
  };

  if (hasInternet === null && !isChecking) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.statusBar, { backgroundColor: getStatusColor() + '20' }]}
        onPress={showDetails ? showDebugInfo : checkConnection}
        disabled={isChecking}
      >
        <Ionicons 
          name={getStatusIcon()} 
          size={16} 
          color={getStatusColor()} 
        />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        
        {showDetails && (
          <Ionicons 
            name="information-circle-outline" 
            size={16} 
            color={getStatusColor()} 
          />
        )}
      </TouchableOpacity>
      
      {serverDown && (
        <Text style={styles.helpText}>
          יש חיבור אינטרנט אבל השרת לא זמין. בדוק שהשרת רץ.
        </Text>
      )}
      
      {isOffline && (
        <Text style={styles.helpText}>
          אין חיבור אינטרנט. בדוק את החיבור שלך.
        </Text>
      )}
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: {
      marginVertical: spacing.sm,
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadii.sm,
      gap: spacing.xs,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    helpText: {
      fontSize: 12,
      color: colors.subtext,
      textAlign: 'center',
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
  });
}

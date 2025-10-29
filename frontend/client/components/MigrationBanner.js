// components/MigrationBanner.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function MigrationBanner() {
  // מיגרציה בוטלה - החזר null תמיד
  return null;

  const handlePress = () => {
    navigation.navigate('Migration');
  };

  const handleDismiss = () => {
    // אפשר להוסיף פונקציה לדחיית ההודעה זמנית
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>העבר נתונים לשרת</Text>
          <Text style={styles.subtitle}>
            יש לך נתונים מקומיים שניתן להעביר לשרת לשמירה מאובטחת
          </Text>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
          <Text style={styles.actionText}>העבר</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
        <Ionicons name="close" size={20} color={theme.colors.subtext} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container: {
      backgroundColor: colors.primary + '10',
      borderWidth: 1,
      borderColor: colors.primary + '30',
      borderRadius: borderRadii.md,
      margin: spacing.md,
      overflow: 'hidden',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    iconContainer: {
      marginRight: spacing.md,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 14,
      color: colors.subtext,
      lineHeight: 18,
    },
    actionButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadii.sm,
      marginLeft: spacing.md,
    },
    actionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    dismissButton: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      padding: spacing.xs,
    },
  });
}

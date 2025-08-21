import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shopify/restyle';

export default function ZpChip({ active, label, onPress, style }) {
  const { colors, borderRadii, spacing } = useTheme();

  if (active) {
    return (
      <Pressable onPress={onPress} style={[{ borderRadius: 999, marginRight: spacing.sm, marginBottom: spacing.sm }, style]}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 999,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 3,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          marginRight: spacing.sm,
          marginBottom: spacing.sm,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.accent, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

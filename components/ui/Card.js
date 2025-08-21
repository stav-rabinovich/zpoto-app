import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shopify/restyle';

export default function Card({ children, style, ...rest }) {
  const { colors, borderRadii, spacing } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadii.md,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

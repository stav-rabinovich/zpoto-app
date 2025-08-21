import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shopify/restyle';
import RText from './Text';

export default function ZpButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary', // 'primary' | 'ghost'
  style,
  textStyle,
}) {
  const { colors, borderRadii, spacing } = useTheme();

  if (variant === 'primary') {
    const start = disabled ? colors.primary + '33' : colors.gradientStart;
    const end   = disabled ? colors.secondary + '33' : colors.gradientEnd;
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={style}>
        <LinearGradient
          colors={[start, end]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: borderRadii.lg,
            paddingVertical: 14,
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.14,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 6,
          }}
        >
          <View style={{ transform: [{ scale: loading ? 0.98 : 1 }] }}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <RText variant="body" style={[{ color: '#fff', fontWeight: '600' }, textStyle]}>
                {title}
              </RText>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // ghost
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          borderRadius: borderRadii.md,
          paddingVertical: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.primary,
          backgroundColor: colors.surface,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <RText variant="body" style={[{ color: colors.primary, fontWeight: '700' }, textStyle]}>
          {title}
        </RText>
      )}
    </Pressable>
  );
}

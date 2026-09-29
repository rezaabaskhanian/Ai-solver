import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { radius, spacing, useColors, type AppColors } from '../../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  // Leading icon (the label's start side); `iconEnd` puts it after the
  // label instead, e.g. a forward arrow.
  icon?: IconName;
  iconEnd?: IconName;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  icon,
  iconEnd,
}: AppButtonProps) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const contentColor = textColor(colors)[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles(colors)[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primaryText} />
      ) : (
        <View style={[styles.content, isRTL && styles.contentRTL]}>
          {icon && <Icon name={icon} size={20} color={contentColor} />}
          <AppText weight="medium" color={contentColor} align="center" style={styles.label}>
            {label}
          </AppText>
          {iconEnd && <Icon name={iconEnd} size={20} color={contentColor} directional />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});

const variantStyles = (colors: AppColors): Record<Variant, ViewStyle> => ({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
});

const textColor = (colors: AppColors): Record<Variant, string> => ({
  primary: colors.onPrimary,
  secondary: colors.textPrimary,
  ghost: colors.primaryText,
});

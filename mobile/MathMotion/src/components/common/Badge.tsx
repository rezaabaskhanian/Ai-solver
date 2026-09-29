import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useColors, type AppColors } from '../../theme';
import { AppText } from './AppText';

type Tone = 'success' | 'danger' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const colors = useColors();
  const palette = toneColors(colors)[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <AppText size="xs" weight="medium" color={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

const toneColors = (colors: AppColors): Record<Tone, { background: string; text: string }> => ({
  success: { background: colors.successMuted, text: colors.success },
  danger: { background: colors.dangerMuted, text: colors.danger },
  primary: { background: colors.primaryMuted, text: colors.primaryText },
  neutral: { background: colors.surfaceMuted, text: colors.textSecondary },
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
});

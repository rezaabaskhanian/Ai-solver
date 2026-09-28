import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';

interface HomeActionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
  primary?: boolean;
}

// Home's two CTAs (PRD section 6: Scan Problem / Type Problem) share this
// shape, so it lives here once instead of two near-duplicate components.
export function HomeActionCard({
  icon,
  title,
  subtitle,
  onPress,
  disabled = false,
  primary = false,
}: HomeActionCardProps) {
  return (
    <Card
      onPress={disabled ? undefined : onPress}
      style={[styles.card, primary && styles.primaryCard, disabled && styles.disabled]}
    >
      <View style={[styles.iconWrap, primary && styles.primaryIconWrap]}>
        <AppText size="xl">{icon}</AppText>
      </View>
      <AppText weight="bold" size="lg" color={primary ? colors.textInverse : colors.textPrimary}>
        {title}
      </AppText>
      <AppText size="sm" color={primary ? colors.primaryMuted : colors.textSecondary}>
        {subtitle}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  primaryCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  primaryIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});

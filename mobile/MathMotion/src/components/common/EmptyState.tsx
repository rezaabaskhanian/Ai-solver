import React from 'react';
import { StyleSheet, View } from 'react-native';

import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Icon-in-a-tinted-circle empty state, in the same visual language as the
// Stitch screens (used where a list has nothing to show yet).
export function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={36} color={colors.primaryText} />
      </View>
      <AppText weight="bold" size="lg" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText size="sm" align="center" color={colors.textSecondary}>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  action: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
  },
}));

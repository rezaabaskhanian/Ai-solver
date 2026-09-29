import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { ProblemType } from '../../types/problem';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { MathExpression } from '../MathExpression/MathExpression';
import { Icon } from '../common/Icon';

interface ProblemCardProps {
  problem: string;
  // Unknown on CheckSteps (nothing solved yet) — chip and goal hide.
  type?: ProblemType;
  // Replaces the goal line, e.g. CheckSteps' instructions.
  caption?: string;
}

// Top of the Solution screen (Stitch "solution_steps_1"): problem-type
// chip, the problem itself large in a tinted box, and what we're after
// ("Goal: find x").
export function ProblemCard({ problem, type, caption }: ProblemCardProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();

  return (
    <Card style={styles.card}>
      <View style={[styles.row, isRTL && styles.rowRTL]}>
        {type ? (
          <View style={styles.chip}>
            <Icon name="auto-awesome" size={14} color={colors.primaryText} />
            <AppText size="xs" weight="bold" color={colors.primaryText}>
              {t(`problemTypes.${type}`, type)}
            </AppText>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.sigma}>
          <Icon name="functions" color={colors.primaryText} />
        </View>
      </View>
      <View style={styles.problemBox}>
        <MathExpression expression={problem} size="xl" emphasize />
        <AppText size="xs" align="center" color={colors.textSecondary}>
          {caption ?? t(`solution.goals.${type ?? 'default'}`, { defaultValue: t('solution.goals.default') })}
        </AppText>
      </View>
    </Card>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  sigma: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
  },
}));

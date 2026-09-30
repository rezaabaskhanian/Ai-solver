import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { SolutionStep } from '../../types/problem';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { MathExpression } from '../MathExpression/MathExpression';
import { arithmeticBadgeText, OperationBadge, translatedOperationLabel } from '../StepViewer/OperationBadge';
import { Icon } from '../common/Icon';

interface StepListProps {
  steps: SolutionStep[];
}

// Stitch "solution_steps_2": every step at once as a numbered timeline
// (title, resulting expression, explanation) — the "all steps" view,
// next to StepViewer's one-at-a-time player.
export function StepList({ steps }: StepListProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const row = [styles.row, isRTL && styles.rowRTL];

  return (
    <Card style={styles.card}>
      <View style={row}>
        <Icon name="format-list-numbered" color={colors.primaryText} />
        <AppText weight="bold">{t('solution.allStepsTitle')}</AppText>
      </View>
      {steps.map((step, i) => (
        <View key={step.id} style={[row, styles.step]}>
          <View style={styles.rail}>
            <View style={styles.number}>
              <AppText size="sm" weight="bold" color={colors.primaryText}>
                {i + 1}
              </AppText>
            </View>
            {i < steps.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.body}>
            <View style={row}>
              <AppText weight="bold" style={styles.flexOne}>
                {translatedOperationLabel(step.operation, t)}
              </AppText>
              {arithmeticBadgeText(step) ? <OperationBadge step={step} /> : null}
            </View>
            <View style={[styles.mathChip, i === steps.length - 1 && styles.lastChip]}>
              <MathExpression expression={step.after} size="md" emphasize={i === steps.length - 1} />
            </View>
            {step.explanation ? (
              <AppText size="sm" color={colors.textSecondary}>
                {step.explanation}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
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
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  step: {
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  number: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: spacing.xs,
    backgroundColor: colors.primaryMuted,
  },
  body: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  mathChip: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surfaceMuted,
  },
  lastChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
}));

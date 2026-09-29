import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { SolutionStep } from '../../types/problem';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { MathExpression } from '../MathExpression/MathExpression';
import { STAGE_GAP_MS } from './animationTiming';
import { FadeInStage } from './FadeInStage';
import { arithmeticBadgeText, OperationBadge, translatedOperationLabel } from './OperationBadge';
import { Icon } from '../common/Icon';

interface StepCardProps {
  step: SolutionStep;
  // 1-based number shown in the circle; omitted for a lone step card
  // (e.g. CheckSteps' next-step hint).
  index?: number;
  // Bumped by the caller on every navigation/autoplay tick so the reveal
  // below re-runs even when it lands back on a step whose before/after
  // text hasn't changed (Replay). Defaults to the step's own id so a
  // one-off render (e.g. CheckSteps' next_step_hint) still animates in
  // once on mount without the caller having to wire up a counter.
  playToken?: number;
}

// Animation Engine (PRD sections 14/15) in the Stitch "solution_steps_1"
// layout: numbered title, then "before" -> operation pill -> "after" in a
// tinted box, then a "why are we doing this?" callout with the
// explanation. Each part fades in on its own stage; the delays span the
// same STAGE_COUNT slots autoplay is timed on (animationTiming.ts).
export function StepCard({ step, index, playToken = step.id }: StepCardProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const reduceMotion = useReducedMotion();
  const row = [styles.row, isRTL && styles.rowRTL];
  const stage = (n: number) => ({ playToken, delayMs: STAGE_GAP_MS * n, reduceMotion });

  return (
    <Card style={styles.card}>
      <View style={row}>
        {index !== undefined && (
          <View style={styles.number}>
            <AppText weight="bold" color={colors.primaryText}>
              {index}
            </AppText>
          </View>
        )}
        <AppText weight="bold" size="lg" style={styles.flexOne}>
          {translatedOperationLabel(step.operation, t)}
        </AppText>
      </View>

      <View style={styles.box}>
        <FadeInStage {...stage(0)}>
          <View style={row}>
            <AppText size="sm" color={colors.textSecondary}>
              {t('solution.before')}
            </AppText>
            <View style={styles.mathChip}>
              <MathExpression expression={step.before} size="md" />
            </View>
          </View>
        </FadeInStage>

        <FadeInStage {...stage(2)} fromScale={0.85} style={styles.center}>
          {arithmeticBadgeText(step) ? (
            <OperationBadge step={step} />
          ) : (
            <AppText color={colors.textSecondary}>↓</AppText>
          )}
        </FadeInStage>

        <FadeInStage {...stage(4)}>
          <View style={row}>
            <AppText size="sm" color={colors.textSecondary}>
              {t('solution.after')}
            </AppText>
            <View style={[styles.mathChip, styles.afterChip]}>
              <MathExpression expression={step.after} size="md" emphasize />
            </View>
          </View>
        </FadeInStage>
      </View>

      {step.explanation ? (
        <FadeInStage {...stage(5)}>
          <View style={styles.why}>
            <View style={row}>
              <Icon name="lightbulb-outline" size={18} color={colors.warning} />
              <AppText size="sm" weight="bold" color={colors.warning}>
                {t('solution.why')}
              </AppText>
            </View>
            <AppText size="sm">{step.explanation}</AppText>
          </View>
        </FadeInStage>
      ) : null}
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  number: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  mathChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  afterChip: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  center: {
    alignItems: 'center',
  },
  why: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningMuted,
  },
}));

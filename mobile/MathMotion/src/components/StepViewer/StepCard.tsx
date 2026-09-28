import React from 'react';
import { StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { SolutionStep } from '../../types/problem';
import { colors, spacing } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { MathExpression } from '../MathExpression/MathExpression';
import { STAGE_GAP_MS } from './animationTiming';
import { FadeInStage } from './FadeInStage';
import { OperationBadge } from './OperationBadge';

interface StepCardProps {
  step: SolutionStep;
  // Bumped by the caller on every navigation/autoplay tick so the reveal
  // below re-runs even when it lands back on a step whose before/after
  // text hasn't changed (Replay). Defaults to the step's own id so a
  // one-off render (e.g. CheckSteps' next_step_hint) still animates in
  // once on mount without the caller having to wire up a counter.
  playToken?: number;
}

// Animation Engine (PRD sections 14/15): reveals "before -> operation ->
// after -> explanation" as four staggered stages instead of all at once,
// mirroring the section 15 diagrams (equation, arrow, operation, arrow,
// result).
export function StepCard({ step, playToken = step.id }: StepCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Card>
      <FadeInStage playToken={playToken} delayMs={STAGE_GAP_MS * 0} reduceMotion={reduceMotion}>
        <MathExpression expression={step.before} size="md" />
      </FadeInStage>

      <FadeInStage
        playToken={playToken}
        delayMs={STAGE_GAP_MS * 1}
        reduceMotion={reduceMotion}
        style={styles.arrow}
      >
        <AppText color={colors.textSecondary}>↓</AppText>
      </FadeInStage>

      <FadeInStage
        playToken={playToken}
        delayMs={STAGE_GAP_MS * 2}
        reduceMotion={reduceMotion}
        fromScale={0.85}
        style={styles.badgeRow}
      >
        <OperationBadge step={step} />
      </FadeInStage>

      <FadeInStage
        playToken={playToken}
        delayMs={STAGE_GAP_MS * 3}
        reduceMotion={reduceMotion}
        style={styles.arrow}
      >
        <AppText color={colors.textSecondary}>↓</AppText>
      </FadeInStage>

      <FadeInStage playToken={playToken} delayMs={STAGE_GAP_MS * 4} reduceMotion={reduceMotion}>
        <MathExpression expression={step.after} size="md" emphasize />
      </FadeInStage>

      <FadeInStage playToken={playToken} delayMs={STAGE_GAP_MS * 5} reduceMotion={reduceMotion}>
        <AppText color={colors.textSecondary} style={styles.explanation}>
          {step.explanation}
        </AppText>
      </FadeInStage>
    </Card>
  );
}

const styles = StyleSheet.create({
  arrow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  badgeRow: {
    paddingVertical: spacing.xs,
  },
  explanation: {
    marginTop: spacing.md,
  },
});

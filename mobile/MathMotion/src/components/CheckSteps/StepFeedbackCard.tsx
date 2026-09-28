import React from 'react';
import { StyleSheet } from 'react-native';

import type { StepStatus } from '../../types/problem';
import { colors, spacing } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { MathExpression } from '../MathExpression/MathExpression';

interface StepFeedbackCardProps {
  stepText: string;
  status: StepStatus;
}

// One row per line the student typed in StepsInput — a green/red border
// mirrors the ✓/✗ so the result reads at a glance without relying on
// color alone.
export function StepFeedbackCard({ stepText, status }: StepFeedbackCardProps) {
  const isCorrect = status === 'correct';

  return (
    <Card style={[styles.card, { borderColor: isCorrect ? colors.success : colors.danger }]}>
      <MathExpression expression={stepText} size="md" />
      <AppText size="sm" color={isCorrect ? colors.success : colors.danger}>
        {isCorrect ? '✓' : '✗'}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 2,
  },
});

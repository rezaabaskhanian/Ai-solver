import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { SolutionStep } from '../../types/problem';
import { colors, radius, spacing } from '../../theme';
import { AppText } from '../common/AppText';

// Operations that read as "apply this arithmetic to both sides" get the
// exact PRD section 15 diagram treatment (a plain "− 5" / "÷ 2" badge);
// every other operation (move_term, factor, power_rule, ...) falls back
// to its own translated label below, so no operation type animates
// through this stage without a dedicated badge of some kind. Exported
// (with the helpers below) because Quiz mode (PRD section 20) needs the
// exact same labels to build its multiple-choice options.
export const ARITHMETIC_SYMBOLS: Partial<Record<string, string>> = {
  subtract: '−',
  add: '+',
  divide: '÷',
  multiply: '×',
};

// Returns the language-agnostic "− 5" style badge text directly, or null
// when this operation needs the translated `solution.operations.*` label
// instead (the caller owns `t`, so it resolves that case itself).
export function arithmeticBadgeText(step: SolutionStep): string | null {
  const symbol = ARITHMETIC_SYMBOLS[step.operation];
  if (symbol && step.value) {
    return `${symbol} ${step.value}`;
  }
  return null;
}

export function translatedOperationLabel(operation: string, t: (key: string, opts?: object) => string): string {
  return t(`solution.operations.${operation}`, { defaultValue: operation });
}

export function operationDisplayLabel(step: SolutionStep, t: (key: string, opts?: object) => string): string {
  return arithmeticBadgeText(step) ?? translatedOperationLabel(step.operation, t);
}

interface OperationBadgeProps {
  step: SolutionStep;
}

export function OperationBadge({ step }: OperationBadgeProps) {
  const { t } = useTranslation();
  const label = operationDisplayLabel(step, t);

  return (
    <View style={styles.badge}>
      <AppText weight="medium" size="sm" color={colors.primary}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});

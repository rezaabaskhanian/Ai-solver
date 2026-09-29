import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { makeStyles, radius, spacing, useColors, type AppColors } from '../../theme';
import { AppText } from '../common/AppText';
import { MathExpression } from '../MathExpression/MathExpression';

// 'selected' is the exam's picked-but-not-yet-graded state.
type ChoiceState = 'default' | 'selected' | 'correct' | 'incorrect';

interface QuizChoiceProps {
  label: string;
  state: ChoiceState;
  disabled: boolean;
  onPress: () => void;
  // Render the label as a left-to-right math expression (e.g. "-3/4",
  // "x^2 + 5x"), which plain RTL text would reorder.
  math?: boolean;
}

// One "○ Add 5" style option from PRD section 20's quiz example. Locks
// once any choice has been made (`disabled`) — right or wrong, the
// student sees the outcome rather than being able to keep clicking around.
export function QuizChoice({ label, state, disabled, onPress, math = false }: QuizChoiceProps) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: state !== 'default' }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        stateStyles(colors)[state],
        pressed && state === 'default' && styles.pressed,
      ]}
    >
      {math ? (
        <MathExpression expression={label} size="md" />
      ) : (
        <AppText weight="medium" color={textColor(colors)[state]}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
}));

const stateStyles = (
  colors: AppColors,
): Record<ChoiceState, { backgroundColor: string; borderColor: string; borderWidth?: number }> => ({
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryText, borderWidth: 2 },
  correct: { backgroundColor: colors.successMuted, borderColor: colors.success },
  incorrect: { backgroundColor: colors.dangerMuted, borderColor: colors.danger },
});

const textColor = (colors: AppColors): Record<ChoiceState, string> => ({
  default: colors.textPrimary,
  selected: colors.primaryText,
  correct: colors.success,
  incorrect: colors.danger,
});

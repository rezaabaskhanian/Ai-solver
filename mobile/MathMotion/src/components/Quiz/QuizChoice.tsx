import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { AppText } from '../common/AppText';

type ChoiceState = 'default' | 'correct' | 'incorrect';

interface QuizChoiceProps {
  label: string;
  state: ChoiceState;
  disabled: boolean;
  onPress: () => void;
}

// One "○ Add 5" style option from PRD section 20's quiz example. Locks
// once any choice has been made (`disabled`) — right or wrong, the
// student sees the outcome rather than being able to keep clicking around.
export function QuizChoice({ label, state, disabled, onPress }: QuizChoiceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: state !== 'default' }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        stateStyles[state],
        pressed && state === 'default' && styles.pressed,
      ]}
    >
      <AppText weight="medium" color={textColor[state]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});

const stateStyles: Record<ChoiceState, { backgroundColor: string; borderColor: string }> = {
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  correct: { backgroundColor: colors.successMuted, borderColor: colors.success },
  incorrect: { backgroundColor: colors.dangerMuted, borderColor: colors.danger },
};

const textColor: Record<ChoiceState, string> = {
  default: colors.textPrimary,
  correct: colors.success,
  incorrect: colors.danger,
};

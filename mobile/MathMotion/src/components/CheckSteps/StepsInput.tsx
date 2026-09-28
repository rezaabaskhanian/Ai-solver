import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../theme';

interface StepsInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

// One line per step, same LTR-forced convention as EquationInput.tsx —
// the Math Engine only parses ASCII, and math notation stays
// left-to-right regardless of the app's language.
export function StepsInput({ value, onChangeText }: StepsInputProps) {
  const { t } = useTranslation();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={t('checkSteps.placeholder')}
      placeholderTextColor={colors.textSecondary}
      multiline
      autoCapitalize="none"
      autoCorrect={false}
      textAlignVertical="top"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 140,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
});

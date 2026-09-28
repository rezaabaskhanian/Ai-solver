import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../theme';

interface EquationInputProps {
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
}

// Equations are always typed in Latin digits/operators (the Math Engine
// only parses ASCII — backend/math-engine/app/solver/normalize.py), so
// this field stays left-to-right regardless of the app's language.
export function EquationInput({ value, onChangeText, autoFocus }: EquationInputProps) {
  const { t } = useTranslation();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={t('problemInput.placeholder')}
      placeholderTextColor={colors.textSecondary}
      autoFocus={autoFocus}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="default"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
});

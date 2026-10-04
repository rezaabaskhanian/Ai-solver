import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { KonkurLine } from '../../content/konkur';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { MathExpression } from '../MathExpression/MathExpression';

interface Props {
  lines: KonkurLine[];
  // Muted text, e.g. inside a solution box.
  secondary?: boolean;
}

// Persian prose and math lines in order. Math gets its own left-to-right
// row on a soft background, so RTL text never reorders it.
export function KonkurLines({ lines, secondary = false }: Props) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      {lines.map((line, i) =>
        typeof line === 'string' ? (
          <AppText key={i} size="sm" color={secondary ? colors.textSecondary : colors.textPrimary} style={styles.text}>
            {line}
          </AppText>
        ) : (
          <View key={i} style={styles.math}>
            <MathExpression expression={line.math} size="md" />
          </View>
        ),
      )}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  text: {
    lineHeight: 24,
  },
  math: {
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    // Math reads left-to-right even in the Persian UI.
    flexDirection: 'row',
    direction: 'ltr',
  },
}));

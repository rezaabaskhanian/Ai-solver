import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { fontSize, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { prettifyMath, tokenizeExpression, withExponents } from './tokenize';

const OPERATORS = new Set(['+', '-', '*', '/', '=', '^', '(', ')']);

interface MathExpressionProps {
  expression: string;
  size?: keyof typeof fontSize | number;
  emphasize?: boolean;
}

// Math notation stays left-to-right even inside the Farsi UI — this is
// universal mathematical convention, not something localization should
// touch (and the Math Engine only ever produces ASCII/Latin output).
export function MathExpression({ expression, size = 'lg', emphasize = false }: MathExpressionProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const pieces = withExponents(tokenizeExpression(prettifyMath(expression)));
  const baseSize = typeof size === 'number' ? size : fontSize[size];

  return (
    <View style={styles.row}>
      {pieces.map((piece, index) =>
        piece.sup ? (
          // Exponent: ~60% size, lifted off the baseline — a real x².
          <AppText
            key={`sup-${piece.text}-${index}`}
            size={Math.round(baseSize * 0.6)}
            weight={emphasize ? 'bold' : 'medium'}
            color={colors.textPrimary}
            align="left"
            style={[styles.sup, { top: -Math.round(baseSize * 0.45) }]}
          >
            {piece.text}
          </AppText>
        ) : (
          <AppText
            key={`${piece.text}-${index}`}
            size={size}
            weight={emphasize ? 'bold' : 'regular'}
            color={OPERATORS.has(piece.text) ? colors.textSecondary : colors.textPrimary}
            align="left"
            style={styles.token}
          >
            {/* "x = 2 or x = 3": the word between roots reads «یا» in Persian. */}
            {piece.text === 'or' ? ` ${t('common.or')} ` : piece.text}
          </AppText>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  token: {
    marginHorizontal: 1,
    writingDirection: 'ltr',
  },
  sup: {
    position: 'relative',
    marginLeft: 1,
    marginRight: 2,
    writingDirection: 'ltr',
  },
});

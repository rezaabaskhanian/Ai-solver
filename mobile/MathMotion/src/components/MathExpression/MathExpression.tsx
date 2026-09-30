import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { fontSize, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { prettifyMath, tokenizeExpression } from './tokenize';

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
  const tokens = tokenizeExpression(prettifyMath(expression));

  return (
    <View style={styles.row}>
      {tokens.map((token, index) => (
        <AppText
          key={`${token}-${index}`}
          size={size}
          weight={emphasize ? 'bold' : 'regular'}
          color={OPERATORS.has(token) ? colors.textSecondary : colors.textPrimary}
          align="left"
          style={styles.token}
        >
          {/* "x = 2 or x = 3": the word between roots reads «یا» in Persian. */}
          {token === 'or' ? ` ${t('common.or')} ` : token}
        </AppText>
      ))}
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
});

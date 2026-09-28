import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { MathExpression } from '../MathExpression/MathExpression';
import { VerifiedBadge } from './VerifiedBadge';

interface FinalAnswerCardProps {
  answer: string;
  verified: boolean;
}

export function FinalAnswerCard({ answer, verified }: FinalAnswerCardProps) {
  const { t } = useTranslation();

  return (
    <Card style={styles.card}>
      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        {t('solution.finalAnswer')}
      </AppText>
      <View style={styles.answerRow}>
        <MathExpression expression={answer} size="xxl" emphasize />
      </View>
      <VerifiedBadge verified={verified} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  answerRow: {
    paddingVertical: spacing.xs,
  },
});

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { ProblemType } from '../../types/problem';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { MathExpression } from '../MathExpression/MathExpression';
import { splitRoots } from '../MathExpression/tokenize';
import { VerifiedBadge } from './VerifiedBadge';
import { Icon } from '../common/Icon';

interface FinalAnswerCardProps {
  answer: string;
  verified: boolean;
  // For the "no real roots" line under an empty (∅) quadratic answer.
  type?: ProblemType;
}

// Stitch "solution_steps" final-answer card: success-tinted when the
// Math Engine verified the answer by substituting it back (PRD section
// 19), neutral otherwise.
export function FinalAnswerCard({ answer, verified, type }: FinalAnswerCardProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const row = [styles.row, isRTL && styles.rowRTL];

  return (
    <View style={[styles.card, verified && styles.cardVerified]}>
      <View style={row}>
        {verified && <Icon name="check-circle" size={26} color={colors.success} />}
        <AppText weight="bold" size="lg" style={styles.flexOne}>
          {t('solution.finalAnswer')}
        </AppText>
        <VerifiedBadge verified={verified} />
      </View>
      <View style={styles.inner}>
        <View style={[styles.answerBox, verified && styles.answerBoxVerified]}>
          {splitRoots(answer).map(line => (
            <MathExpression key={line} expression={line} size="xl" emphasize />
          ))}
        </View>
        {answer === '∅' && type === 'quadratic_equation' && (
          <AppText weight="medium" align="center">
            {t('solution.emptyAnswer')}
          </AppText>
        )}
        {verified && (
          <AppText size="xs" align="center" color={colors.textSecondary}>
            {t('solution.verifiedHint')}
          </AppText>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardVerified: {
    borderColor: colors.success,
    backgroundColor: colors.successMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  inner: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  answerBox: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  answerBoxVerified: {
    backgroundColor: colors.successMuted,
  },
}));

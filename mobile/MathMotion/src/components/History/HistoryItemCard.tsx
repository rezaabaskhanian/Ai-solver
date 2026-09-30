import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import type { HistoryItem } from '../../types/problem';
import { radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { MathExpression } from '../MathExpression/MathExpression';
import { prettifyMath, superscriptDigits } from '../MathExpression/tokenize';
import { formatRelativeDate } from './formatRelativeDate';
import { Icon } from '../common/Icon';

interface HistoryItemCardProps {
  item: HistoryItem;
  // Home's short row (Stitch home_2): check icon, problem and answer.
  compact?: boolean;
}

// PRD section 6/21: each history item shows the problem, its type, the
// final answer, and when it was solved. Tapping it reopens the Solution
// screen using the steps already stored from the original solve — no
// need to hit the Math Engine again for a problem that's already
// verified.
export function HistoryItemCard({ item, compact = false }: HistoryItemCardProps) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openSolution = () =>
    navigation.navigate('Solution', {
      problem: item.problem,
      result: {
        problem_id: item.problem_id,
        answer: item.answer,
        verified: item.verified,
        type: item.problem_type,
        steps: item.steps,
        plot: item.plot,
      },
    });

  if (compact) {
    return (
      <Card style={[styles.compact, isRTL && styles.rowRTL]} onPress={openSolution}>
        <View style={[styles.check, { backgroundColor: colors.successMuted }]}>
          <Icon name={item.verified ? 'check-circle' : 'radio-button-unchecked'} color={colors.success} />
        </View>
        <View style={styles.flexOne}>
          <MathExpression expression={item.problem} size="sm" emphasize />
          <View style={[styles.answerRow, isRTL && styles.rowRTL]}>
            <AppText size="xs" color={colors.primaryText}>
              {t('history.answerLabel')}
            </AppText>
            {/* Plain text, not MathExpression: answers can hold symbols
                (±, √) its tokenizer would drop. */}
            <AppText size="xs" weight="medium" color={colors.primaryText} style={styles.ltr}>
              {superscriptDigits(prettifyMath(item.answer)).replace(/ or /g, ` ${t('common.or')} `)}
            </AppText>
          </View>
        </View>
        <Icon name="chevron-right" color={colors.textSecondary} directional />
      </Card>
    );
  }

  return (
    <Card style={styles.card} onPress={openSolution}>
      <MathExpression expression={item.problem} size="md" />
      <View style={styles.metaRow}>
        <Badge label={t(`problemTypes.${item.problem_type}`, item.problem_type)} tone="primary" />
        <AppText size="xs" color={colors.textSecondary}>
          {formatRelativeDate(item.created_at, t)}
        </AppText>
      </View>
      <AppText weight="medium">{item.answer}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: {
    flex: 1,
    gap: 2,
  },
  ltr: {
    writingDirection: 'ltr',
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

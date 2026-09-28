import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { RootStackParamList } from '../../navigation/types';
import type { HistoryItem } from '../../types/problem';
import { colors, spacing } from '../../theme';
import { AppText } from '../common/AppText';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { MathExpression } from '../MathExpression/MathExpression';
import { formatRelativeDate } from './formatRelativeDate';

interface HistoryItemCardProps {
  item: HistoryItem;
}

// PRD section 6/21: each history item shows the problem, its type, the
// final answer, and when it was solved. Tapping it reopens the Solution
// screen using the steps already stored from the original solve — no
// need to hit the Math Engine again for a problem that's already
// verified.
export function HistoryItemCard({ item }: HistoryItemCardProps) {
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
      },
    });

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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

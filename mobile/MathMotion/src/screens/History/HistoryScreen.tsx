import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { HistoryItemCard } from '../../components/History/HistoryItemCard';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { StatusNotice } from '../../components/common/StatusNotice';
import { useHistory } from '../../hooks/useHistory';
import type { RootStackParamList } from '../../navigation/types';
import type { HistoryItem } from '../../types/problem';
import { spacing, useColors } from '../../theme';

const PAGE_SIZE = 50;

export function HistoryScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, loading, error, reload } = useHistory(PAGE_SIZE);

  if (loading) {
    return (
      <ScreenContainer>
        <StatusNotice loading />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <StatusNotice message={t('history.loadError')} onRetry={reload} retryLabel={t('common.retry')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.noPadding}>
      <FlatList<HistoryItem>
        data={items}
        keyExtractor={item => item.problem_id}
        renderItem={({ item }) => <HistoryItemCard item={item} compact />}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.primaryText} />}
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title={t('history.empty')}
            body={t('history.emptyBody')}
            actionLabel={t('history.emptyAction')}
            onAction={() => navigation.navigate('ProblemInput')}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noPadding: {
    padding: 0,
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
});

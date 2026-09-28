import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { HistoryItemCard } from '../../components/History/HistoryItemCard';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { StatusNotice } from '../../components/common/StatusNotice';
import { useHistory } from '../../hooks/useHistory';
import type { HistoryItem } from '../../types/problem';
import { colors, spacing } from '../../theme';

const PAGE_SIZE = 50;

export function HistoryScreen() {
  const { t } = useTranslation();
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
        renderItem={({ item }) => <HistoryItemCard item={item} />}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.primary} />}
        ListEmptyComponent={<StatusNotice message={t('history.empty')} />}
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
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
});

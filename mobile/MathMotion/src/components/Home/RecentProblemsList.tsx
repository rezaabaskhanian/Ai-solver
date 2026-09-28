import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useHistory } from '../../hooks/useHistory';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { AppText } from '../common/AppText';
import { StatusNotice } from '../common/StatusNotice';
import { HistoryItemCard } from '../History/HistoryItemCard';

const RECENT_LIMIT = 3;

export function RecentProblemsList() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, loading, error } = useHistory(RECENT_LIMIT);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText weight="bold" size="lg">
          {t('home.recentTitle')}
        </AppText>
        {items.length > 0 && (
          <Pressable onPress={() => navigation.navigate('History')}>
            <AppText size="sm" color={colors.primary}>
              {t('home.seeAll')}
            </AppText>
          </Pressable>
        )}
      </View>

      {loading && <StatusNotice loading />}
      {!loading && error && <StatusNotice message={t('home.recentLoadError')} />}
      {!loading && !error && items.length === 0 && (
        <StatusNotice message={t('home.recentEmpty')} />
      )}
      {!loading &&
        !error &&
        items.map(item => <HistoryItemCard key={item.problem_id} item={item} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

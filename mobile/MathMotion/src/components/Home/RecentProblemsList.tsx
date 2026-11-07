import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useHistory } from '../../hooks/useHistory';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { StatusNotice } from '../common/StatusNotice';
import { HistoryItemCard } from '../History/HistoryItemCard';

const RECENT_LIMIT = 3;

export function RecentProblemsList() {
  const colors = useColors();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, loading, error } = useHistory(RECENT_LIMIT);

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
          <View style={styles.greenDot} />
          <AppText weight="bold" size="sm" color="#111827">
            {t('home.recentTitle')}
          </AppText>
        </View>
        {items.length > 0 && (
          <Pressable hitSlop={spacing.sm} onPress={() => navigation.navigate('History')}>
            <AppText size="sm" weight="bold" color="#15803D">
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
        items.map(item => <HistoryItemCard key={item.problem_id} item={item} compact />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#76E000',
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  headerRTL: {
    flexDirection: 'row-reverse',
  },
});

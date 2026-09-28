import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FreeSolvesBadge } from '../../components/Billing/FreeSolvesBadge';
import { HomeActionCard } from '../../components/Home/HomeActionCard';
import { LanguageSwitch } from '../../components/Home/LanguageSwitch';
import { RecentProblemsList } from '../../components/Home/RecentProblemsList';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppText } from '../../components/common/AppText';
import { useRestorePurchases } from '../../hooks/useRestorePurchases';
import type { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useRestorePurchases();

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <AppText size="xl" weight="bold">
          {t('home.greeting')}
        </AppText>
        <View style={styles.headerActions}>
          <FreeSolvesBadge />
          <LanguageSwitch />
        </View>
      </View>

      <View style={styles.actions}>
        <HomeActionCard
          icon="📷"
          title={t('home.scanTitle')}
          subtitle={t('home.scanSubtitle')}
          primary
          onPress={() => navigation.navigate('Scan')}
        />
        <HomeActionCard
          icon="⌨️"
          title={t('home.typeTitle')}
          subtitle={t('home.typeSubtitle')}
          onPress={() => navigation.navigate('ProblemInput')}
        />
      </View>

      <RecentProblemsList />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
});

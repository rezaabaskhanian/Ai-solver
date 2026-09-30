import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FreeQuotaCard } from '../../components/Home/FreeQuotaCard';
import { HOME_DOCK_SPACE, HomeDock } from '../../components/Home/HomeDock';
import { HomeHeader } from '../../components/Home/HomeHeader';
import { HomeToolCards } from '../../components/Home/HomeToolCards';
import { LanguageSwitch } from '../../components/Home/LanguageSwitch';
import { PracticeChips } from '../../components/Home/PracticeChips';
import { PremiumBanner } from '../../components/Home/PremiumBanner';
import { QuickEntryBar } from '../../components/Home/QuickEntryBar';
import { RecentProblemsList } from '../../components/Home/RecentProblemsList';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppText } from '../../components/common/AppText';
import { LANGUAGE_SWITCH_ENABLED } from '../../config/language';
import { useRestorePurchases } from '../../hooks/useRestorePurchases';
import { fontSize, spacing } from '../../theme';

// Layout from the Stitch "home_2" design: header, big question, quick
// entry bar, Pro banner, free-quota card, tool shortcuts, practice chips
// and recent solves, with the floating bottom dock. Design pieces the
// app doesn't have (profile photo, AI chat, voice input) are left out.
export function HomeScreen() {
  const { t } = useTranslation();
  useRestorePurchases();

  return (
    <View style={styles.flexOne}>
      <ScreenContainer scroll contentStyle={styles.content}>
        <HomeHeader trailing={LANGUAGE_SWITCH_ENABLED ? <LanguageSwitch /> : undefined} />
        <AppText size="xl" weight="bold" style={styles.headline}>
          {t('home.headline')}
        </AppText>
        <QuickEntryBar />
        <PremiumBanner />
        <FreeQuotaCard />
        <HomeToolCards />
        <PracticeChips />
        <RecentProblemsList />
      </ScreenContainer>
      <HomeDock />
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  content: {
    gap: spacing.lg - 4,
    paddingHorizontal: spacing.md + 4,
    paddingBottom: HOME_DOCK_SPACE,
  },
  headline: {
    fontSize: fontSize.xl,
    lineHeight: 38,
    marginTop: spacing.xs,
  },
});

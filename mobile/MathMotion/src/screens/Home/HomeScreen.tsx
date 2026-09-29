import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { FreeQuotaCard } from '../../components/Home/FreeQuotaCard';
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
// and recent solves. Design pieces the app doesn't have yet (profile
// photo, AI chat, voice input, bottom tab dock) are left out.
export function HomeScreen() {
  const { t } = useTranslation();
  useRestorePurchases();

  return (
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
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg - 4,
    paddingHorizontal: spacing.md + 4,
  },
  headline: {
    fontSize: fontSize.xl,
    lineHeight: 38,
    marginTop: spacing.xs,
  },
});

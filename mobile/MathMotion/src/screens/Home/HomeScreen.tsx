import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

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
import { Icon } from '../../components/common/Icon';
import { LANGUAGE_SWITCH_ENABLED } from '../../config/language';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useRestorePurchases } from '../../hooks/useRestorePurchases';
import type { RootStackParamList } from '../../navigation/types';
import { fontSize, radius, spacing } from '../../theme';

export function HomeScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useRestorePurchases();

  return (
    <View style={styles.flexOne}>
      <ScreenContainer scroll contentStyle={styles.content}>
        <HomeHeader trailing={LANGUAGE_SWITCH_ENABLED ? <LanguageSwitch /> : undefined} />

        {/* AI Math Hero Card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroBadgeRow, isRTL && styles.rowRTL]}>
            <View style={styles.aiBadge}>
              <Icon name="auto-awesome" size={13} color="#0F1F05" />
              <AppText size="xs" weight="bold" color="#0F1F05" style={{ fontSize: 11 }}>
                هوش مصنوعی مجهول
              </AppText>
            </View>
            <AppText size="xs" color="#15803D" weight="medium">
              پاسخ تشریحی + رسم نمودار ⚡
            </AppText>
          </View>

          <AppText size="md" weight="bold" color="#111827" style={styles.heroTitle}>
            حل آنی و گام‌به‌گام هر مسئله ریاضی
          </AppText>
          <AppText size="xs" color="#4B5563" style={styles.heroDescription}>
            کافیه از معادله یا تمرین عکس بگیری؛ روش حل، فرمول‌ها و نکات تستی را قدم‌به‌قدم تحویل بگیر.
          </AppText>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Scan')}
            style={[styles.heroButton, isRTL && styles.rowRTL]}
          >
            <Icon name="photo-camera" size={20} color="#0F1F05" />
            <AppText weight="bold" size="sm" color="#0F1F05">
              اسکن و حل مسئله با دوربین
            </AppText>
          </TouchableOpacity>
        </View>

        <QuickEntryBar />
        <HomeToolCards />
        <FreeQuotaCard />
        <PremiumBanner />
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
    backgroundColor: '#F8FAF9',
  },
  content: {
    gap: spacing.md + 2,
    paddingHorizontal: spacing.md,
    paddingBottom: HOME_DOCK_SPACE + 20,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  heroCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 22,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#76E000',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  heroTitle: {
    marginTop: 2,
  },
  heroDescription: {
    lineHeight: 18,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#76E000',
    borderRadius: radius.pill,
    paddingVertical: 11,
    marginTop: 4,
    shadowColor: '#76E000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});

import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TOPICS } from '../../content/topics';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { useThemeStore } from '../../store/useThemeStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Logo } from '../common/Logo';
import { MathExpression } from '../MathExpression/MathExpression';
import { PremiumBanner } from '../Home/PremiumBanner';
import { Icon, type IconName } from '../common/Icon';

type MenuScreen = 'Home' | 'Topics' | 'Konkur' | 'KonkurNotebook' | 'ExamSetup' | 'Geometry' | 'History' | 'Guide' | 'Settings';

interface MenuItem {
  icon: IconName;
  labelKey: string;
  screen: MenuScreen;
  // Stack screens under this item — highlights it while any is focused.
  activeFor: (keyof RootStackParamList)[];
  badge?: { labelKey: string; params?: Record<string, number>; tone?: 'new' };
}

const LEARN_ITEMS: MenuItem[] = [
  { icon: 'home', labelKey: 'drawer.home', screen: 'Home', activeFor: ['Home'] },
  {
    icon: 'menu-book',
    labelKey: 'drawer.topics',
    screen: 'Topics',
    activeFor: ['Topics', 'Topic'],
    badge: { labelKey: 'drawer.topicsCount', params: { count: TOPICS.length } },
  },
  {
    icon: 'lightbulb',
    labelKey: 'drawer.konkur',
    screen: 'Konkur',
    activeFor: ['Konkur', 'KonkurTip'],
    badge: { labelKey: 'drawer.new', tone: 'new' },
  },
  {
    icon: 'auto-stories',
    labelKey: 'drawer.konkurNotebook',
    screen: 'KonkurNotebook',
    activeFor: ['KonkurNotebook'],
  },
  {
    icon: 'assignment',
    labelKey: 'drawer.exam',
    screen: 'ExamSetup',
    activeFor: ['ExamSetup', 'Exam', 'ExamResult'],
  },
  {
    icon: 'square-foot',
    labelKey: 'drawer.geometry',
    screen: 'Geometry',
    activeFor: ['Geometry'],
    badge: { labelKey: 'drawer.new', tone: 'new' },
  },
  { icon: 'history', labelKey: 'drawer.history', screen: 'History', activeFor: ['History'] },
];

// Layout from the Stitch "side_drawer" designs (1 = blue, 2 = lime — one
// component, colored by the active accent): brand card, free-quota bar,
// Pro banner, learning links, settings (night mode switch + appearance),
// a daily tip, and a footer link to the guide. The profile card shows
// the signed-in account (nickname + phone) with the plan badge.
export function DrawerMenu({ navigation, state }: DrawerContentComponentProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const setMode = useThemeStore(s => s.setMode);
  const accent = useThemeStore(s => s.accent);
  const user = useAuthStore(s => s.user);
  const { isPremium, freeSolvesUsed, freeSolvesLimit, quotaPeriod, loading } = useEntitlementStore();

  // The drawer has a single "Main" screen (the whole stack); what's
  // actually on screen is the stack's focused route.
  const stackState = state.routes[state.index]?.state;
  const current = (stackState?.routes[stackState.index ?? 0]?.name ?? 'Home') as keyof RootStackParamList;

  const go = (screen: MenuScreen) => {
    navigation.navigate('Main', { screen });
    navigation.closeDrawer();
  };

  // One topic tip per day, so the card changes but doesn't flicker.
  const tipTopic = useMemo(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    return TOPICS[day % TOPICS.length];
  }, []);

  const row = [styles.row, isRTL && styles.rowRTL];
  const remaining = Math.max(freeSolvesLimit - freeSolvesUsed, 0);
  const segments = Math.min(Math.max(freeSolvesLimit, 1), 10);
  const filled = Math.round((remaining / Math.max(freeSolvesLimit, 1)) * segments);

  const renderItem = (item: MenuItem) => {
    const active = item.activeFor.includes(current);
    return (
      <Pressable
        key={item.screen}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => go(item.screen)}
        style={({ pressed }) => [...row, styles.item, active && styles.itemActive, pressed && styles.pressed]}
      >
        <Icon name={item.icon} color={active ? colors.primaryText : colors.textSecondary} />
        <AppText
          style={styles.flexOne}
          weight={active ? 'bold' : 'medium'}
          color={active ? colors.primaryText : colors.textPrimary}
        >
          {t(item.labelKey)}
        </AppText>
        {active ? (
          <View style={styles.activeDot} />
        ) : (
          item.badge && (
            <View style={[styles.badge, item.badge.tone === 'new' && styles.badgeNew]}>
              <AppText
                size="xs"
                weight="medium"
                color={item.badge.tone === 'new' ? colors.primaryText : colors.textSecondary}
              >
                {t(item.badge.labelKey, item.badge.params)}
              </AppText>
            </View>
          )
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={row}>
          <View style={[styles.flexOne, ...row, styles.headerTitle]}>
            <View style={styles.liveDot} />
            <AppText size="sm" weight="medium" color={colors.textSecondary}>
              {t('drawer.quickMenu')}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('drawer.close')}
            onPress={() => navigation.closeDrawer()}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Icon name="close" />
          </Pressable>
        </View>

        <View style={[styles.card, ...row]}>
          <Logo size={52} />
          <View style={styles.flexOne}>
            <AppText size="lg" weight="bold" numberOfLines={1}>
              {user?.nickname?.trim() || t('common.appName')}
            </AppText>
            <AppText size="xs" color={colors.textSecondary} numberOfLines={1}>
              {user?.phone ? t('drawer.account', { phone: user.phone }) : t('drawer.tagline')}
            </AppText>
          </View>
          {!loading && (
            <View style={[styles.badge, isPremium && styles.badgeNew]}>
              <AppText size="xs" weight="medium" color={isPremium ? colors.primaryText : colors.textSecondary}>
                {isPremium ? t('drawer.planPremium') : t('drawer.planFree')}
              </AppText>
            </View>
          )}
        </View>

        {!loading && !isPremium && (
          <View style={[styles.card, styles.quota]}>
            <View style={row}>
              <Icon name="bolt" size={18} color={colors.primaryText} />
              <AppText size="sm" weight="bold" style={styles.flexOne}>
                {t(quotaPeriod === 'daily' ? 'home.quotaTitleDaily' : 'home.quotaTitle')}
              </AppText>
              <View style={[styles.badge, styles.badgeNew]}>
                <AppText size="xs" weight="medium" color={remaining === 0 ? colors.danger : colors.primaryText}>
                  {t('drawer.quotaLeft', { remaining, limit: freeSolvesLimit })}
                </AppText>
              </View>
            </View>
            <View style={row}>
              {Array.from({ length: segments }, (_, i) => (
                <View key={i} style={[styles.segment, i < filled && styles.segmentFilled]} />
              ))}
            </View>
          </View>
        )}

        <PremiumBanner compact />

        <AppText size="xs" color={colors.textSecondary} style={styles.sectionTitle}>
          {t('drawer.learnSection')}
        </AppText>
        <View style={styles.items}>{LEARN_ITEMS.map(renderItem)}</View>

        <View style={styles.divider} />

        <AppText size="xs" color={colors.textSecondary} style={styles.sectionTitle}>
          {t('drawer.settingsSection')}
        </AppText>
        <View style={styles.items}>
          <View style={[...row, styles.item]}>
            <Icon name="dark-mode" color={colors.textSecondary} />
            <AppText style={styles.flexOne} weight="medium">
              {t('drawer.nightMode')}
            </AppText>
            <Switch
              value={colors.scheme === 'dark'}
              onValueChange={on => setMode(on ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          {renderItem({
            icon: 'palette',
            labelKey: 'drawer.settings',
            screen: 'Settings',
            activeFor: ['Settings'],
            badge: { labelKey: `settings.accent.${accent}` },
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            navigation.navigate('Main', { screen: 'Topic', params: { topicId: tipTopic.id } });
            navigation.closeDrawer();
          }}
          style={({ pressed }) => [styles.tip, pressed && styles.pressed]}
        >
          <View style={row}>
            <View style={styles.tipIcon}>
              <Icon name="lightbulb-outline" color={colors.primaryText} />
            </View>
            <AppText size="sm" weight="bold" style={styles.flexOne}>
              {t('drawer.tipTitle', { topic: t(`topics.${tipTopic.id}.title`) })}
            </AppText>
          </View>
          <AppText size="xs" color={colors.textSecondary}>
            {t(`topics.${tipTopic.id}.tip`)}
          </AppText>
          <View style={styles.tipFormula}>
            <MathExpression expression={tipTopic.examples[0]} size="md" />
          </View>
        </Pressable>

        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          onPress={() => go('Guide')}
          style={({ pressed }) => [...row, styles.footerLink, pressed && styles.pressed]}
        >
          <Icon name="help-outline" size={20} color={colors.textSecondary} />
          <AppText size="sm" weight="medium" color={colors.textSecondary}>
            {t('drawer.guide')}
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  headerTitle: {
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  quota: {
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  segmentFilled: {
    backgroundColor: colors.primary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  badgeNew: {
    backgroundColor: colors.primaryMuted,
  },
  sectionTitle: {
    marginTop: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  items: {
    gap: 2,
  },
  item: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  itemActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryText,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  tip: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipFormula: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  footerLink: {
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
}));

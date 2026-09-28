import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { AppText } from '../common/AppText';

interface MenuItem {
  icon: string;
  labelKey: string;
  screen: 'Home' | 'Topics' | 'History';
  // Stack screens under this item — highlights it while any is focused.
  activeFor: (keyof RootStackParamList)[];
}

const ITEMS: MenuItem[] = [
  { icon: '🏠', labelKey: 'drawer.home', screen: 'Home', activeFor: ['Home'] },
  { icon: '📚', labelKey: 'drawer.topics', screen: 'Topics', activeFor: ['Topics', 'Topic'] },
  { icon: '🕘', labelKey: 'drawer.history', screen: 'History', activeFor: ['History'] },
];

export function DrawerMenu({ navigation, state }: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();

  // The drawer has a single "Main" screen (the whole stack); what's
  // actually on screen is the stack's focused route.
  const stackState = state.routes[state.index]?.state;
  const current = stackState?.routes[stackState.index ?? 0]?.name ?? 'Home';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AppText size="xl" weight="bold">
          {t('common.appName')}
        </AppText>
        <AppText size="sm" color={colors.textSecondary}>
          {t('drawer.tagline')}
        </AppText>
      </View>

      <View style={styles.items}>
        {ITEMS.map(item => {
          const active = item.activeFor.includes(current as keyof RootStackParamList);
          return (
            <Pressable
              key={item.screen}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                navigation.navigate('Main', { screen: item.screen });
                navigation.closeDrawer();
              }}
              style={({ pressed }) => [
                styles.item,
                isRTL && styles.itemRTL,
                active && styles.itemActive,
                pressed && styles.itemPressed,
              ]}
            >
              <AppText size="lg">{item.icon}</AppText>
              <AppText
                weight={active ? 'bold' : 'medium'}
                color={active ? colors.primary : colors.textPrimary}
              >
                {t(item.labelKey)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  items: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  itemRTL: {
    flexDirection: 'row-reverse',
  },
  itemActive: {
    backgroundColor: colors.primaryMuted,
  },
  itemPressed: {
    opacity: 0.7,
  },
});

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon, type IconName } from '../common/Icon';

type DockScreen = 'History' | 'Topics' | 'Settings';

const LINKS: Array<{ icon: IconName; labelKey: string; screen: DockScreen }> = [
  { icon: 'history', labelKey: 'drawer.history', screen: 'History' },
  { icon: 'menu-book', labelKey: 'drawer.topics', screen: 'Topics' },
  { icon: 'settings', labelKey: 'drawer.settings', screen: 'Settings' },
];

// Height the dock covers, for HomeScreen's bottom padding.
export const HOME_DOCK_SPACE = 96;

// The design's floating bottom bar: a pill with the current tab (Home)
// as a dark capsule and round shortcuts to History, Topics and Settings.
// Home is the only screen that shows it; the others keep the stack's
// back button, so it's a shortcut row rather than real tabs.
export function HomeDock() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, spacing.sm) + spacing.sm }]} pointerEvents="box-none">
      <View style={[styles.dock, isRTL && styles.rowRTL]}>
        <View style={[styles.active, isRTL && styles.rowRTL]}>
          <Icon name="home" size={20} color={colors.scheme === 'dark' ? colors.onPrimary : '#FFFFFF'} />
          <AppText size="sm" weight="bold" color={colors.scheme === 'dark' ? colors.onPrimary : '#FFFFFF'}>
            {t('drawer.home')}
          </AppText>
        </View>
        {LINKS.map(link => (
          <Pressable
            key={link.screen}
            accessibilityRole="button"
            accessibilityLabel={t(link.labelKey)}
            onPress={() => navigation.navigate(link.screen)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Icon name={link.icon} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F2A12',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  active: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 48,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    // A dark capsule, as in the design; in dark mode the accent stands out better.
    backgroundColor: colors.scheme === 'dark' ? colors.primary : '#111827',
  },
  link: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
}));

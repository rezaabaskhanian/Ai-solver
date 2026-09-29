import { DrawerActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { makeStyles, radius, spacing } from '../../theme';
import { AppText } from '../common/AppText';
import { Logo } from '../common/Logo';
import { Icon } from '../common/Icon';

// Home draws its own top bar (Stitch "home_2"): greeting on the start
// side, round menu button on the end side. The stack header is hidden
// for Home in RootNavigator.
export function HomeHeader({ trailing }: { trailing?: React.ReactNode }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation();

  return (
    <View style={[styles.row, isRTL && styles.rowRTL]}>
      <View style={[styles.greeting, isRTL && styles.rowRTL]}>
        <Logo size={40} />
        <AppText weight="bold">{t('home.hello')}</AppText>
      </View>
      <View style={[styles.actions, isRTL && styles.rowRTL]}>
        {trailing}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('drawer.open')}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
        >
          <Icon name="menu" />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
}));

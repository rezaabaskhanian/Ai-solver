import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Logo } from '../common/Logo';
import { Icon } from '../common/Icon';

// Home draws its own top bar (Stitch "home_2"): greeting with the
// user's name on the start side; the lime "AI" button (opens Scan — the
// AI reads the photo) and the round menu button on the end side. The
// stack header is hidden for Home in RootNavigator.
export function HomeHeader({ trailing }: { trailing?: React.ReactNode }) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const nickname = useAuthStore(s => s.user?.nickname?.trim());

  return (
    <View style={[styles.row, isRTL && styles.rowRTL]}>
      <View style={[styles.greeting, isRTL && styles.rowRTL]}>
        <View>
          <Logo size={44} />
          <View style={styles.onlineDot} />
        </View>
        <AppText weight="bold">
          {nickname ? t('home.helloName', { name: nickname }) : t('home.hello')}
        </AppText>
      </View>
      <View style={[styles.actions, isRTL && styles.rowRTL]}>
        {trailing}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.scanTitle')}
          onPress={() => navigation.navigate('Scan')}
          style={({ pressed }) => [styles.circle, styles.sparkle, pressed && styles.pressed]}
        >
          <Icon name="auto-awesome" color={colors.onPrimary} />
        </Pressable>
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
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.success,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
}));

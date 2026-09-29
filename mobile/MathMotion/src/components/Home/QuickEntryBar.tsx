import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon } from '../common/Icon';

// The design's pill "search" bar: a fake input that opens the real
// ProblemInput screen (so the keyboard and math keys live in one place),
// plus a round camera button for Scan.
export function QuickEntryBar() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.row, isRTL && styles.rowRTL]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.typeTitle')}
        onPress={() => navigation.navigate('ProblemInput')}
        style={({ pressed }) => [styles.pill, isRTL && styles.rowRTL, pressed && styles.pressed]}
      >
        <AppText size="sm" color={colors.textSecondary} style={styles.flexOne} numberOfLines={1}>
          {t('home.entryPlaceholder')}
        </AppText>
        <Icon name="keyboard" color={colors.textSecondary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.scanTitle')}
        onPress={() => navigation.navigate('Scan')}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
      >
        <Icon name="photo-camera" />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  pill: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flexOne: {
    flex: 1,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
}));

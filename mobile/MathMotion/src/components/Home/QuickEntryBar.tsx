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
// plus round keyboard (ProblemInput) and camera (Scan) buttons. The
// design's mic button is left out — there's no voice input.
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
        <Icon name="search" size={20} color="#15803D" />
        <AppText size="sm" color="#6B7280" style={styles.flexOne} numberOfLines={1}>
          {t('home.entryPlaceholder')}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.typeTitle')}
        onPress={() => navigation.navigate('ProblemInput')}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
      >
        <Icon name="keyboard" size={22} color="#374151" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.scanTitle')}
        onPress={() => navigation.navigate('Scan')}
        style={({ pressed }) => [styles.circle, styles.cameraButton, pressed && styles.pressed]}
      >
        <Icon name="photo-camera" size={22} color="#0F1F05" />
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  flexOne: {
    flex: 1,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cameraButton: {
    backgroundColor: '#76E000',
    borderColor: '#76E000',
    shadowColor: '#76E000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pressed: {
    opacity: 0.75,
  },
}));

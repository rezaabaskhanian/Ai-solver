import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguageStore } from '../../store/useLanguageStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';

const OPTIONS: Array<{ code: 'en' | 'fa'; labelKey: string }> = [
  { code: 'en', labelKey: 'language.english' },
  { code: 'fa', labelKey: 'language.persian' },
];

export function LanguageSwitch() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const language = useLanguageStore(state => state.language);
  const setLanguage = useLanguageStore(state => state.setLanguage);

  return (
    <View style={styles.row}>
      {OPTIONS.map(option => {
        const active = option.code === language;
        return (
          <Pressable
            key={option.code}
            onPress={() => setLanguage(option.code)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <AppText size="xs" weight="medium" color={active ? colors.onPrimary : colors.textSecondary}>
              {t(option.labelKey)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 2,
    alignSelf: 'flex-start',
  },
  pill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
}));

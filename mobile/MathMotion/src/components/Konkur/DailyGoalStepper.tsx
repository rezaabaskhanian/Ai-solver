import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { toPersianDigits } from '../../content/konkur';
import { MAX_DAILY_GOAL, MIN_DAILY_GOAL } from '../../content/konkur/daily';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon } from '../common/Icon';

// «هدف روزانه»: − 5 تست در روز + (shared by the daily screen and Settings).
export function DailyGoalStepper() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const goal = useKonkurStudyStore(s => s.daily.goal);
  const setGoal = useKonkurStudyStore(s => s.setGoal);

  return (
    <View style={[styles.row, isRTL && styles.rowRTL]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('konkur.daily.goalDecrease')}
        disabled={goal <= MIN_DAILY_GOAL}
        onPress={() => setGoal(goal - 1)}
        style={[styles.button, goal <= MIN_DAILY_GOAL && styles.disabled]}
      >
        <Icon name="remove" color={colors.primaryText} />
      </Pressable>
      <AppText weight="bold" align="center" style={styles.value}>
        {t('konkur.daily.goalValue', { n: toPersianDigits(goal) })}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('konkur.daily.goalIncrease')}
        disabled={goal >= MAX_DAILY_GOAL}
        onPress={() => setGoal(goal + 1)}
        style={[styles.button, goal >= MAX_DAILY_GOAL && styles.disabled]}
      >
        <Icon name="add" color={colors.primaryText} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  value: {
    flex: 1,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
}));

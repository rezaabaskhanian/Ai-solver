import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { toPersianDigits, type KonkurContent } from '../../content/konkur';
import { currentStreak, goalProgress } from '../../content/konkur/daily';
import { dayIndexOf } from '../../content/konkur/dayIndex';
import { dueReviews } from '../../content/konkur/review';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useToday } from '../../hooks/useToday';
import type { RootStackParamList } from '../../navigation/types';
import { useKonkurProgress } from '../../store/useKonkurProgressStore';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Card } from '../common/Card';
import { Icon } from '../common/Icon';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  // The student's track content (useTrackKonkurContent).
  content: KonkurContent;
}

// The Konkur screen's study cards: «تست روز» with the streak and the
// daily goal, «مرور امروز» (spaced review) and «برگه‌ی فرمول».
export function StudyEntryCards({ content }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<Nav>();
  const today = useToday();
  const progress = useKonkurProgress();
  const daily = useKonkurStudyStore(s => s.daily);
  const review = useKonkurStudyStore(s => s.review);
  const ensureTodayPick = useKonkurStudyStore(s => s.ensureTodayPick);
  const row = [styles.row, isRTL && styles.rowRTL];

  // Fix today's question as soon as the student sees the card, so it
  // stays the same all day even as their progress changes.
  useEffect(() => {
    ensureTodayPick(content, progress);
    // Only when the day or the content changes — not on every answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, today, ensureTodayPick]);

  const streak = currentStreak(daily, today);
  const goal = goalProgress(daily, today);
  const pickId = daily.pick?.day === today ? daily.pick.questionId : null;
  const pickProgress = pickId ? progress.questions[pickId] : undefined;
  const solvedToday = !!pickProgress && isSameDay(pickProgress.lastAt, today);
  const dueCount = useMemo(() => dueReviews(review, progress, content, today).length, [review, progress, content, today]);

  return (
    <>
      <Card onPress={() => navigation.navigate('KonkurDaily')} style={styles.card}>
        <View style={row}>
          <View style={styles.icon}>
            <Icon name="today" size={20} color={colors.primaryText} />
          </View>
          <View style={styles.flexOne}>
            <AppText weight="bold" size="sm">
              {t('konkur.daily.title')}
            </AppText>
            <AppText size="xs" color={solvedToday ? colors.success : colors.textSecondary}>
              {solvedToday ? t('konkur.daily.doneToday') : t('konkur.daily.subtitle')}
            </AppText>
          </View>
          <View style={[...row, styles.streak]}>
            <Icon name="local-fire-department" size={20} color={streak > 0 ? colors.warning : colors.textSecondary} />
            <AppText weight="bold" size="sm" color={streak > 0 ? colors.warning : colors.textSecondary}>
              {toPersianDigits(streak)}
            </AppText>
          </View>
          <Icon name="chevron-right" color={colors.textSecondary} directional />
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(goal.fraction * 100)}%` }, goal.reached && styles.barDone]} />
        </View>
        <AppText size="xs" color={goal.reached ? colors.success : colors.textSecondary}>
          {goal.reached
            ? t('konkur.daily.goalReached')
            : t('konkur.daily.goalProgress', { done: toPersianDigits(goal.done), goal: toPersianDigits(goal.goal) })}
        </AppText>
      </Card>

      <Card onPress={() => navigation.navigate('KonkurNotebook', { tab: 'review' })} style={[...row, styles.card]}>
        <View style={styles.icon}>
          <Icon name="event-repeat" size={20} color={colors.primaryText} />
        </View>
        <View style={styles.flexOne}>
          <AppText weight="bold" size="sm">
            {t('konkur.review.title')}
          </AppText>
          <AppText size="xs" color={dueCount > 0 ? colors.warning : colors.textSecondary}>
            {dueCount > 0 ? t('konkur.review.entry', { n: toPersianDigits(dueCount) }) : t('konkur.review.entryNone')}
          </AppText>
        </View>
        <Icon name="chevron-right" color={colors.textSecondary} directional />
      </Card>

      <Card onPress={() => navigation.navigate('FormulaSheet')} style={[...row, styles.card]}>
        <View style={styles.icon}>
          <Icon name="functions" size={20} color={colors.primaryText} />
        </View>
        <View style={styles.flexOne}>
          <AppText weight="bold" size="sm">
            {t('konkur.formulas.title')}
          </AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {t('konkur.formulas.entry')}
          </AppText>
        </View>
        <Icon name="chevron-right" color={colors.textSecondary} directional />
      </Card>
    </>
  );
}

function isSameDay(timestamp: number, today: number): boolean {
  return dayIndexOf(timestamp) === today;
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streak: {
    gap: spacing.xs,
  },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  barDone: {
    backgroundColor: colors.success,
  },
}));

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { DailyGoalStepper } from '../../components/Konkur/DailyGoalStepper';
import { KonkurQuestionCard } from '../../components/Konkur/KonkurQuestionCard';
import { toPersianDigits } from '../../content/konkur';
import { currentStreak, goalProgress, longestStreak } from '../../content/konkur/daily';
import { dueReviews } from '../../content/konkur/review';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useToday } from '../../hooks/useToday';
import type { RootStackParamList } from '../../navigation/types';
import { useTrackKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurProgress } from '../../store/useKonkurProgressStore';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

// «تست روز»: today's real exam question (the same all day, chosen from
// the student's track and leaning on their weak topics), with the streak
// and the daily goal. Answering goes through the normal question card,
// so it is recorded in progress, the streak and the review schedule.
export function KonkurDailyScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const content = useTrackKonkurContent();
  const progress = useKonkurProgress();
  const today = useToday();
  const daily = useKonkurStudyStore(s => s.daily);
  const review = useKonkurStudyStore(s => s.review);
  const ensureTodayPick = useKonkurStudyStore(s => s.ensureTodayPick);

  useEffect(() => {
    ensureTodayPick(content, progress);
    // Only when the day or the content changes — not on every answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, today, ensureTodayPick]);

  const question = useMemo(() => {
    const id = daily.pick?.day === today ? daily.pick.questionId : null;
    return id ? content.questions.find(q => q.id === id) : undefined;
  }, [daily.pick, today, content]);
  const streak = currentStreak(daily, today);
  const best = longestStreak(daily, today);
  const goal = goalProgress(daily, today);
  const dueCount = useMemo(() => dueReviews(review, progress, content, today).length, [review, progress, content, today]);
  const row = [styles.row, isRTL && styles.rowRTL];

  return (
    <ScreenContainer scroll>
      <Card style={styles.card}>
        <View style={row}>
          <Icon name="local-fire-department" size={36} color={streak > 0 ? colors.warning : colors.textSecondary} />
          <View style={styles.flexOne}>
            <AppText weight="bold" size="lg">
              {streak > 0 ? t('konkur.daily.streak', { n: toPersianDigits(streak) }) : t('konkur.daily.streakNone')}
            </AppText>
            <AppText size="xs" color={colors.textSecondary}>
              {t('konkur.daily.longest', { n: toPersianDigits(best) })}
            </AppText>
          </View>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(goal.fraction * 100)}%` }, goal.reached && styles.barDone]} />
        </View>
        <AppText size="sm" weight="medium" color={goal.reached ? colors.success : colors.textPrimary}>
          {goal.reached
            ? t('konkur.daily.goalReached')
            : t('konkur.daily.goalProgress', { done: toPersianDigits(goal.done), goal: toPersianDigits(goal.goal) })}
        </AppText>
        <View style={styles.goalBox}>
          <AppText weight="bold" size="sm">
            {t('konkur.daily.goalTitle')}
          </AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {t('konkur.daily.goalHint')}
          </AppText>
          <DailyGoalStepper />
        </View>
      </Card>

      {dueCount > 0 && (
        <AppButton
          label={t('konkur.daily.reviewDue', { n: toPersianDigits(dueCount) })}
          variant="secondary"
          icon="event-repeat"
          onPress={() => navigation.navigate('KonkurNotebook', { tab: 'review' })}
        />
      )}

      <AppText weight="bold" size="lg">
        {t('konkur.daily.title')}
      </AppText>
      {question ? (
        <KonkurQuestionCard key={question.id} question={question} index={0} />
      ) : (
        <AppText color={colors.textSecondary}>{t('konkur.daily.empty')}</AppText>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
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
  barTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  barDone: {
    backgroundColor: colors.success,
  },
  goalBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
}));

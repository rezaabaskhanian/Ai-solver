import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { CURRICULUM } from '../../content/curriculum';
import { sourceLabel, toPersianDigits, type KonkurQuestion, type KonkurTip } from '../../content/konkur';
import {
  bookmarkedQuestionsOf,
  bookmarkedTipsOf,
  groupByMainTip,
  mistakesOf,
  WEAK_BELOW_PERCENT,
  WEAK_MIN_ATTEMPTS,
  statsForQuestions,
  statsForTip,
  weakTips,
  type TopicStats,
} from '../../content/konkur/progress';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { dueReviews, REVIEW_INTERVAL_DAYS } from '../../content/konkur/review';
import { useToday } from '../../hooks/useToday';
import { useKonkurContent, useTrackKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurProgress } from '../../store/useKonkurProgressStore';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'KonkurNotebook'>;
type Tab = 'mistakes' | 'review' | 'bookmarks' | 'stats';
const TABS: Tab[] = ['mistakes', 'review', 'bookmarks', 'stats'];

// «دفتر غلط‌ها»: questions whose latest answer was wrong (grouped by tip,
// they leave once answered correctly), the bookmarked tips and questions,
// and «آمار من» with the weak topics. All from local progress.
export function KonkurNotebookScreen({ route }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const content = useKonkurContent();
  const progress = useKonkurProgress();
  const trackContent = useTrackKonkurContent();
  const today = useToday();
  const reviewState = useKonkurStudyStore(s => s.review);
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'mistakes');
  const row = [styles.row, isRTL && styles.rowRTL];

  const chapterTitles = useMemo(() => {
    const map = new Map<string, string>();
    CURRICULUM.forEach(g => g.books.forEach(b => b.chapters.forEach(c => map.set(c.id, c.title))));
    return map;
  }, []);

  // «مرور امروز»: mistakes whose spaced-review day has come.
  const due = useMemo(
    () => dueReviews(reviewState, progress, trackContent, today),
    [reviewState, progress, trackContent, today],
  );
  const mistakes = useMemo(() => mistakesOf(progress, content), [progress, content]);
  const mistakeGroups = useMemo(() => groupByMainTip(mistakes, content), [mistakes, content]);
  const markedTips = useMemo(() => bookmarkedTipsOf(progress, content), [progress, content]);
  const markedQuestions = useMemo(() => bookmarkedQuestionsOf(progress, content), [progress, content]);
  const markedGroups = useMemo(() => groupByMainTip(markedQuestions, content), [markedQuestions, content]);
  const weak = useMemo(() => weakTips(progress, content), [progress, content]);
  const practiced = useMemo(
    () =>
      content.tips
        .map(tip => ({ tip, stats: statsForTip(progress, tip.id, content) }))
        .filter(entry => entry.stats.attempts > 0 && !entry.stats.weak),
    [progress, content],
  );
  const overall = useMemo(() => statsForQuestions(progress, content.questions), [progress, content]);

  const openTip = (tipId: string, questionId?: string) => navigation.navigate('KonkurTip', { tipId, questionId });

  const tabLabel = (key: Tab) => {
    const count =
      key === 'mistakes'
        ? mistakes.length
        : key === 'review'
          ? due.length
          : key === 'bookmarks'
            ? markedTips.length + markedQuestions.length
            : 0;
    const base = t(`konkur.progress.tab.${key}`);
    return count > 0 ? `${base} (${toPersianDigits(count)})` : base;
  };

  const renderQuestionRow = (question: KonkurQuestion, tipId: string, note?: string) => (
    <Card key={question.id} onPress={() => openTip(tipId, question.id)} style={[...row, styles.itemCard]}>
      <View style={styles.flexOne}>
        <AppText size="sm" weight="medium" numberOfLines={2}>
          {question.text}
        </AppText>
        <View style={[...row, styles.meta]}>
          <Badge label={sourceLabel(question.source)} tone={question.source.kind === 'konkur' ? 'primary' : 'neutral'} />
          {note ? (
            <AppText size="xs" color={colors.textSecondary}>
              {note}
            </AppText>
          ) : null}
        </View>
      </View>
      <Icon name="chevron-right" color={colors.textSecondary} directional />
    </Card>
  );

  const renderGroupHeader = (tip: KonkurTip) => (
    <View>
      <AppText weight="bold">{tip.title}</AppText>
      <AppText size="xs" color={colors.textSecondary}>
        {tip.chapterId ? (chapterTitles.get(tip.chapterId) ?? t('konkur.general')) : t('konkur.general')}
      </AppText>
    </View>
  );

  const renderTipRow = (tip: KonkurTip, stats?: TopicStats) => (
    <Card key={tip.id} onPress={() => openTip(tip.id)} style={[...row, styles.itemCard]}>
      <View style={styles.tipIcon}>
        <Icon name="lightbulb" size={20} color={colors.primaryText} />
      </View>
      <View style={styles.flexOne}>
        <AppText size="sm" weight="bold">
          {tip.title}
        </AppText>
        {stats && stats.attempts > 0 && (
          <AppText size="xs" color={stats.weak ? colors.danger : colors.textSecondary}>
            {t('konkur.progress.tipStats', {
              answered: toPersianDigits(stats.answeredQuestions),
              total: toPersianDigits(stats.totalQuestions),
              percent: toPersianDigits(stats.percent ?? 0),
            })}
          </AppText>
        )}
      </View>
      <Icon name="chevron-right" color={colors.textSecondary} directional />
    </Card>
  );

  const empty = (key: string) => (
    <View style={styles.empty}>
      <Icon name="auto-stories" size={40} color={colors.textSecondary} />
      <AppText color={colors.textSecondary} align="center">
        {t(key)}
      </AppText>
    </View>
  );

  return (
    <ScreenContainer scroll>
      {/* Not mirrored in RTL (a reversed horizontal ScrollView opens at the wrong end). */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map(key => {
          const active = key === tab;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText size="sm" weight="medium" color={active ? colors.onPrimary : colors.textPrimary}>
                {tabLabel(key)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'mistakes' && (
        <>
          <AppText size="sm" color={colors.textSecondary}>
            {t('konkur.progress.mistakesIntro')}
          </AppText>
          {mistakeGroups.length === 0
            ? empty('konkur.progress.noMistakes')
            : mistakeGroups.map(({ tip, questions }) => (
                <View key={tip.id} style={styles.section}>
                  {renderGroupHeader(tip)}
                  {questions.map(q =>
                    renderQuestionRow(
                      q,
                      tip.id,
                      t('konkur.progress.attempts', { n: toPersianDigits(progress.questions[q.id]?.attempts ?? 1) }),
                    ),
                  )}
                </View>
              ))}
        </>
      )}

      {tab === 'review' && (
        <>
          <AppText size="sm" color={colors.textSecondary}>
            {t('konkur.review.intro')}
          </AppText>
          {due.length === 0
            ? empty('konkur.review.none')
            : due.map(({ question, level, overdueDays }) =>
                renderQuestionRow(
                  question,
                  question.tipIds[0],
                  [
                    t('konkur.review.level', {
                      n: toPersianDigits(level + 1),
                      total: toPersianDigits(REVIEW_INTERVAL_DAYS.length),
                    }),
                    overdueDays > 0
                      ? t('konkur.review.overdue', { n: toPersianDigits(overdueDays) })
                      : t('konkur.review.dueToday'),
                  ].join(' · '),
                ),
              )}
        </>
      )}

      {tab === 'bookmarks' && (
        <>
          {markedTips.length === 0 && markedQuestions.length === 0 && empty('konkur.progress.noBookmarks')}
          {markedTips.length > 0 && (
            <View style={styles.section}>
              <AppText weight="bold" size="lg">
                {t('konkur.progress.markedTips')}
              </AppText>
              {markedTips.map(tip => renderTipRow(tip))}
            </View>
          )}
          {markedGroups.map(({ tip, questions }) => (
            <View key={tip.id} style={styles.section}>
              {renderGroupHeader(tip)}
              {questions.map(q => renderQuestionRow(q, tip.id))}
            </View>
          ))}
        </>
      )}

      {tab === 'stats' && (
        <>
          {overall.attempts === 0 ? (
            empty('konkur.progress.noStats')
          ) : (
            <>
              <Card style={styles.summary}>
                <AppText weight="bold" size="lg">
                  {t('konkur.progress.overall', {
                    answered: toPersianDigits(overall.answeredQuestions),
                    total: toPersianDigits(overall.totalQuestions),
                  })}
                </AppText>
                <AppText color={colors.textSecondary}>
                  {t('konkur.progress.overallCorrect', {
                    percent: toPersianDigits(overall.percent ?? 0),
                    attempts: toPersianDigits(overall.attempts),
                  })}
                </AppText>
              </Card>

              <View style={styles.section}>
                <View style={[...row, styles.meta]}>
                  <Icon name="warning-amber" size={20} color={colors.danger} />
                  <AppText weight="bold" size="lg">
                    {t('konkur.progress.weakTopics')}
                  </AppText>
                </View>
                {weak.length === 0 ? (
                  <AppText size="sm" color={colors.textSecondary}>
                    {t('konkur.progress.noWeak')}
                  </AppText>
                ) : (
                  weak.map(({ tip, stats }) => renderTipRow(tip, stats))
                )}
              </View>

              {practiced.length > 0 && (
                <View style={styles.section}>
                  <AppText weight="bold" size="lg">
                    {t('konkur.progress.practiced')}
                  </AppText>
                  {practiced.map(({ tip, stats }) => renderTipRow(tip, stats))}
                </View>
              )}
              <AppText size="xs" color={colors.textSecondary}>
                {t('konkur.progress.weakNote', {
                  attempts: toPersianDigits(WEAK_MIN_ATTEMPTS),
                  percent: toPersianDigits(WEAK_BELOW_PERCENT),
                })}
              </AppText>
            </>
          )}
        </>
      )}
    </ScreenContainer>
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
  flexOne: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  itemCard: {
    padding: spacing.md,
  },
  meta: {
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  summary: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    gap: spacing.sm,
  },
  tab: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
}));

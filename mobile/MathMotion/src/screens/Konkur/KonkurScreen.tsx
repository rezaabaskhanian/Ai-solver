import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { AppBottomNav } from '../../components/common/AppBottomNav';
import { Card } from '../../components/common/Card';
import { Icon, type IconName } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { CURRICULUM_GRADES, findCurriculumGrade, type CurriculumGrade } from '../../content/curriculum';
import {
  generalKonkurTips,
  sourceLabel,
  questionsForTip,
  tipsForChapter,
  toPersianDigits,
  type KonkurTip,
} from '../../content/konkur';
import { MIN_SEARCH_LENGTH, normalizeSearchText, searchKonkur } from '../../content/konkur/search';
import { currentStreak, goalProgress } from '../../content/konkur/daily';
import { dayIndexOf } from '../../content/konkur/dayIndex';
import { dueReviews } from '../../content/konkur/review';
import { mistakesOf, statsForChapter, statsForTip } from '../../content/konkur/progress';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useToday } from '../../hooks/useToday';
import type { RootStackParamList } from '../../navigation/types';
import { usePreferencesStore, useTrack } from '../../store/usePreferencesStore';
import { refreshKonkurContent, useTrackKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurProgress } from '../../store/useKonkurProgressStore';
import { useKonkurStudyStore } from '../../store/useKonkurStudyStore';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';

function isSameDay(timestamp: number, today: number): boolean {
  return dayIndexOf(timestamp) === today;
}

export function KonkurScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const content = useTrackKonkurContent();
  const track = useTrack();
  const today = useToday();
  const progress = useKonkurProgress();
  const daily = useKonkurStudyStore(s => s.daily);
  const review = useKonkurStudyStore(s => s.review);
  const ensureTodayPick = useKonkurStudyStore(s => s.ensureTodayPick);

  useEffect(() => {
    refreshKonkurContent();
  }, []);

  useEffect(() => {
    ensureTodayPick(content, progress);
  }, [content, today, ensureTodayPick]);

  const savedGrade = usePreferencesStore(s => s.grade);
  const setGrade = usePreferencesStore(s => s.setGrade);
  const grade: CurriculumGrade = savedGrade ?? 10;
  const curriculum = findCurriculumGrade(grade);
  const row = [styles.row, isRTL && styles.rowRTL];

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showAllGeneral, setShowAllGeneral] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const searching = query.trim().length > 0;
  const tooShort = normalizeSearchText(debounced).length < MIN_SEARCH_LENGTH;
  const results = useMemo(() => searchKonkur(content, debounced), [content, debounced]);
  const questionHits = useMemo(
    () => results.questions.filter(q => content.tips.some(tip => tip.id === q.tipIds[0])),
    [results, content],
  );

  const mistakeCount = useMemo(() => mistakesOf(progress, content).length, [progress, content]);
  const streak = currentStreak(daily, today);
  const goal = goalProgress(daily, today);
  const dueCount = useMemo(() => dueReviews(review, progress, content, today).length, [review, progress, content, today]);

  const generalTips = useMemo(() => generalKonkurTips(content), [content]);
  const visibleGeneralTips = showAllGeneral ? generalTips : generalTips.slice(0, 3);

  const getTipSubjectTag = (tipId: string) => {
    if (tipId === 'gen_plug_choices') return { tag: 'ریاضیات', bg: '#EDE9FE', color: '#6D28D9' };
    if (tipId === 'gen_approx_elim') return { tag: 'شیمی و فیزیک', bg: '#EDE9FE', color: '#6D28D9' };
    if (tipId === 'gen_roots_sign') return { tag: 'حسابان', bg: '#EDE9FE', color: '#6D28D9' };
    if (tipId === 'gen_pick_number') return { tag: 'جبر و هندسه', bg: '#E0F2FE', color: '#0369A1' };
    return { tag: 'عمومی', bg: '#F1F5F9', color: '#475569' };
  };

  const getTipIconData = (
    tipId: string,
    index: number,
  ): { name: IconName; bg: string; color: string; round: boolean } => {
    if (tipId === 'gen_plug_choices') return { name: 'lightbulb', bg: '#DCFCE7', color: '#16A34A', round: true };
    if (tipId === 'gen_approx_elim') return { name: 'calculate', bg: '#DCFCE7', color: '#16A34A', round: false };
    if (tipId === 'gen_roots_sign') return { name: 'show-chart', bg: '#EDE9FE', color: '#6366F1', round: true };
    const icons: IconName[] = ['lightbulb', 'calculate', 'functions', 'timeline', 'help-outline'];
    return { name: icons[index % icons.length], bg: '#DCFCE7', color: '#16A34A', round: true };
  };

  const renderTip = (tip: KonkurTip, index: number) => {
    const count = questionsForTip(tip.id, content).length;
    const stats = statsForTip(progress, tip.id, content);
    const tagInfo = getTipSubjectTag(tip.id);
    const iconData = getTipIconData(tip.id, index);

    return (
      <Card
        key={tip.id}
        onPress={() => navigation.navigate('KonkurTip', { tipId: tip.id })}
        style={[...row, styles.tipCard]}
      >
        <View
          style={[
            styles.tipIconBox,
            { backgroundColor: iconData.bg, borderRadius: iconData.round ? radius.pill : radius.md },
          ]}
        >
          <Icon name={iconData.name} size={20} color={iconData.color} />
        </View>

        <View style={styles.flexOne}>
          <AppText weight="bold" size="sm" color={colors.textPrimary}>
            {tip.title}
          </AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {count > 0 ? `${toPersianDigits(count)} تست تحلیلی` : t('konkur.tipOnly')}
          </AppText>
          {stats.percent !== null && (
            <AppText size="xs" color={stats.weak ? colors.danger : colors.textSecondary}>
              {t('konkur.progress.tipStats', {
                answered: toPersianDigits(stats.answeredQuestions),
                total: toPersianDigits(stats.totalQuestions),
                percent: toPersianDigits(stats.percent),
              })}
              {stats.weak ? ` · ${t('konkur.progress.weak')}` : ''}
            </AppText>
          )}
        </View>

        <View style={[styles.subjectTag, { backgroundColor: tagInfo.bg }]}>
          <AppText size="xs" weight="medium" color={tagInfo.color}>
            {tagInfo.tag}
          </AppText>
        </View>

        <Icon name="chevron-left" size={20} color={colors.textSecondary} />
      </Card>
    );
  };

  const chapterStats = (chapterId: string) => {
    const stats = statsForChapter(progress, chapterId, content);
    if (stats.percent === null) {
      return '';
    }
    return ` · ${t('konkur.progress.tipStats', {
      answered: toPersianDigits(stats.answeredQuestions),
      total: toPersianDigits(stats.totalQuestions),
      percent: toPersianDigits(stats.percent),
    })}`;
  };

  const chapters = (curriculum?.books ?? []).flatMap(book =>
    book.chapters
      .map(chapter => ({ book: book.title, chapter, tips: tipsForChapter(chapter.id, content) }))
      .filter(entry => entry.tips.length > 0),
  );

  return (
    <View style={styles.screenWrapper}>
      <ScreenContainer scroll contentStyle={{ paddingBottom: 85 }}>
      {/* Top Header matching design */}
      <View style={[styles.topHeader, isRTL && styles.rowRTL]}>
        <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
          <View style={styles.avatarButton}>
            <Icon name="person" size={20} color="#FFFFFF" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="نکات"
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Guide')}
          >
            <Icon name="lightbulb" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <AppText weight="bold" size="md" color={colors.textPrimary}>
          Topic Detail
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="بازگشت"
          onPress={() => navigation.goBack()}
          style={styles.headerIconButton}
        >
          <Icon name="arrow-forward" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Search Input Bar */}
      <View style={[styles.searchBox, isRTL && styles.rowRTL]}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="جست‌وجو در نکته‌ها و تست‌ها..."
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="جست‌وجو در نکته‌ها و تست‌ها"
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.searchInput, isRTL && styles.searchInputRTL]}
        />
        {searching && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('konkur.search.clear')}
            hitSlop={8}
            onPress={() => setQuery('')}
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {searching ? (
        tooShort ? (
          <AppText color={colors.textSecondary}>{t('konkur.search.hint')}</AppText>
        ) : results.tips.length === 0 && questionHits.length === 0 ? (
          <AppText color={colors.textSecondary}>{t('konkur.search.empty')}</AppText>
        ) : (
          <>
            {results.tips.length > 0 && (
              <View style={styles.section}>
                <AppText weight="bold">{t('konkur.search.tips', { count: results.tips.length })}</AppText>
                {results.tips.map((tip, idx) => renderTip(tip, idx))}
              </View>
            )}
            {questionHits.length > 0 && (
              <View style={styles.section}>
                <AppText weight="bold">{t('konkur.search.questions', { count: questionHits.length })}</AppText>
                {questionHits.map(q => (
                  <Card
                    key={q.id}
                    onPress={() => navigation.navigate('KonkurTip', { tipId: q.tipIds[0], questionId: q.id })}
                    style={[...row, styles.tipCard]}
                  >
                    <View style={styles.tipIconBox}>
                      <Icon name="quiz" size={20} color="#16A34A" />
                    </View>
                    <View style={styles.flexOne}>
                      <AppText size="xs" color={colors.primaryText} weight="medium">
                        {sourceLabel(q.source)}
                      </AppText>
                      <AppText size="sm" numberOfLines={2}>
                        {q.text}
                      </AppText>
                    </View>
                    <Icon name="chevron-left" color={colors.textSecondary} />
                  </Card>
                ))}
              </View>
            )}
          </>
        )
      ) : (
        <>
          {/* Intro Description */}
          <AppText size="xs" color={colors.textSecondary} style={styles.introText}>
            نکته‌ها و میان‌برهای تستی هر فصل، با تست‌هایی که با همان نکته حل می‌شوند. روی هر نکته بزن تا توضیح، مثال و تست‌هایش را ببینی.
          </AppText>

          {/* 4 Main Entry Cards */}
          <View style={styles.entryCardsContainer}>
            {/* Card 1: تست روز */}
            <Card onPress={() => navigation.navigate('KonkurDaily')} style={styles.entryCard}>
              <View style={[styles.entryCardHeader, isRTL && styles.rowRTL]}>
                <View style={[styles.entryCardIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Icon name="today" size={22} color="#16A34A" />
                </View>

                <View style={styles.flexOne}>
                  <AppText weight="bold" size="sm" color={colors.textPrimary}>
                    تست روز
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    یک تست واقعی کنکور، مخصوص امروز
                  </AppText>
                </View>

                <View style={[styles.streakPill, isRTL && styles.rowRTL]}>
                  <AppText weight="bold" size="xs" color={streak > 0 ? '#EA580C' : colors.textSecondary}>
                    {toPersianDigits(streak)}
                  </AppText>
                  <Icon name="local-fire-department" size={16} color={streak > 0 ? '#EA580C' : colors.textSecondary} />
                </View>
                <Icon name="chevron-left" size={18} color={colors.textSecondary} />
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(5, Math.min(100, Math.round(goal.fraction * 100)))}%` },
                  ]}
                />
              </View>

              <View style={[styles.entryCardFooter, isRTL && styles.rowRTL]}>
                <AppText size="xs" color={colors.textSecondary}>
                  {toPersianDigits(goal.done)} از {toPersianDigits(goal.goal)} تست امروز
                </AppText>
                <AppText size="xs" weight="medium" color={colors.textSecondary}>
                  آماده شروع
                </AppText>
              </View>
            </Card>

            {/* Card 2: مرور امروز */}
            <Card onPress={() => navigation.navigate('KonkurNotebook', { tab: 'review' })} style={styles.entryCard}>
              <View style={[styles.entryCardHeader, isRTL && styles.rowRTL]}>
                <View style={[styles.entryCardIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Icon name="event-repeat" size={22} color="#16A34A" />
                </View>

                <View style={styles.flexOne}>
                  <AppText weight="bold" size="sm" color={colors.textPrimary}>
                    مرور امروز
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    {dueCount > 0
                      ? `${toPersianDigits(dueCount)} تست برای مرور داری`
                      : 'امروز مروری نداری؛ غلط‌هایت سر وقت برمی‌گردند'}
                  </AppText>
                </View>

                <Icon name="chevron-left" size={18} color={colors.textSecondary} />
              </View>
            </Card>

            {/* Card 3: برگه‌ی فرمول */}
            <Card onPress={() => navigation.navigate('FormulaSheet')} style={styles.entryCard}>
              <View style={[styles.entryCardHeader, isRTL && styles.rowRTL]}>
                <View style={[styles.entryCardIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Icon name="functions" size={22} color="#16A34A" />
                </View>

                <View style={styles.flexOne}>
                  <AppText weight="bold" size="sm" color={colors.textPrimary}>
                    برگه‌ی فرمول
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    فرمول‌های مهم هر فصل برای مرور سریع
                  </AppText>
                </View>

                <Icon name="chevron-left" size={18} color={colors.textSecondary} />
              </View>
            </Card>

            {/* Card 4: دفتر غلط‌ها و آمار من */}
            <Card onPress={() => navigation.navigate('KonkurNotebook')} style={styles.entryCard}>
              <View style={[styles.entryCardHeader, isRTL && styles.rowRTL]}>
                <View style={[styles.entryCardIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Icon name="auto-stories" size={22} color="#4F46E5" />
                </View>

                <View style={styles.flexOne}>
                  <AppText weight="bold" size="sm" color={colors.textPrimary}>
                    دفتر غلط‌ها و آمار من
                  </AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    {mistakeCount > 0
                      ? `${toPersianDigits(mistakeCount)} تست غلط یا نشان‌شده`
                      : 'غلط‌ها، نشان‌شده‌ها و آمار پیشرفت'}
                  </AppText>
                </View>

                <Icon name="chevron-left" size={18} color={colors.textSecondary} />
              </View>
            </Card>
          </View>

          {/* Section: نکات عمومی تست‌زنی */}
          <View style={styles.generalSection}>
            <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
              <AppText weight="bold" size="md" color={colors.textPrimary}>
                نکات عمومی تست‌زنی
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAllGeneral(prev => !prev)}
                hitSlop={8}
              >
                <AppText size="xs" weight="medium" color="#4F46E5">
                  {showAllGeneral ? 'کمتر' : `مشاهده همه (${toPersianDigits(generalTips.length)})`}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.generalTipsList}>
              {visibleGeneralTips.map((tip, idx) => renderTip(tip, idx))}
            </View>
          </View>

          {/* Speed Challenge Banner */}
          <View style={[styles.speedChallengeCard, isRTL && styles.rowRTL]}>
            <View style={styles.lightningIconBox}>
              <Icon name="flash-on" size={22} color="#0F1F05" />
            </View>

            <View style={styles.flexOne}>
              <AppText weight="bold" size="sm" color={colors.textPrimary}>
                چالش آزمون سرعتی
              </AppText>
              <AppText size="xs" color={colors.textSecondary}>
                آمادگی برای ۲ دقیقه حل سرعتی؟
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="شروع آزمون"
              onPress={() => navigation.navigate('ExamSetup')}
              style={styles.speedChallengeButton}
            >
              <AppText size="xs" weight="bold" color="#0F1F05">
                شروع آزمون
              </AppText>
            </Pressable>
          </View>

          {/* Grade Selector Tabs for textbook chapters */}
          <View style={styles.chapterSectionHeader}>
            <AppText weight="bold" size="md" color={colors.textPrimary}>
              نکات کتاب درسی و فصول
            </AppText>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {CURRICULUM_GRADES.map(g => {
              const active = g === grade;
              return (
                <Pressable
                  key={g}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setGrade(g)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <AppText size="xs" weight="medium" color={active ? '#0F1F05' : colors.textPrimary}>
                    {t('topics.gradeChip', { grade: g })}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {chapters.length === 0 ? (
            <AppText color={colors.textSecondary} style={styles.emptyText}>
              {t(track === 'tajrobi' ? 'track.comingSoon' : 'konkur.noTips')}
            </AppText>
          ) : (
            chapters.map(({ book, chapter, tips }) => (
              <View key={chapter.id} style={styles.section}>
                <View>
                  <AppText weight="bold" size="sm">{chapter.title}</AppText>
                  <AppText size="xs" color={colors.textSecondary}>
                    {book}
                    {chapterStats(chapter.id)}
                  </AppText>
                </View>
                {tips.map((tip, idx) => renderTip(tip, idx))}
              </View>
            ))
          )}

          <View style={[...row, styles.note]}>
            <Icon name="info-outline" size={16} color={colors.textSecondary} />
            <AppText size="xs" color={colors.textSecondary} style={styles.flexOne}>
              {t('konkur.sourceNote')}
            </AppText>
          </View>
        </>
      )}
      </ScreenContainer>
      <AppBottomNav activeTab="Konkur" />
    </View>
  );
}

const useStyles = makeStyles(colors =>
  StyleSheet.create({
    screenWrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    flexOne: {
      flex: 1,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatarButton: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconButton: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      height: 48,
      marginVertical: spacing.sm,
    },
    searchInput: {
      flex: 1,
      height: 48,
      padding: 0,
      fontFamily: fontFamily.fa.regular,
      fontSize: fontSize.sm,
      color: colors.textPrimary,
    },
    searchInputRTL: {
      textAlign: 'right',
    },
    introText: {
      lineHeight: 20,
      marginVertical: spacing.xs,
    },
    entryCardsContainer: {
      gap: spacing.sm,
      marginVertical: spacing.sm,
    },
    entryCard: {
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      backgroundColor: '#FFFFFF',
      gap: spacing.xs,
    },
    entryCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    entryCardIconBox: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: '#FEF3C7',
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    progressBarTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: '#F1F5F9',
      overflow: 'hidden',
      marginTop: spacing.xs,
    },
    progressBarFill: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: '#76E000',
    },
    entryCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    generalSection: {
      marginVertical: spacing.sm,
      gap: spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: spacing.xs,
    },
    generalTipsList: {
      gap: spacing.sm,
    },
    tipCard: {
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      backgroundColor: '#FFFFFF',
    },
    tipIconBox: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subjectTag: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    speedChallengeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: '#F7FEE7',
      borderWidth: 1,
      borderColor: '#D9F99D',
      borderRadius: radius.xl,
      padding: spacing.md,
      marginVertical: spacing.md,
    },
    lightningIconBox: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: '#76E000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    speedChallengeButton: {
      backgroundColor: '#76E000',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
    },
    chapterSectionHeader: {
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    tabs: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
    },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: {
      backgroundColor: '#76E000',
      borderColor: '#76E000',
    },
    section: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    note: {
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      marginTop: spacing.md,
    },
    emptyText: {
      paddingVertical: spacing.md,
      textAlign: 'center',
    },
  }),
);

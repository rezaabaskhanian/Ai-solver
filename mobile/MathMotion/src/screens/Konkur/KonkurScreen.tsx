import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
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
import { mistakesOf, statsForChapter, statsForTip } from '../../content/konkur/progress';
import { StudyEntryCards } from '../../components/Konkur/StudyEntryCards';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { usePreferencesStore, useTrack } from '../../store/usePreferencesStore';
import { refreshKonkurContent, useTrackKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurProgress } from '../../store/useKonkurProgressStore';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';

// «نکات کنکوری و تست‌زنی»: general test-taking tips, then one grade's
// tips grouped by textbook chapter (content/konkur). Shares the
// remembered grade with Topics and Exam setup.
export function KonkurScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Only what the student's study track sees (tips, questions, search).
  const content = useTrackKonkurContent();
  const track = useTrack();
  useEffect(() => {
    refreshKonkurContent();
  }, []);
  const savedGrade = usePreferencesStore(s => s.grade);
  const setGrade = usePreferencesStore(s => s.setGrade);
  const grade: CurriculumGrade = savedGrade ?? 10;
  const curriculum = findCurriculumGrade(grade);
  const row = [styles.row, isRTL && styles.rowRTL];
  const progress = useKonkurProgress();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const searching = query.trim().length > 0;
  const tooShort = normalizeSearchText(debounced).length < MIN_SEARCH_LENGTH;
  const results = useMemo(() => searchKonkur(content, debounced), [content, debounced]);
  // A question opens on its first tip (the main one), filtered to itself.
  const questionHits = useMemo(
    () => results.questions.filter(q => content.tips.some(tip => tip.id === q.tipIds[0])),
    [results, content],
  );
  const mistakeCount = useMemo(() => mistakesOf(progress, content).length, [progress, content]);

  const renderTip = (tip: KonkurTip) => {
    const count = questionsForTip(tip.id, content).length;
    const stats = statsForTip(progress, tip.id, content);
    return (
      <Card
        key={tip.id}
        onPress={() => navigation.navigate('KonkurTip', { tipId: tip.id })}
        style={[...row, styles.tipCard]}
      >
        <View style={styles.tipIcon}>
          <Icon name="lightbulb" size={20} color={colors.primaryText} />
        </View>
        <View style={styles.flexOne}>
          <AppText weight="bold" size="sm">
            {tip.title}
          </AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {count > 0 ? t('konkur.testsCount', { count }) : t('konkur.tipOnly')}
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
        {stats.weak && <Icon name="warning-amber" size={20} color={colors.danger} />}
        <Icon name="chevron-right" color={colors.textSecondary} directional />
      </Card>
    );
  };

  // « · ۴ از ۱۰ تست · ۶۰٪ درست» — empty until the student answers.
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
    <ScreenContainer scroll>
      <View style={[...row, styles.searchBox]}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('konkur.search.placeholder')}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={t('konkur.search.placeholder')}
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
                {results.tips.map(renderTip)}
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
                    <View style={styles.tipIcon}>
                      <Icon name="quiz" size={20} color={colors.primaryText} />
                    </View>
                    <View style={styles.flexOne}>
                      <AppText size="xs" color={colors.primaryText} weight="medium">
                        {sourceLabel(q.source)}
                      </AppText>
                      <AppText size="sm" numberOfLines={2}>
                        {q.text}
                      </AppText>
                    </View>
                    <Icon name="chevron-right" color={colors.textSecondary} directional />
                  </Card>
                ))}
              </View>
            )}
          </>
        )
      ) : (
        <>
      <AppText color={colors.textSecondary}>{t('konkur.intro')}</AppText>

      <StudyEntryCards content={content} />

      <Card onPress={() => navigation.navigate('KonkurNotebook')} style={[...row, styles.tipCard]}>
        <View style={styles.tipIcon}>
          <Icon name="auto-stories" size={20} color={colors.primaryText} />
        </View>
        <View style={styles.flexOne}>
          <AppText weight="bold" size="sm">
            {t('konkur.progress.title')}
          </AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {mistakeCount > 0
              ? t('konkur.progress.entryMistakes', { n: toPersianDigits(mistakeCount) })
              : t('konkur.progress.entryEmpty')}
          </AppText>
        </View>
        <Icon name="chevron-right" color={colors.textSecondary} directional />
      </Card>

      <View style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('konkur.general')}
        </AppText>
        {generalKonkurTips(content).map(renderTip)}
      </View>

      {/* Not mirrored in RTL: a reversed horizontal ScrollView would open
          scrolled to the wrong end (same as Topics). */}
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
              <AppText size="sm" weight="medium" color={active ? colors.onPrimary : colors.textPrimary}>
                {t('topics.gradeChip', { grade: g })}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {chapters.length === 0 ? (
        <AppText color={colors.textSecondary}>
          {t(track === 'tajrobi' ? 'track.comingSoon' : 'konkur.noTips')}
        </AppText>
      ) : (
        chapters.map(({ book, chapter, tips }) => (
          <View key={chapter.id} style={styles.section}>
            <View>
              <AppText weight="bold">{chapter.title}</AppText>
              <AppText size="xs" color={colors.textSecondary}>
                {book}
                {chapterStats(chapter.id)}
              </AppText>
            </View>
            {tips.map(renderTip)}
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
  },
  section: {
    gap: spacing.sm,
  },
  searchBox: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    padding: 0,
    fontFamily: fontFamily.fa.regular,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  searchInputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tipCard: {
    padding: spacing.md,
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
  note: {
    gap: spacing.xs,
  },
}));

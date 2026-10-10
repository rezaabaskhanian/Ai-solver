import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { sourceLabel } from '../../content/konkur';
import { chapterVisibleForTrack } from '../../content/curriculum';
import { EXAM_SYLLABUS, findGrade, type GradeId } from '../../content/examSyllabus';
import { visibleForTrack } from '../../content/track';
import { useIsRTL } from '../../hooks/useIsRTL';
import { konkurExamConfig, konkurPapers } from '../../services/exam/konkurExam';
import { localizeDigits } from '../../services/exam/scoring';
import { useKonkurContent } from '../../store/useKonkurContentStore';
import { usePreferencesStore, useTrack } from '../../store/usePreferencesStore';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { Icon } from '../../components/common/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'ExamSetup'>;

const QUESTION_COUNTS = [5, 10, 15, 20];
// Seconds allowed per question; the exam's time limit is count x this.
const SECONDS_PER_QUESTION = [45, 60, 90, 120];

// «آمادگی برای امتحان»: the student picks a grade and exactly the chapters
// their exam covers ("only these for grade 6"), then how many questions.
export function ExamSetupScreen({ navigation, route }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();

  // Opened from a textbook chapter (Topics) → that grade + chapter
  // preselected; otherwise the student's saved grade when the exam
  // covers it, else grade 6.
  const savedGrade = usePreferencesStore(s => s.grade);
  const [grade, setGrade] = useState<GradeId>(() => {
    const wanted = route.params?.grade ?? savedGrade;
    return EXAM_SYLLABUS.some(g => g.grade === wanted) ? (wanted as GradeId) : 6;
  });
  const [chapterIds, setChapterIds] = useState<string[]>(() => route.params?.chapterIds ?? []);
  const [count, setCount] = useState(10);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(60);
  const konkurContent = useKonkurContent();
  const track = useTrack();
  const papers = useMemo(() => konkurPapers(konkurContent, track), [konkurContent, track]);
  const num = (value: number | string) => localizeDigits(value, isRTL);

  // Chapters of the student's track; the number inside the book stays as
  // authored (chapter.number), the running index only applies to grades
  // without explicit numbers.
  const chapters = (findGrade(grade)?.chapters ?? []).filter(
    ch => visibleForTrack(ch, track) && chapterVisibleForTrack(ch.id, track),
  );
  const available = chapters.filter(ch => ch.skills.length > 0).map(ch => ch.id);
  const allSelected = available.length > 0 && available.every(id => chapterIds.includes(id));
  const rowStyle = [styles.row, isRTL && styles.rowRTL];

  const changeGrade = (next: GradeId) => {
    setGrade(next);
    setChapterIds([]);
  };

  const toggleChapter = (id: string) => {
    setChapterIds(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]));
  };

  return (
    <ScreenContainer scroll>
      <AppText color={colors.textSecondary}>{t('exam.intro')}</AppText>

      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('exam.gradeTitle')}
        </AppText>
        <View style={rowStyle}>
          {EXAM_SYLLABUS.map(g => (
            <Chip
              key={g.grade}
              label={t('exam.grade', { grade: g.grade })}
              active={g.grade === grade}
              onPress={() => changeGrade(g.grade)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <View style={[rowStyle, styles.spaceBetween]}>
          <AppText weight="bold" size="lg">
            {t('exam.chaptersTitle')}
          </AppText>
          <Pressable
            accessibilityRole="button"
            hitSlop={spacing.sm}
            onPress={() => setChapterIds(allSelected ? [] : available)}
          >
            <AppText size="sm" color={colors.primaryText}>
              {allSelected ? t('exam.selectNone') : t('exam.selectAll')}
            </AppText>
          </Pressable>
        </View>
        <AppText size="sm" color={colors.textSecondary}>
          {t('exam.chaptersHint')}
        </AppText>

        {chapters.length === 0 && (
          <AppText color={colors.textSecondary}>{t('track.comingSoon')}</AppText>
        )}
        {chapters.map((chapter, index) => {
          const enabled = chapter.skills.length > 0;
          const checked = chapterIds.includes(chapter.id);
          return (
            <Pressable
              key={chapter.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: !enabled }}
              disabled={!enabled}
              onPress={() => toggleChapter(chapter.id)}
              style={[rowStyle, styles.chapter, checked && styles.chapterChecked, !enabled && styles.disabled]}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && (
                  <Icon name="check" size={18} color={colors.onPrimary} />
                )}
              </View>
              <AppText style={styles.flexOne} weight={checked ? 'medium' : 'regular'}>
                {t('exam.chapterNumber', { n: chapter.number ?? index + 1 })} {t(`exam.chapters.${chapter.id}`)}
              </AppText>
              {!enabled && (
                <AppText size="xs" color={colors.textSecondary}>
                  {t('exam.comingSoon')}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </Card>

      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('exam.countTitle')}
        </AppText>
        <View style={rowStyle}>
          {QUESTION_COUNTS.map(n => (
            <Chip
              key={n}
              label={t('exam.countOption', { count: n })}
              active={n === count}
              onPress={() => setCount(n)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('exam.durationTitle')}
        </AppText>
        <View style={rowStyle}>
          {SECONDS_PER_QUESTION.map(sec => (
            <Chip
              key={sec}
              label={t('exam.durationOption', { sec: num(sec) })}
              active={sec === secondsPerQuestion}
              onPress={() => setSecondsPerQuestion(sec)}
            />
          ))}
        </View>
        <AppText size="sm" color={colors.textSecondary}>
          {t('exam.durationTotal', { minutes: num(Math.ceil((count * secondsPerQuestion) / 60)) })}
        </AppText>
        <AppText size="sm" color={colors.textSecondary}>
          {t('exam.scoring')}
        </AppText>
      </Card>

      <AppButton
        label={chapterIds.length ? t('exam.start') : t('exam.pickChapters')}
        icon="play-arrow"
        disabled={chapterIds.length === 0}
        onPress={() =>
          navigation.navigate('Exam', {
            config: { grade, chapterIds, count, durationSec: count * secondsPerQuestion },
          })
        }
      />

      {papers.length === 0 && track === 'tajrobi' && (
        <Card style={styles.section}>
          <AppText weight="bold" size="lg">
            {t('exam.konkurTitle')}
          </AppText>
          <AppText size="sm" color={colors.textSecondary}>
            {t('track.comingSoon')}
          </AppText>
        </Card>
      )}

      {papers.length > 0 && (
        <Card style={styles.section}>
          <AppText weight="bold" size="lg">
            {t('exam.konkurTitle')}
          </AppText>
          <AppText size="sm" color={colors.textSecondary}>
            {t('exam.konkurHint')}
          </AppText>
          {papers.map(paper => {
            const config = konkurExamConfig(paper);
            const label = sourceLabel({ kind: 'konkur', track, ...paper.selector });
            const minutes = Math.ceil((config.durationSec ?? 0) / 60);
            return (
              <AppButton
                key={`${paper.selector.year}-${paper.selector.abroad ? 'a' : ''}${paper.selector.newSystem ? 'n' : ''}${paper.selector.round ?? 0}`}
                label={`${label} — ${t('exam.konkurPaper', { count: num(paper.questionCount), minutes: num(minutes) })}`}
                variant="secondary"
                size="sm"
                onPress={() => navigation.navigate('Exam', { config })}
              />
            );
          })}
        </Card>
      )}
    </ScreenContainer>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <AppText size="sm" weight="medium" color={active ? colors.onPrimary : colors.textPrimary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  flexOne: {
    flex: 1,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chapter: {
    flexWrap: 'nowrap',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterChecked: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
}));

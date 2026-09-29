import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CurriculumChapter, CurriculumGrade } from '../../content/curriculum';
import { findGrade, type GradeId } from '../../content/examSyllabus';
import { findTopic } from '../../content/topics';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { AppText } from '../common/AppText';
import { Icon } from '../common/Icon';

interface Props {
  grade: CurriculumGrade;
  number: number;
  chapter: CurriculumChapter;
}

// One textbook chapter: number + title, tap to expand its lessons, then
// what the app offers for it — practice topics the engine can solve, and
// an exam when content/examSyllabus.ts has questions for this chapter.
export function CurriculumChapterCard({ grade, number, chapter }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [open, setOpen] = useState(false);
  const row = [styles.row, isRTL && styles.rowRTL];

  const topics = (chapter.topics ?? []).map(findTopic).filter(topic => topic !== undefined);
  const hasExam = Boolean(
    findGrade(grade as GradeId)?.chapters.find(c => c.id === chapter.id && c.skills.length > 0),
  );
  const supported = topics.length > 0 || hasExam;

  return (
    <View style={[styles.card, open && styles.cardOpen]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(o => !o)}
        style={row}
      >
        <View style={[styles.number, supported && styles.numberSupported]}>
          <AppText weight="bold" color={supported ? colors.primaryText : colors.textSecondary}>
            {number}
          </AppText>
        </View>
        <View style={styles.flexOne}>
          <AppText weight="bold">{chapter.title}</AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {chapter.lessons.length > 0
              ? t('topics.lessonsCount', { count: chapter.lessons.length })
              : t('topics.noLessons')}
            {supported ? ` · ${t('topics.inApp')}` : ''}
          </AppText>
        </View>
        <Icon name={open ? 'expand-less' : 'expand-more'} color={colors.textSecondary} />
      </Pressable>

      {open && (
        <View style={styles.body}>
          {chapter.lessons.map((lesson, i) => (
            <View key={lesson} style={row}>
              <AppText size="xs" color={colors.textSecondary} style={styles.lessonNo}>
                {t('topics.lessonNo', { n: i + 1 })}
              </AppText>
              <AppText size="sm" style={styles.flexOne}>
                {lesson}
              </AppText>
            </View>
          ))}

          {supported ? (
            <View style={[styles.actions, isRTL && styles.rowRTL]}>
              {topics.map(topic => (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('Topic', { topicId: topic.id })}
                  style={({ pressed }) => [styles.chip, isRTL && styles.rowRTL, pressed && styles.pressed]}
                >
                  <Icon name={topic.icon} size={16} color={colors.primaryText} />
                  <AppText size="xs" weight="medium" color={colors.primaryText}>
                    {t(`topics.${topic.id}.title`)}
                  </AppText>
                </Pressable>
              ))}
              {hasExam && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('ExamSetup', { grade, chapterIds: [chapter.id] })}
                  style={({ pressed }) => [styles.chip, styles.examChip, isRTL && styles.rowRTL, pressed && styles.pressed]}
                >
                  <Icon name="assignment" size={16} color={colors.onPrimary} />
                  <AppText size="xs" weight="medium" color={colors.onPrimary}>
                    {t('topics.examThisChapter')}
                  </AppText>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={[styles.note, isRTL && styles.rowRTL]}>
              <Icon name="info-outline" size={16} color={colors.textSecondary} />
              <AppText size="xs" color={colors.textSecondary} style={styles.flexOne}>
                {t('topics.referenceOnly')}
              </AppText>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardOpen: {
    borderColor: colors.primary,
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
  number: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberSupported: {
    backgroundColor: colors.primaryMuted,
  },
  body: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lessonNo: {
    minWidth: 44,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  examChip: {
    backgroundColor: colors.primary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
}));

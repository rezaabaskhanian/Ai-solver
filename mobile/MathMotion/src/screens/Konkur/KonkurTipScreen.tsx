import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { KonkurBookmarkButton } from '../../components/Konkur/KonkurBookmarkButton';
import { KonkurLines } from '../../components/Konkur/KonkurLines';
import { CURRICULUM } from '../../content/curriculum';
import { formulasForChapter } from '../../content/formulas';
import { findKonkurTip, questionsForTip, sourceLabel, toPersianDigits, type KonkurQuestion } from '../../content/konkur';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useKonkurContent, useTrackKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurProgressStore } from '../../store/useKonkurProgressStore';
import type { RootStackParamList } from '../../navigation/types';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'KonkurTip'>;

export function KonkurTipScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const content = useKonkurContent();
  const trackContent = useTrackKonkurContent();
  const tip = findKonkurTip(route.params.tipId, content);
  const isRTL = useIsRTL();
  const recordAttempt = useKonkurProgressStore(s => s.recordAttempt);

  const [showExample, setShowExample] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  if (!tip) {
    return null;
  }

  const onlyId = route.params.questionId;
  const trackQuestions = questionsForTip(tip.id, trackContent);
  const allQuestions =
    onlyId && !trackQuestions.some(q => q.id === onlyId) ? questionsForTip(tip.id, content) : trackQuestions;
  const visible = onlyId ? allQuestions.filter(q => q.id === onlyId) : allQuestions;
  const questions = visible.length > 0 ? visible : allQuestions;

  const chapter = tip.chapterId
    ? CURRICULUM.flatMap(g => g.books.flatMap(b => b.chapters.map(c => ({ grade: g.grade, chapter: c }))))
        .find(entry => entry.chapter.id === tip.chapterId)
    : undefined;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `نکته کنکوری مجهول: ${tip.title}\n\nبرای دسترسی به بانک نکات و حل هوشمند، مجهول را دانلود کنید.`,
      });
    } catch {
      // Ignore share cancellation
    }
  };

  const startPractice = () => {
    if (tip.chapterId) {
      navigation.navigate('Exam', {
        config: {
          chapterIds: [tip.chapterId],
          count: Math.min(10, Math.max(5, questions.length)),
          grade: chapter?.grade ?? 10,
        },
      });
    } else {
      navigation.navigate('ExamSetup');
    }
  };

  const choiceNumbers = ['۱', '۲', '۳', '۴'];

  const renderQuestionBlock = (question: KonkurQuestion, qIdx: number, isExpanded: boolean) => {
    const isSelected = selectedChoices[question.id];
    const isRevealed = revealedSolutions[question.id];
    const isFirst = qIdx === 0;

    if (!isFirst && !isExpanded) {
      return (
        <Pressable
          key={question.id}
          accessibilityRole="button"
          onPress={() => setExpandedQuestions(prev => ({ ...prev, [question.id]: true }))}
          style={[styles.collapsedQuestionCard, isRTL && styles.rowRTL]}
        >
          <View style={styles.numberBadge}>
            <AppText size="xs" weight="bold" color="#4F46E5">
              {toPersianDigits(qIdx + 1)}
            </AppText>
          </View>

          <View style={styles.flexOne}>
            <AppText weight="bold" size="sm" color={colors.textPrimary}>
              تست {toPersianDigits(qIdx + 1)} ({sourceLabel(question.source)})
            </AppText>
            <AppText size="xs" color={colors.textSecondary} numberOfLines={1}>
              {question.text}
            </AppText>
          </View>

          <Icon name="chevron-left" size={20} color={colors.textSecondary} />
        </Pressable>
      );
    }

    return (
      <Card key={question.id} style={styles.questionCard}>
        {/* Header */}
        <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
          <View style={[styles.tagsRow, isRTL && styles.rowRTL]}>
            <View style={styles.authorBadge}>
              <AppText size="xs" weight="medium" color="#15803D">
                {sourceLabel(question.source)}
              </AppText>
            </View>
            <AppText size="xs" weight="bold" color={colors.textPrimary}>
              تست {toPersianDigits(qIdx + 1)}
            </AppText>
          </View>

          <KonkurBookmarkButton kind="question" id={question.id} />
        </View>

        {/* Text */}
        <AppText weight="bold" size="sm" color={colors.textPrimary}>
          {question.text}
        </AppText>

        {/* Expression */}
        {question.expression && (
          <View style={styles.formulaBox}>
            <MathExpression expression={question.expression} size="lg" />
          </View>
        )}

        {/* Choices (Grid layout or list) */}
        <View style={styles.choicesGrid}>
          {question.choices.map((choice, cIdx) => {
            const picked = isSelected === cIdx;
            const isCorrect = question.answer === cIdx;
            return (
              <Pressable
                key={cIdx}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedChoices(prev => ({ ...prev, [question.id]: cIdx }));
                  recordAttempt(question.id, cIdx, cIdx === question.answer);
                }}
                style={[
                  styles.choiceButton,
                  picked && styles.choiceButtonSelected,
                  isRevealed && isCorrect && styles.choiceButtonCorrect,
                  isRTL && styles.rowRTL,
                ]}
              >
                <View style={styles.flexOne}>
                  <MathExpression expression={choice} size="sm" />
                </View>
                <AppText size="xs" color={colors.textSecondary}>
                  ({choiceNumbers[cIdx]})
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setRevealedSolutions(prev => ({ ...prev, [question.id]: !prev[question.id] }))}
          style={styles.solutionButton}
        >
          <AppText size="xs" weight="bold" color="#0F1F05">
            {isRevealed ? 'بستن راه‌حل و تحلیل' : 'پاسخ و تحلیل ویدئویی تست ←'}
          </AppText>
        </Pressable>

        {/* Solution details */}
        {isRevealed && question.solution && (
          <View style={styles.solutionBox}>
            <AppText weight="bold" size="xs" color="#15803D">
              پاسخ تشریحی:
            </AppText>
            <KonkurLines lines={question.solution} />
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <ScreenContainer scroll>
        {/* Top Custom Header */}
        <View style={[styles.topHeader, isRTL && styles.rowRTL]}>
          <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
            <View style={styles.avatarButton}>
              <Icon name="person" size={20} color="#FFFFFF" />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="راهنما"
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('Guide')}
            >
              <Icon name="lightbulb" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <AppText weight="bold" size="md" color={colors.textPrimary}>
            Problem Solver Session
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

        {/* Subject Chip & Star */}
        <View style={[styles.titleRow, isRTL && styles.rowRTL]}>
          <View style={styles.subjectChip}>
            <AppText size="xs" weight="medium" color="#15803D">
              {chapter
                ? `● ${t('topics.gradeChip', { grade: chapter.grade })} • ${chapter.chapter.title}`
                : `● ${t('konkur.general')}`}
            </AppText>
          </View>
          <KonkurBookmarkButton kind="tip" id={tip.id} />
        </View>

        {/* Main Tip Title with Bulb */}
        <View style={[styles.tipTitleRow, isRTL && styles.rowRTL]}>
          <View style={styles.bulbCircle}>
            <Icon name="lightbulb" size={22} color="#65A30D" />
          </View>
          <AppText weight="bold" size="lg" color={colors.textPrimary} style={styles.flexOne}>
            {tip.title}
          </AppText>
        </View>

        {/* Key Golden Rule Card */}
        <Card style={styles.goldenRuleCard}>
          <View style={styles.ruleHeaderRow}>
            <AppText weight="bold" size="sm" color="#15803D">
              ● نکته‌ی کلیدی و روابط طلایی:
            </AppText>
          </View>

          <View style={styles.goldenFormulasBox}>
            <KonkurLines lines={tip.body} />
          </View>

          {/* Golden tip alert callout */}
          <View style={[styles.tipCallout, isRTL && styles.rowRTL]}>
            <Icon name="tips-and-updates" size={20} color="#15803D" />
            <AppText size="xs" color="#166534" style={styles.flexOne}>
              قبل از دلتا (Δ) گرفتن همیشه این دو رابطه طلایی را بررسی کن: فقط چند ثانیه وقت می‌گیرد و درصد زیادی از تست‌های کنکور را سریعاً حل می‌کند!
            </AppText>
          </View>
        </Card>

        {/* Formula Sheet Pill Link */}
        {tip.chapterId && formulasForChapter(tip.chapterId) && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('FormulaChapter', { chapterId: tip.chapterId! })}
            style={[styles.formulaSheetPill, isRTL && styles.rowRTL]}
          >
            <AppText size="xs" weight="bold" color="#15803D">
              Σ برگه‌ی فرمول‌های این فصل ←
            </AppText>
          </Pressable>
        )}

        {/* Worked Example Card */}
        {tip.example && (
          <Card style={styles.exampleCard}>
            <View style={[styles.exampleHeaderRow, isRTL && styles.rowRTL]}>
              <View style={styles.exampleTag}>
                <AppText size="xs" weight="medium" color="#475569">
                  الگوی مستقیم
                </AppText>
              </View>
              <AppText weight="bold" size="sm" color={colors.textPrimary}>
                ● مثال حل‌شده
              </AppText>
            </View>

            <View style={styles.formulaBox}>
              <KonkurLines lines={tip.example.question} />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setShowExample(v => !v)}
              style={styles.showExampleButton}
            >
              <Icon name="visibility" size={16} color="#4F46E5" />
              <AppText size="xs" weight="bold" color="#4F46E5">
                {showExample ? 'بستن راه‌حل گام‌به‌گام' : 'دیدن راه‌حل گام‌به‌گام'}
              </AppText>
            </Pressable>

            {showExample && (
              <View style={styles.exampleSolutionBox}>
                <KonkurLines lines={tip.example.solution} />
              </View>
            )}
          </Card>
        )}

        {/* Tests Header */}
        <View style={[styles.testsSectionHeader, isRTL && styles.rowRTL]}>
          <AppText weight="bold" size="md" color={colors.textPrimary}>
            تست‌های این نکته
          </AppText>
          <View style={styles.testCountBadge}>
            <AppText size="xs" weight="bold" color="#15803D">
              {toPersianDigits(questions.length)} تست تالیفی و کنکوری
            </AppText>
          </View>
        </View>

        {/* Questions list */}
        {questions.length === 0 ? (
          <AppText color={colors.textSecondary}>{t('konkur.noTests')}</AppText>
        ) : (
          questions.map((q, idx) => renderQuestionBlock(q, idx, !!expandedQuestions[q.id]))
        )}

        <View style={{ height: 90 }} />
      </ScreenContainer>

      {/* Floating Bottom Sticky Bar */}
      <View style={[styles.stickyBottomBar, isRTL && styles.rowRTL]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="اشتراک‌گذاری"
          onPress={handleShare}
          style={styles.shareIconButton}
        >
          <Icon name="share" size={20} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="شروع تمرین این نکته"
          onPress={startPractice}
          style={styles.startPracticeButton}
        >
          <AppText size="sm" weight="bold" color="#FFFFFF">
            ▶ شروع تمرین این نکته
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(colors =>
  StyleSheet.create({
    screenWrapper: {
      flex: 1,
      backgroundColor: colors.background,
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    subjectChip: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    tipTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginVertical: spacing.sm,
    },
    bulbCircle: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: '#F7FEE7',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#D9F99D',
    },
    goldenRuleCard: {
      backgroundColor: '#F7FEE7',
      borderWidth: 1,
      borderColor: '#D9F99D',
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.sm,
      marginVertical: spacing.xs,
    },
    ruleHeaderRow: {
      marginBottom: spacing.xs,
    },
    goldenFormulasBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    tipCallout: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      backgroundColor: '#F0FDF4',
      borderRadius: radius.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: '#BBF7D0',
    },
    formulaSheetPill: {
      alignSelf: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginVertical: spacing.sm,
    },
    exampleCard: {
      padding: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      backgroundColor: '#FFFFFF',
      gap: spacing.sm,
      marginVertical: spacing.xs,
    },
    exampleHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    exampleTag: {
      backgroundColor: '#F1F5F9',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    formulaBox: {
      backgroundColor: '#F0F4FF',
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E0E7FF',
    },
    showExampleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: '#EEF2FF',
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: '#C7D2FE',
    },
    exampleSolutionBox: {
      backgroundColor: '#F8FAFC',
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      marginTop: spacing.xs,
    },
    testsSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    testCountBadge: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    questionCard: {
      padding: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      backgroundColor: '#FFFFFF',
      gap: spacing.sm,
      marginVertical: spacing.xs,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    authorBadge: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    choicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    choiceButton: {
      flexBasis: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F0F4FF',
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: '#E0E7FF',
    },
    choiceButtonSelected: {
      backgroundColor: '#F7FEE7',
      borderColor: '#76E000',
      borderWidth: 2,
    },
    choiceButtonCorrect: {
      backgroundColor: '#DCFCE7',
      borderColor: '#15803D',
    },
    solutionButton: {
      backgroundColor: '#76E000',
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    solutionBox: {
      backgroundColor: '#F0FDF4',
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#BBF7D0',
      marginTop: spacing.xs,
    },
    collapsedQuestionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderRadius: radius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      marginVertical: spacing.xs,
    },
    numberBadge: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stickyBottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#EEF0F4',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    shareIconButton: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    startPracticeButton: {
      flex: 1,
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: '#1E3A1E',
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);

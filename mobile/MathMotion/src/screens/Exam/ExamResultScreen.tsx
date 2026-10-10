import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { scoreExam } from '../../services/exam/buildExam';
import { paperKeyOf } from '../../services/exam/konkurExam';
import { averageSecondsPerQuestion, formatClock, localizeDigits } from '../../services/exam/scoring';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { Icon } from '../../components/common/Icon';
import { ExamRankCard } from './ExamRankCard';

type Props = NativeStackScreenProps<RootStackParamList, 'ExamResult'>;

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <AppText weight="bold" align="center" color={color}>
        {value}
      </AppText>
      <AppText size="xs" align="center" color={color}>
        {label}
      </AppText>
    </View>
  );
}

function verdictKey(percent: number): string {
  if (percent >= 90) {
    return 'exam.verdict.excellent';
  }
  if (percent >= 70) {
    return 'exam.verdict.good';
  }
  if (percent >= 50) {
    return 'exam.verdict.fair';
  }
  return 'exam.verdict.weak';
}

// Score, per-chapter breakdown (weakest first — what to study next) and a
// review of every question with the student's answer and the right one.
export function ExamResultScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { config, questions, answers, elapsedSec, durationSec, timedOut } = route.params;
  const score = useMemo(() => scoreExam(questions, answers), [questions, answers]);

  const scoreColor =
    score.percent >= 70 ? colors.success : score.percent >= 50 ? colors.warning : colors.danger;
  const rowStyle = [styles.row, isRTL && styles.rowRTL];
  const num = (value: number | string) => localizeDigits(value, isRTL);
  const average = averageSecondsPerQuestion(elapsedSec, score.total);

  return (
    <ScreenContainer scroll>
      <Card style={styles.scoreCard}>
        <AppText size="xxl" weight="bold" align="center" color={scoreColor}>
          {t('exam.percent', { percent: num(score.percent) })}
        </AppText>
        <AppText align="center" weight="medium">
          {t('exam.points', { points: num(score.points) })}
        </AppText>
        <AppText align="center" color={colors.textSecondary}>
          {t(verdictKey(score.percent))}
        </AppText>
        {timedOut && (
          <AppText size="sm" align="center" color={colors.danger}>
            {t('exam.timedOutNote')}
          </AppText>
        )}
        <View style={[rowStyle, styles.stats]}>
          <Stat label={t('exam.correctCount')} value={num(score.correct)} color={colors.success} />
          <Stat label={t('exam.wrongCount')} value={num(score.wrong)} color={colors.danger} />
          <Stat label={t('exam.blankCount')} value={num(score.blank)} color={colors.textSecondary} />
        </View>
        <View style={[rowStyle, styles.stats]}>
          <Stat
            label={t('exam.timeUsed')}
            value={`${num(formatClock(elapsedSec))} / ${num(formatClock(durationSec))}`}
            color={colors.textPrimary}
          />
          <Stat
            label={t('exam.avgPerQuestion')}
            value={t('exam.seconds', { value: num(average) })}
            color={colors.textPrimary}
          />
        </View>
      </Card>

      {config.konkur && (
        <ExamRankCard
          paperKey={paperKeyOf(config.konkur)}
          percent={score.percent}
          correct={score.correct}
          wrong={score.wrong}
          blank={score.blank}
          seconds={elapsedSec}
        />
      )}

      {score.byTopic.length > 0 && (
        <Card style={styles.section}>
          <AppText weight="bold" size="lg">
            {t('exam.byTopic')}
          </AppText>
          {score.byTopic.map(topic => {
            const ratio = topic.correctPercent / 100;
            const barColor = ratio >= 0.7 ? colors.success : ratio >= 0.5 ? colors.warning : colors.danger;
            return (
              <View key={topic.key} style={styles.chapter}>
                <View style={rowStyle}>
                  <AppText size="sm" style={styles.flexOne}>
                    {topic.label}
                  </AppText>
                  <AppText size="sm" weight="bold" color={barColor}>
                    {t('exam.percent', { percent: num(topic.correctPercent) })} · {t('exam.scoreLine', { correct: num(topic.correct), total: num(topic.total) })}
                  </AppText>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      isRTL && styles.fillRTL,
                      { width: `${topic.correctPercent}%` as const, backgroundColor: barColor },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {score.byChapter.length > 0 && (
      <Card style={styles.section}>
        <AppText weight="bold" size="lg">
          {t('exam.byChapter')}
        </AppText>
        {score.byChapter.map(ch => {
          const ratio = ch.correct / ch.total;
          const barColor = ratio >= 0.7 ? colors.success : ratio >= 0.5 ? colors.warning : colors.danger;
          return (
            <View key={ch.chapterId} style={styles.chapter}>
              <View style={rowStyle}>
                <AppText size="sm" style={styles.flexOne}>
                  {t(`exam.chapters.${ch.chapterId}`)}
                </AppText>
                <AppText size="sm" weight="bold" color={barColor}>
                  {t('exam.scoreLine', { correct: num(ch.correct), total: num(ch.total) })}
                </AppText>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    isRTL && styles.fillRTL,
                    { width: `${Math.round(ratio * 100)}%` as const, backgroundColor: barColor },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </Card>
      )}

      <View style={styles.actions}>
        <AppButton
          label={config.konkur ? t('exam.konkurRetry') : t('exam.retry')}
          icon="refresh"
          onPress={() => navigation.replace('Exam', { config })}
        />
        <AppButton label={t('exam.otherChapters')} variant="secondary" onPress={() => navigation.goBack()} />
      </View>

      <AppText weight="bold" size="lg">
        {t('exam.review')}
      </AppText>
      {questions.map((q, i) => {
        const chosen = answers[i];
        const correct = chosen === q.answerIndex;
        const blank = chosen === null;
        return (
          <Card key={q.id} style={[styles.section, correct ? styles.reviewCorrect : styles.reviewWrong]}>
            <View style={rowStyle}>
              <Icon
                name={correct ? 'check-circle' : blank ? 'remove-circle-outline' : 'cancel'}
                size={20}
                color={correct ? colors.success : blank ? colors.textSecondary : colors.danger}
              />
              <AppText size="sm" weight="medium" style={styles.flexOne}>
                {t('exam.questionNumber', { n: num(i + 1) })} {q.text ?? t(`exam.q.${q.textKey}`, q.params)}
              </AppText>
            </View>
            {q.expression && <MathExpression expression={q.expression} size="md" />}

            <View style={rowStyle}>
              <AppText size="sm" color={colors.textSecondary}>
                {t('exam.yourAnswer')}
              </AppText>
              {chosen === null ? (
                <AppText size="sm" color={colors.danger}>
                  {t('exam.unanswered')}
                </AppText>
              ) : (
                q.choicesMath === false ? (
                  <AppText size="sm">{q.choices[chosen]}</AppText>
                ) : (
                  <MathExpression expression={q.choices[chosen]} size="sm" />
                )
              )}
            </View>
            {!correct && (
              <View style={rowStyle}>
                <AppText size="sm" color={colors.textSecondary}>
                  {t('exam.correctAnswer')}
                </AppText>
                {q.choicesMath === false ? (
                  <AppText size="sm" weight="bold">{q.choices[q.answerIndex]}</AppText>
                ) : (
                  <MathExpression expression={q.choices[q.answerIndex]} size="sm" emphasize />
                )}
              </View>
            )}
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  scoreCard: {
    gap: spacing.xs,
    alignItems: 'stretch',
  },
  stats: {
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  stat: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  chapter: {
    gap: spacing.xs,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  fillRTL: {
    alignSelf: 'flex-end',
  },
  actions: {
    gap: spacing.sm,
  },
  reviewCorrect: {
    borderColor: colors.successMuted,
  },
  reviewWrong: {
    borderColor: colors.dangerMuted,
  },
}));

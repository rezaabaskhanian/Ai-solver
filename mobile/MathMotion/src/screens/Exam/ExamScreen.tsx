import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, Image, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { QuizChoice } from '../../components/Quiz/QuizChoice';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { useKonkurContent } from '../../store/useKonkurContentStore';
import { useKonkurProgressStore } from '../../store/useKonkurProgressStore';
import { buildExam } from '../../services/exam/buildExam';
import { buildKonkurExam } from '../../services/exam/konkurExam';
import { trackEvent } from '../../services/telemetry';
import {
  defaultDurationSec,
  elapsedSeconds,
  formatClock,
  isWarning,
  localizeDigits,
  remainingSeconds,
} from '../../services/exam/scoring';
import { Icon } from '../../components/common/Icon';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Exam'>;

// Exam mode, unlike Quiz: no right/wrong feedback while answering — the
// student can move back and forth and change answers, and only sees the
// score (and each correct answer) on ExamResult.
export function ExamScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { config } = route.params;

  const content = useKonkurContent();

  // Generated once per exam — a re-render must not swap the questions.
  const [questions] = useState(() =>
    config.konkur ? buildKonkurExam(content, config.konkur) : buildExam(config),
  );
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [index, setIndex] = useState(0);

  // The clock comes from timestamps (a fixed deadline), never from counting
  // ticks, so it stays right after the app was in the background.
  const durationSec = config.durationSec ?? defaultDurationSec(config.count);
  const [startedAt] = useState(() => Date.now());
  const deadline = startedAt + durationSec * 1000;
  const [remaining, setRemaining] = useState(durationSec);

  useEffect(() => {
    trackEvent('exam_started', { count: questions.length, konkur: !!config.konkur });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const finishedRef = useRef(false);

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      const final = answersRef.current;
      trackEvent('exam_finished', {
        timedOut,
        total: final.length,
        answered: final.filter(c => c !== null).length,
      });
      // Real konkur questions feed «پیشرفت من» too.
      final.forEach((choice, i) => {
        const q = questions[i];
        if (choice !== null && q.konkurId) {
          useKonkurProgressStore.getState().recordAttempt(q.konkurId, choice, choice === q.answerIndex);
        }
      });
      navigation.replace('ExamResult', {
        config,
        questions,
        answers: final,
        elapsedSec: elapsedSeconds(startedAt, Date.now(), durationSec),
        durationSec,
        timedOut,
      });
    },
    [config, durationSec, navigation, questions, startedAt],
  );

  useEffect(() => {
    if (questions.length === 0) {
      return undefined;
    }
    const tick = () => setRemaining(remainingSeconds(deadline, Date.now()));
    const interval = setInterval(tick, 500);
    // Coming back from the background: re-read the clock right away.
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        tick();
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [deadline, questions.length]);

  useEffect(() => {
    if (questions.length > 0 && remaining <= 0) {
      Alert.alert(t('exam.timeUp'), t('exam.timedOutNote'));
      finish(true);
    }
  }, [remaining, questions.length, finish, t]);

  if (questions.length === 0) {
    return (
      <ScreenContainer>
        <AppText align="center">{t('exam.noQuestions')}</AppText>
      </ScreenContainer>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = answers.filter(a => a !== null).length;
  const progress = `${((index + 1) / questions.length) * 100}%` as const;
  const warning = isWarning(remaining);

  const select = (choice: number) => {
    setAnswers(prev => prev.map((a, i) => (i === index ? choice : a)));
  };

  const clearAnswer = () => {
    setAnswers(prev => prev.map((a, i) => (i === index ? null : a)));
  };

  const handleFinish = () => {
    const unanswered = questions.length - answeredCount;
    if (unanswered === 0) {
      finish(false);
      return;
    }
    Alert.alert(
      t('exam.confirmTitle'),
      t('exam.confirmUnanswered', { count: localizeDigits(unanswered, isRTL) }),
      [
        { text: t('exam.keepGoing'), style: 'cancel' },
        { text: t('exam.finish'), onPress: () => finish(false) },
      ],
    );
  };

  return (
    <ScreenContainer scroll>
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <AppText weight="bold">
          {t('exam.questionOf', {
            n: localizeDigits(index + 1, isRTL),
            total: localizeDigits(questions.length, isRTL),
          })}
        </AppText>
        <View
          style={[styles.timer, isRTL && styles.rowRTL, warning && styles.timerWarning]}
          accessibilityRole="timer"
          accessibilityLabel={`${t('exam.timeLeft')} ${formatClock(remaining)}`}
        >
          <Icon name="timer" size={18} color={warning ? colors.danger : colors.textSecondary} />
          <AppText weight="bold" color={warning ? colors.danger : colors.textPrimary} style={styles.clock}>
            {localizeDigits(formatClock(remaining), isRTL)}
          </AppText>
        </View>
      </View>
      <AppText size="sm" color={colors.textSecondary}>
        {t('exam.answered', {
          count: localizeDigits(answeredCount, isRTL),
          total: localizeDigits(questions.length, isRTL),
        })}
        {' · '}
        {t('exam.scoring')}
      </AppText>
      <View style={styles.track}>
        <View style={[styles.fill, isRTL && styles.fillRTL, { width: progress }]} />
      </View>

      <Card style={styles.card}>
        <AppText weight="medium" size="lg">
          {question.text ?? t(`exam.q.${question.textKey}`, question.params)}
        </AppText>
        {question.figure !== undefined && (
          <Image
            source={question.figure}
            style={styles.figure}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        )}
        {question.expression && (
          <View style={styles.expression}>
            <MathExpression expression={question.expression} size="lg" />
          </View>
        )}
        <View style={styles.choices}>
          {question.choices.map((choice, i) => (
            <QuizChoice
              key={`${question.id}-${i}`}
              label={choice}
              math={question.choicesMath !== false}
              disabled={false}
              state={answers[index] === i ? 'selected' : 'default'}
              onPress={() => select(i)}
            />
          ))}
        </View>
        {answers[index] !== null && (
          <AppButton label={t('exam.clearAnswer')} variant="ghost" size="sm" onPress={clearAnswer} />
        )}
      </Card>

      <View style={[styles.nav, isRTL && styles.rowRTL]}>
        <AppButton
          size="sm"
          label={t('exam.previous')}
          variant="secondary"
          disabled={index === 0}
          onPress={() => setIndex(i => i - 1)}
          style={styles.flexOne}
        />
        {isLast ? (
          <AppButton label={t('exam.finish')} size="sm" icon="flag" onPress={handleFinish} style={styles.flexOne} />
        ) : (
          <AppButton
            size="sm"
            label={t('exam.next')}
            variant={answers[index] === null ? 'secondary' : 'primary'}
            onPress={() => setIndex(i => i + 1)}
            style={styles.flexOne}
          />
        )}
      </View>
      {!isLast && (
        <AppButton label={t('exam.finishEarly')} variant="ghost" size="sm" onPress={handleFinish} />
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  timerWarning: {
    backgroundColor: colors.dangerMuted,
  },
  clock: {
    fontVariant: ['tabular-nums'],
  },
  figure: {
    width: '100%',
    height: 160,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  fillRTL: {
    alignSelf: 'flex-end',
  },
  card: {
    gap: spacing.md,
  },
  expression: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  choices: {
    gap: spacing.sm,
  },
  nav: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexOne: {
    flex: 1,
  },
}));

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { QuizChoice } from '../../components/Quiz/QuizChoice';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { buildExam } from '../../services/exam/buildExam';
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

  // Generated once per exam — a re-render must not swap the questions.
  const [questions] = useState(() => buildExam(config));
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [index, setIndex] = useState(0);

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

  const select = (choice: number) => {
    setAnswers(prev => prev.map((a, i) => (i === index ? choice : a)));
  };

  const finish = () => {
    navigation.replace('ExamResult', { config, questions, answers });
  };

  const handleFinish = () => {
    const unanswered = questions.length - answeredCount;
    if (unanswered === 0) {
      finish();
      return;
    }
    Alert.alert(t('exam.confirmTitle'), t('exam.confirmUnanswered', { count: unanswered }), [
      { text: t('exam.keepGoing'), style: 'cancel' },
      { text: t('exam.finish'), onPress: finish },
    ]);
  };

  return (
    <ScreenContainer scroll>
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <AppText weight="bold">
          {t('exam.questionOf', { n: index + 1, total: questions.length })}
        </AppText>
        <AppText size="sm" color={colors.textSecondary}>
          {t('exam.answered', { count: answeredCount, total: questions.length })}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, isRTL && styles.fillRTL, { width: progress }]} />
      </View>

      <Card style={styles.card}>
        <AppText weight="medium" size="lg">
          {t(`exam.q.${question.textKey}`, question.params)}
        </AppText>
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
              math
              disabled={false}
              state={answers[index] === i ? 'selected' : 'default'}
              onPress={() => select(i)}
            />
          ))}
        </View>
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

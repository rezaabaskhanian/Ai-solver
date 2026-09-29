import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { QuizChoice } from '../../components/Quiz/QuizChoice';
import { buildQuizChoices } from '../../components/Quiz/quizChoices';
import { FinalAnswerCard } from '../../components/Solution/FinalAnswerCard';
import { ProblemCard } from '../../components/Solution/ProblemCard';
import { StepProgressDots } from '../../components/StepViewer/StepProgressDots';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Icon } from '../../components/common/Icon';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import type { RootStackParamList } from '../../navigation/types';
import { radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

// Interactive Learning (PRD section 20): the same solved steps Solution
// shows all at once, revealed here one "what should we do next?" question
// at a time — turning the calculator into a tutor. A wrong pick doesn't
// end the attempt: it's crossed off so the student tries a different
// option on the same question, rather than being shown the right answer
// outright.
export function QuizScreen({ route, navigation }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const { problem, result } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongChoices, setWrongChoices] = useState<Set<number>>(new Set());
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [finished, setFinished] = useState(result.steps.length === 0);

  const step = result.steps[currentIndex];
  const isLastStep = currentIndex >= result.steps.length - 1;
  // Stable per-step (and per-language) shuffle: recomputing on every
  // render would let the correct answer's position jump around as the
  // student clicks wrong options.
  const choices = useMemo(
    () => (step ? buildQuizChoices(step, t, result.type) : []),
    [step, t, result.type],
  );

  const handleSelect = (index: number) => {
    if (answeredCorrectly || wrongChoices.has(index)) {
      return;
    }
    if (choices[index].correct) {
      setAnsweredCorrectly(true);
    } else {
      setWrongChoices(prev => new Set(prev).add(index));
    }
  };

  const handleContinue = () => {
    if (isLastStep) {
      setFinished(true);
      return;
    }
    setCurrentIndex(i => i + 1);
    setWrongChoices(new Set());
    setAnsweredCorrectly(false);
  };

  return (
    <ScreenContainer scroll>
      <ProblemCard problem={problem} type={result.type} />

      {finished ? (
        <View style={styles.completeBlock}>
          <View style={styles.center}>
            <Icon name="emoji-events" size={48} color={colors.warning} />
            <AppText weight="bold" size="lg" align="center">
              {t('quiz.complete')}
            </AppText>
          </View>
          <FinalAnswerCard answer={result.answer} verified={result.verified} />
          <AppButton label={t('solution.done')} variant="primary" icon="home" onPress={() => navigation.popToTop()} />
        </View>
      ) : (
        <>
          <StepProgressDots total={result.steps.length} currentIndex={currentIndex} />

          <Card>
            <MathExpression expression={step.before} size="md" />
            <AppText weight="medium" style={styles.prompt}>
              {currentIndex === 0 ? t('quiz.promptFirst') : t('quiz.promptNext')}
            </AppText>

            <View style={styles.choices}>
              {choices.map((choice, index) => (
                <QuizChoice
                  key={`${currentIndex}-${index}`}
                  label={choice.label}
                  disabled={answeredCorrectly || wrongChoices.has(index)}
                  state={
                    answeredCorrectly && choice.correct
                      ? 'correct'
                      : wrongChoices.has(index)
                        ? 'incorrect'
                        : 'default'
                  }
                  onPress={() => handleSelect(index)}
                />
              ))}
            </View>

            {answeredCorrectly && (
              <View style={[styles.feedback, { backgroundColor: colors.successMuted }]}>
                <Icon name="check-circle" color={colors.success} />
                <AppText color={colors.success} weight="medium">
                  {t('quiz.correct')}
                </AppText>
              </View>
            )}
          </Card>

          {answeredCorrectly && (
            <AppButton
              label={isLastStep ? t('quiz.finish') : t('quiz.continue')}
              variant="primary"
              onPress={handleContinue}
            />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  completeBlock: {
    gap: spacing.md,
  },
  choices: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  prompt: {
    marginTop: spacing.md,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  center: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});

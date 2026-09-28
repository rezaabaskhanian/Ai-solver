import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { QuizChoice } from '../../components/Quiz/QuizChoice';
import { buildQuizChoices } from '../../components/Quiz/quizChoices';
import { FinalAnswerCard } from '../../components/Solution/FinalAnswerCard';
import { StepProgressDots } from '../../components/StepViewer/StepProgressDots';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

// Interactive Learning (PRD section 20): the same solved steps Solution
// shows all at once, revealed here one "what should we do next?" question
// at a time — turning the calculator into a tutor. A wrong pick doesn't
// end the attempt: it's crossed off so the student tries a different
// option on the same question, rather than being shown the right answer
// outright.
export function QuizScreen({ route, navigation }: Props) {
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
  const choices = useMemo(() => (step ? buildQuizChoices(step, t) : []), [step, t]);

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
      <AppText size="sm" color={colors.textSecondary}>
        {t('quiz.title')}
      </AppText>
      <MathExpression expression={problem} size="lg" />

      {finished ? (
        <View style={styles.completeBlock}>
          <AppText weight="bold" size="lg" align="center">
            {t('quiz.complete')}
          </AppText>
          <FinalAnswerCard answer={result.answer} verified={result.verified} />
          <AppButton label={t('solution.done')} variant="primary" onPress={() => navigation.popToTop()} />
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
              <AppText color={colors.success} weight="medium" style={styles.feedback}>
                {t('quiz.correct')}
              </AppText>
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
    marginTop: spacing.md,
  },
});

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PaywallCard } from '../../components/Billing/PaywallCard';
import { StepFeedbackCard } from '../../components/CheckSteps/StepFeedbackCard';
import { StepsInput } from '../../components/CheckSteps/StepsInput';
import { ProblemCard } from '../../components/Solution/ProblemCard';
import { StepCard } from '../../components/StepViewer/StepCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { checkSteps } from '../../services/api/problems';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import type { CheckResult } from '../../types/problem';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckSteps'>;

// Lets the student type their own step-by-step attempt and get
// feedback on where (if anywhere) it went wrong — see
// backend/math-engine/app/solver/check.py for the algorithm. Reachable
// from ProblemInputScreen (check your own attempt) and from
// SolutionScreen's "Practice similar" (attempt a freshly generated
// problem) — both just pass {problem}, this screen doesn't care which.
export function CheckStepsScreen({ route }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const { problem } = route.params;

  const [stepsText, setStepsText] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { isPremium, freeSolvesUsed, freeSolvesLimit, refresh: refreshEntitlement } =
    useEntitlementStore();
  const quotaExhausted = !isPremium && freeSolvesUsed >= freeSolvesLimit;

  const lines = stepsText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const handleCheck = async () => {
    setChecking(true);
    setErrorKey(null);
    try {
      const outcome = await checkSteps(problem, lines);
      setResult(outcome);
      refreshEntitlement();
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'quota_exceeded') {
        refreshEntitlement();
      } else {
        setErrorKey(t(translationKeyForApiError(apiError), { defaultValue: apiError.message }));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <ProblemCard problem={problem} caption={t('checkSteps.caption')} />

      <StepsInput value={stepsText} onChangeText={setStepsText} />

      {quotaExhausted ? (
        <PaywallCard />
      ) : (
        <AppButton
          label={checking ? t('checkSteps.checking') : t('checkSteps.checkButton')}
          icon="fact-check"
          onPress={handleCheck}
          loading={checking}
          disabled={lines.length === 0}
        />
      )}

      {errorKey && (
        <AppText size="sm" color={colors.danger}>
          {errorKey}
        </AppText>
      )}

      {result && (
        <View style={styles.feedback}>
          {lines.map((line, index) =>
            index < result.step_statuses.length ? (
              <StepFeedbackCard key={index} stepText={line} status={result.step_statuses[index]} />
            ) : null,
          )}

          {result.status === 'correct_and_solved' ? (
            <View style={[styles.summary, styles.summaryGood]}>
              <Icon name="emoji-events" size={36} color={colors.success} />
              <AppText weight="bold" color={colors.success} align="center">
                {t('checkSteps.allCorrect', { answer: result.correct_answer })}
              </AppText>
            </View>
          ) : (
            <View style={styles.hintBlock}>
              <View
                style={[
                  styles.summary,
                  result.status === 'incorrect' ? styles.summaryBad : styles.summaryPending,
                ]}
              >
                <Icon
                  name={result.status === 'incorrect' ? 'error-outline' : 'hourglass-empty'}
                  size={28}
                  color={result.status === 'incorrect' ? colors.danger : colors.warning}
                />
                <AppText weight="medium" align="center">
                  {result.status === 'incorrect'
                    ? t('checkSteps.mistakeFound')
                    : t('checkSteps.notYetFinished')}
                </AppText>
              </View>
              {result.next_step_hint && <StepCard step={result.next_step_hint} />}
            </View>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  summary: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  summaryGood: {
    backgroundColor: colors.successMuted,
    borderColor: colors.success,
  },
  summaryBad: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
  },
  summaryPending: {
    backgroundColor: colors.warningMuted,
    borderColor: colors.warning,
  },
  feedback: {
    gap: spacing.md,
  },
  hintBlock: {
    gap: spacing.sm,
  },
}));

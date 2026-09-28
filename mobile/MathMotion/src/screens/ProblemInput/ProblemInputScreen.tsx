import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PaywallCard } from '../../components/Billing/PaywallCard';
import { EquationInput } from '../../components/ProblemInput/EquationInput';
import { ParsePreviewBanner } from '../../components/ProblemInput/ParsePreviewBanner';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useParsePreview } from '../../hooks/useParsePreview';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { solveProblem } from '../../services/api/problems';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { colors, spacing } from '../../theme';

export function ProblemInputScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ProblemInput'>>();

  const [input, setInput] = useState(params?.initialProblem ?? '');
  const [solving, setSolving] = useState(false);
  const [solveErrorKey, setSolveErrorKey] = useState<string | null>(null);
  const [quizzing, setQuizzing] = useState(false);
  const [quizErrorKey, setQuizErrorKey] = useState<string | null>(null);

  const preview = useParsePreview(input);
  const { isPremium, freeSolvesUsed, freeSolvesLimit, refresh: refreshEntitlement } =
    useEntitlementStore();
  const quotaExhausted = !isPremium && freeSolvesUsed >= freeSolvesLimit;

  const handleClear = () => {
    setInput('');
    setSolveErrorKey(null);
  };

  const handleSolve = async () => {
    const problem = input.trim();
    if (!problem) {
      return;
    }

    setSolving(true);
    setSolveErrorKey(null);
    try {
      const result = await solveProblem(problem);
      refreshEntitlement();
      navigation.navigate('Solution', { problem, result });
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'quota_exceeded') {
        // Local entitlement was stale (e.g. solved on another session) —
        // resync so the paywall replaces the Solve button below.
        refreshEntitlement();
      } else {
        setSolveErrorKey(t(translationKeyForApiError(apiError), { defaultValue: apiError.message }));
      }
    } finally {
      setSolving(false);
    }
  };

  // Interactive Learning (PRD section 20): solves the same way Solve
  // does, but goes to Quiz instead of Solution so the step-by-step
  // answer isn't shown upfront -- the student earns each step by picking
  // the right operation first.
  const handleQuizMe = async () => {
    const problem = input.trim();
    if (!problem) {
      return;
    }

    setQuizzing(true);
    setQuizErrorKey(null);
    try {
      const result = await solveProblem(problem);
      refreshEntitlement();
      navigation.navigate('Quiz', { problem, result });
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'quota_exceeded') {
        refreshEntitlement();
      } else {
        setQuizErrorKey(t(translationKeyForApiError(apiError), { defaultValue: apiError.message }));
      }
    } finally {
      setQuizzing(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.field}>
        <EquationInput value={input} onChangeText={setInput} autoFocus={!params?.initialProblem} />
        <ParsePreviewBanner result={preview.result} error={preview.error} loading={preview.loading} />
      </View>

      {solveErrorKey && (
        <AppText size="sm" color={colors.danger}>
          {solveErrorKey}
        </AppText>
      )}
      {quizErrorKey && (
        <AppText size="sm" color={colors.danger}>
          {quizErrorKey}
        </AppText>
      )}

      {quotaExhausted ? (
        <PaywallCard />
      ) : (
        <View style={styles.actionsColumn}>
          <View style={styles.actions}>
            <AppButton
              label={t('problemInput.clear')}
              variant="secondary"
              onPress={handleClear}
              disabled={!input}
              style={styles.button}
            />
            <AppButton
              label={solving ? t('problemInput.solving') : t('problemInput.solve')}
              variant="primary"
              onPress={handleSolve}
              disabled={!input.trim()}
              loading={solving}
              style={styles.button}
            />
          </View>
          <AppButton
            label={t('problemInput.checkMySteps')}
            variant="ghost"
            onPress={() => navigation.navigate('CheckSteps', { problem: input.trim() })}
            disabled={!input.trim()}
          />
          <AppButton
            label={quizzing ? t('problemInput.startingQuiz') : t('problemInput.quizMe')}
            variant="ghost"
            onPress={handleQuizMe}
            disabled={!input.trim()}
            loading={quizzing}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  actionsColumn: {
    gap: spacing.sm,
    marginTop: 'auto',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});

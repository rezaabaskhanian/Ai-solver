import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PaywallCard } from '../../components/Billing/PaywallCard';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { solveProblem } from '../../services/api/problems';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RecognizedProblems'>;

// Shown after Scan -> recognize (PRD section 8: confirm before solving).
// Solving is deferred until the user taps the problem they actually
// want solved — the same solveProblem() ProblemInputScreen already
// uses, so everything downstream (ArSolution) is unchanged.
export function RecognizedProblemsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { photoUri, problems } = route.params;
  const [solvingIndex, setSolvingIndex] = useState<number | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { isPremium, freeSolvesUsed, freeSolvesLimit, refresh: refreshEntitlement } =
    useEntitlementStore();
  const quotaExhausted = !isPremium && freeSolvesUsed >= freeSolvesLimit;

  const handleSelect = async (problem: string, index: number) => {
    setSolvingIndex(index);
    setErrorKey(null);
    try {
      const result = await solveProblem(problem);
      refreshEntitlement();
      navigation.navigate('ArSolution', { photoUri, problem, result });
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'quota_exceeded') {
        refreshEntitlement();
      } else {
        setErrorKey(t(translationKeyForApiError(apiError), { defaultValue: apiError.message }));
      }
    } finally {
      setSolvingIndex(null);
    }
  };

  return (
    <ScreenContainer scroll>
      <AppText size="sm" color={colors.textSecondary}>
        {t('scan.recognizedTitle')}
      </AppText>

      {quotaExhausted ? (
        <PaywallCard />
      ) : (
        <View style={styles.list}>
          {problems.map((problem, index) => (
            <Card
              key={`${problem}-${index}`}
              onPress={solvingIndex === null ? () => handleSelect(problem, index) : undefined}
              style={styles.row}
            >
              <MathExpression expression={problem} size="md" />
              {solvingIndex === index ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <AppText size="sm" color={colors.textSecondary}>
                  {t('scan.tapToSolve')}
                </AppText>
              )}
            </Card>
          ))}
        </View>
      )}

      {errorKey && (
        <AppText size="sm" color={colors.danger}>
          {errorKey}
        </AppText>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.sm,
  },
});

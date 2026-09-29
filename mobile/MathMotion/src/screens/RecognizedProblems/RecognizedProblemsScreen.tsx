import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { PaywallCard } from '../../components/Billing/PaywallCard';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { solveProblem } from '../../services/api/problems';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RecognizedProblems'>;

// Shown after Scan -> recognize (PRD section 8: confirm before solving).
// Solving is deferred until the user taps the problem they actually
// want solved — the same solveProblem() ProblemInputScreen already
// uses, so everything downstream (ArSolution) is unchanged.
export function RecognizedProblemsScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const isRTL = useIsRTL();
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
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        {/* The camera gives a bare path; Image needs a file:// URI. */}
        <Image source={{ uri: `file://${photoUri}` }} style={styles.thumb} />
        <View style={styles.flexOne}>
          <AppText weight="bold">{t('scan.recognizedCount', { count: problems.length })}</AppText>
          <AppText size="sm" color={colors.textSecondary}>
            {t('scan.recognizedTitle')}
          </AppText>
        </View>
      </View>

      {quotaExhausted ? (
        <PaywallCard />
      ) : (
        <View style={styles.list}>
          {problems.map((problem, index) => (
            <Card
              key={`${problem}-${index}`}
              onPress={solvingIndex === null ? () => handleSelect(problem, index) : undefined}
              style={[styles.row, isRTL && styles.rowRTL]}
            >
              <View style={styles.number}>
                <AppText weight="bold" color={colors.primaryText}>
                  {index + 1}
                </AppText>
              </View>
              <View style={styles.flexOne}>
                <MathExpression expression={problem} size="md" emphasize />
                <AppText size="xs" color={colors.textSecondary}>
                  {t('scan.tapToSolve')}
                </AppText>
              </View>
              {solvingIndex === index ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Icon name="chevron-right" color={colors.textSecondary} directional />
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

const useStyles = makeStyles(colors => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  flexOne: {
    flex: 1,
    gap: 2,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  number: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { PaywallCard } from '../../components/Billing/PaywallCard';
import { EquationInput } from '../../components/ProblemInput/EquationInput';
import { ParsePreviewBanner } from '../../components/ProblemInput/ParsePreviewBanner';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useIsRTL } from '../../hooks/useIsRTL';
import { useParsePreview } from '../../hooks/useParsePreview';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { solveProblem } from '../../services/api/problems';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { Icon } from '../../components/common/Icon';

// Laid out after the Stitch "type_problem" design: detected-type pill +
// clear button, the input card and keypad (EquationInput), then Solve and
// the two learning modes, and a short note on how answers are checked.
export function ProblemInputScreen() {
  const colors = useColors();
  const styles = useStyles();
  const isRTL = useIsRTL();
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
    <ScreenContainer scroll>
      <View style={[styles.row, isRTL && styles.rowRTL]}>
        <ParsePreviewBanner result={preview.result} error={preview.error} loading={preview.loading} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('problemInput.clear')}
          onPress={handleClear}
          disabled={!input}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed, !input && styles.disabled]}
        >
          <Icon name="delete-outline" />
        </Pressable>
      </View>

      <EquationInput value={input} onChangeText={setInput} autoFocus={!params?.initialProblem} />

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
          <AppButton
            label={solving ? t('problemInput.solving') : t('problemInput.solve')}
            icon="psychology"
            iconEnd="arrow-forward"
            variant="primary"
            onPress={handleSolve}
            disabled={!input.trim()}
            loading={solving}
            style={styles.solve}
          />
          <View style={[styles.row, isRTL && styles.rowRTL]}>
            <AppButton
              label={quizzing ? t('problemInput.startingQuiz') : t('problemInput.quizMe')}
              icon="school"
              variant="secondary"
              onPress={handleQuizMe}
              disabled={!input.trim()}
              loading={quizzing}
              style={[styles.button, styles.quizButton]}
            />
            <AppButton
              label={t('problemInput.checkMySteps')}
              icon="fact-check"
              variant="secondary"
              onPress={() => navigation.navigate('CheckSteps', { problem: input.trim() })}
              disabled={!input.trim()}
              style={styles.button}
            />
          </View>
        </View>
      )}

      <View style={[styles.note, isRTL && styles.rowRTL]}>
        <View style={styles.noteIcon}>
          <Icon name="verified-user" color={colors.success} />
        </View>
        <View style={styles.flexOne}>
          <AppText size="sm" weight="bold">
            {t('problemInput.noteTitle')}
          </AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {t('problemInput.noteBody')}
          </AppText>
        </View>
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
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
  clear: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  actionsColumn: {
    gap: spacing.sm,
  },
  solve: {
    minHeight: 56,
    borderRadius: radius.lg,
  },
  button: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: colors.surfaceMuted,
  },
  quizButton: {
    backgroundColor: colors.primaryMuted,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  noteIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

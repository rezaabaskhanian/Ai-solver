import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';

import { FinalAnswerCard } from '../../components/Solution/FinalAnswerCard';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { MathExpression } from '../../components/MathExpression/MathExpression';
import { StepViewer } from '../../components/StepViewer/StepViewer';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { practiceProblem } from '../../services/api/problems';
import type { ProblemType } from '../../types/problem';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Solution'>;

// Only these types have a practice generator (see
// backend/math-engine/app/solver/practice.py) — derivative/integral/
// trig/arithmetic_equation don't, so "Practice similar" is hidden for
// them rather than shown and failing.
const PRACTICE_SUPPORTED_TYPES: ProblemType[] = [
  'linear_equation', 'quadratic_equation', 'expression', 'arithmetic',
];

// Solution UI per PRD section 39/16; step-to-step transitions are handled
// by the Animation Engine inside StepViewer/StepCard (PRD section 14).
export function SolutionScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { problem, result } = route.params;
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceErrorKey, setPracticeErrorKey] = useState<string | null>(null);
  const canPractice = PRACTICE_SUPPORTED_TYPES.includes(result.type);

  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [shareErrorKey, setShareErrorKey] = useState<string | null>(null);

  const handleShare = async () => {
    setSharing(true);
    setShareErrorKey(null);
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (uri) {
        await Share.open({ url: uri });
      }
    } catch (err) {
      // Share.open rejects when the user just dismisses the native
      // share sheet — not a real failure, so only surface capture
      // errors or an actual share-target failure.
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('User did not share')) {
        setShareErrorKey(t('solution.shareError'));
      }
    } finally {
      setSharing(false);
    }
  };

  // Generates a fresh problem of the same type and sends the student to
  // CheckSteps to attempt it themselves — ties practice generation to
  // step-checking instead of just handing over another answer to read.
  const handlePracticeSimilar = async () => {
    setGeneratingPractice(true);
    setPracticeErrorKey(null);
    try {
      const practice = await practiceProblem(result.type);
      navigation.navigate('CheckSteps', { problem: practice.problem });
    } catch (err) {
      const apiError = toApiError(err);
      setPracticeErrorKey(t(translationKeyForApiError(apiError), { defaultValue: apiError.message }));
    } finally {
      setGeneratingPractice(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
        <View style={styles.shareable}>
          <View style={styles.problemBlock}>
            <AppText size="sm" color={colors.textSecondary}>
              {t('solution.title')}
            </AppText>
            <MathExpression expression={problem} size="xl" />
          </View>

          <StepViewer steps={result.steps} />

          <View style={styles.finalBlock}>
            <AppText weight="bold" size="lg" align="center">
              {t('solution.solutionComplete')}
            </AppText>
            <FinalAnswerCard answer={result.answer} verified={result.verified} />
          </View>
        </View>
      </ViewShot>

      {practiceErrorKey && (
        <AppText size="sm" color={colors.danger}>
          {practiceErrorKey}
        </AppText>
      )}
      {shareErrorKey && (
        <AppText size="sm" color={colors.danger}>
          {shareErrorKey}
        </AppText>
      )}

      <View style={styles.actions}>
        {canPractice && (
          <AppButton
            label={generatingPractice ? t('solution.generatingPractice') : t('solution.practiceSimilar')}
            variant="secondary"
            onPress={handlePracticeSimilar}
            loading={generatingPractice}
            style={styles.button}
          />
        )}
        <AppButton
          label={sharing ? t('solution.sharing') : t('solution.share')}
          variant="secondary"
          onPress={handleShare}
          loading={sharing}
          style={styles.button}
        />
      </View>

      <AppButton
        label={t('solution.done')}
        variant="primary"
        onPress={() => navigation.popToTop()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shareable: {
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  problemBlock: {
    gap: spacing.xs,
  },
  finalBlock: {
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});

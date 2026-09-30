import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';

import { FinalAnswerCard } from '../../components/Solution/FinalAnswerCard';
import { PlotChart } from '../../components/Solution/PlotChart';
import { ProblemCard } from '../../components/Solution/ProblemCard';
import { StepList } from '../../components/Solution/StepList';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { StepViewer } from '../../components/StepViewer/StepViewer';
import { openPractice, PRACTICE_TYPES } from '../../content/practice';
import { useIsRTL } from '../../hooks/useIsRTL';
import type { RootStackParamList } from '../../navigation/types';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { practiceProblem } from '../../services/api/problems';
import { makeStyles, radius, spacing, useColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Solution'>;

// Solution UI per PRD section 39/16, laid out after the Stitch
// "solution_steps" designs: problem card, a toggle between the animated
// one-step player (StepViewer, design 1) and the full step timeline
// (StepList, design 2), the final answer, then Practice / Quiz / Share.
// Step-to-step transitions are the Animation Engine's (PRD section 14).
export function SolutionScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { problem, result } = route.params;
  const [view, setView] = useState<'player' | 'list'>('player');
  const hasSteps = result.steps.length > 0;
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceErrorKey, setPracticeErrorKey] = useState<string | null>(null);
  // Only types with a practice generator (content/practice.ts) —
  // derivative/integral/trig/geometry... don't, so "Practice similar" is
  // hidden for them rather than shown and failing.
  const canPractice = PRACTICE_TYPES.includes(result.type);

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
      openPractice(navigation, result.type, practice.problem);
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
          <ProblemCard problem={problem} type={result.type} />

          {result.plot && <PlotChart plot={result.plot} />}

          {hasSteps && (
            <View style={[styles.toggle, isRTL && styles.rowRTL]}>
              {(['player', 'list'] as const).map(option => {
                const active = option === view;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setView(option)}
                    style={[styles.toggleItem, active && styles.toggleItemActive]}
                  >
                    <AppText
                      size="sm"
                      weight="medium"
                      align="center"
                      color={active ? colors.onPrimary : colors.textSecondary}
                    >
                      {t(option === 'player' ? 'solution.viewPlayer' : 'solution.viewList')}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {view === 'player' ? <StepViewer steps={result.steps} /> : <StepList steps={result.steps} />}

          <FinalAnswerCard answer={result.answer} verified={result.verified} />
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

      <View style={[styles.actions, isRTL && styles.rowRTL]}>
        {canPractice && (
          <AppButton
            label={generatingPractice ? t('solution.generatingPractice') : t('solution.practiceSimilar')}
            icon="refresh"
            variant="primary"
            onPress={handlePracticeSimilar}
            loading={generatingPractice}
            style={styles.button}
          />
        )}
        {hasSteps && (
          <AppButton
            label={t('solution.quizThis')}
            icon="quiz"
            variant="secondary"
            onPress={() => navigation.navigate('Quiz', { problem, result })}
            style={styles.button}
          />
        )}
      </View>
      <AppButton
        label={sharing ? t('solution.sharing') : t('solution.shareImage')}
        icon="share"
        variant="secondary"
        onPress={handleShare}
        loading={sharing}
      />
      <AppButton label={t('solution.done')} variant="ghost" onPress={() => navigation.popToTop()} />
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  shareable: {
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  toggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  toggleItem: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  toggleItemActive: {
    backgroundColor: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
}));

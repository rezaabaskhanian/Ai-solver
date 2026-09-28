import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ViroARSceneNavigator, ViroARTrackingTargets } from '@reactvision/react-viro';

import { ArScene, type ArSceneAppProps } from '../../components/Ar/ArScene';
import { ArTrackingHint } from '../../components/Ar/ArTrackingHint';
import { FinalAnswerCard } from '../../components/Solution/FinalAnswerCard';
import { StepControls } from '../../components/StepViewer/StepControls';
import { StepProgressDots } from '../../components/StepViewer/StepProgressDots';
import { AppButton } from '../../components/common/AppButton';
import { useStepNavigation } from '../../hooks/useStepNavigation';
import type { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ArSolution'>;

// No ground truth for the physical size of an arbitrary page — this is a
// documented A4-width approximation. It only affects the AR content's
// scale, not whether the image target is detected.
const TARGET_PHYSICAL_WIDTH_METERS = 0.21;

// AR counterpart of SolutionScreen: same step data, same navigation hook
// and controls, but the current step is anchored live over the captured
// photo (ArScene) instead of laid out in a scrolling static list.
export function ArSolutionScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { photoUri, result } = route.params;
  const {
    currentIndex,
    isFirst,
    isLast,
    isPlaying,
    goToNext,
    goToPrevious,
    play,
    pause,
    replay,
  } = useStepNavigation(result.steps.length);
  const [tracking, setTracking] = useState(false);

  // Keyed by problem_id so repeated scans never collide on the same
  // target name.
  const targetName = `problem-${result.problem_id}`;

  useEffect(() => {
    ViroARTrackingTargets.createTargets({
      [targetName]: {
        source: { uri: photoUri },
        orientation: 'Up',
        physicalWidth: TARGET_PHYSICAL_WIDTH_METERS,
        type: 'Image',
      },
    });
    return () => ViroARTrackingTargets.deleteTarget(targetName);
  }, [targetName, photoUri]);

  const viroAppProps: ArSceneAppProps = useMemo(
    () => ({
      steps: result.steps,
      currentIndex,
      targetName,
      onTrackingChange: setTracking,
    }),
    [result.steps, currentIndex, targetName],
  );

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        style={StyleSheet.absoluteFill}
        autofocus
        // @reactvision/react-viro's own type for `scene` is overly strict
        // (`() => Element`, no params) even though ViroARSceneNavigator.js
        // always invokes it with `sceneNavigator`/`arSceneNavigator` props —
        // confirmed by reading its _renderSceneStackItems implementation.
        initialScene={{ scene: ArScene as () => React.JSX.Element }}
        viroAppProps={viroAppProps}
      />

      {!tracking && <ArTrackingHint />}

      <View style={styles.overlay}>
        {isLast ? (
          <>
            <FinalAnswerCard answer={result.answer} verified={result.verified} />
            <AppButton
              label={t('solution.done')}
              variant="primary"
              onPress={() => navigation.popToTop()}
            />
          </>
        ) : (
          <>
            <StepProgressDots total={result.steps.length} currentIndex={currentIndex} />
            <StepControls
              currentIndex={currentIndex}
              total={result.steps.length}
              isFirst={isFirst}
              isLast={isLast}
              isPlaying={isPlaying}
              onPrevious={goToPrevious}
              onNext={goToNext}
              onTogglePlay={isPlaying ? pause : play}
              onReplay={replay}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.md,
  },
});

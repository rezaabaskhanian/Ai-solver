import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useStepNavigation } from '../../hooks/useStepNavigation';
import type { SolutionStep } from '../../types/problem';
import { spacing } from '../../theme';
import { StepCard } from './StepCard';
import { StepControls } from './StepControls';
import { StepProgressDots } from './StepProgressDots';

interface StepViewerProps {
  steps: SolutionStep[];
}

export function StepViewer({ steps }: StepViewerProps) {
  const {
    currentIndex,
    playToken,
    isFirst,
    isLast,
    isPlaying,
    goToNext,
    goToPrevious,
    play,
    pause,
    replay,
  } = useStepNavigation(steps.length);

  if (steps.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StepProgressDots total={steps.length} currentIndex={currentIndex} />
      <StepCard step={steps[currentIndex]} playToken={playToken} />
      <StepControls
        currentIndex={currentIndex}
        total={steps.length}
        isFirst={isFirst}
        isLast={isLast}
        isPlaying={isPlaying}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onTogglePlay={isPlaying ? pause : play}
        onReplay={replay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});

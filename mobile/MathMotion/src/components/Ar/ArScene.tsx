import React from 'react';
import { ViroARImageMarker, ViroARScene } from '@reactvision/react-viro';

import type { SolutionStep } from '../../types/problem';
import { ArStepCard } from './ArStepCard';

// Dynamic data crosses into a Viro scene via viroAppProps (Viro scenes
// aren't part of the normal RN tree — see ArSolutionScreen). State
// changes cross back out the same way, via a callback placed inside
// this same object.
export interface ArSceneAppProps {
  steps: SolutionStep[];
  currentIndex: number;
  targetName: string;
  onTrackingChange: (found: boolean) => void;
}

interface ArSceneProps {
  sceneNavigator: {
    viroAppProps: ArSceneAppProps;
  };
}

export function ArScene({ sceneNavigator }: ArSceneProps) {
  const { steps, currentIndex, targetName, onTrackingChange } = sceneNavigator.viroAppProps;
  const step = steps[currentIndex];

  return (
    <ViroARScene>
      <ViroARImageMarker
        target={targetName}
        onAnchorFound={() => onTrackingChange(true)}
        onAnchorRemoved={() => onTrackingChange(false)}
      >
        {/* Keyed by step.id so it remounts (and replays its entrance
            animation) whenever the user moves to a different step. */}
        {step && <ArStepCard key={step.id} step={step} />}
      </ViroARImageMarker>
    </ViroARScene>
  );
}

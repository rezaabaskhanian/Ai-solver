import React from 'react';
import { ViroFlexView, ViroText } from '@reactvision/react-viro';

import type { SolutionStep } from '../../types/problem';
import { AR_STEP_FADE_SCALE_IN } from './arAnimations';
import { AR_STEP_CARD_MATERIAL } from './arMaterials';

interface ArStepCardProps {
  step: SolutionStep;
}

// AR equivalent of StepViewer/StepCard.tsx, built from Viro primitives —
// a Viro scene can't host plain RN Views/Text. Sits flush over the
// detected page (tiny z-offset avoids z-fighting with the marker plane)
// and fades/scales in via the entrance animation already registered in
// arAnimations.ts. Sizes are in meters (Viro's unit for AR content) and
// were picked by feel for an A4-ish page — see ArSolutionScreen's
// physicalWidth comment; expect these to need on-device tuning.
export function ArStepCard({ step }: ArStepCardProps) {
  return (
    <ViroFlexView
      position={[0, 0, 0.001]}
      width={0.22}
      height={0.14}
      opacity={0}
      scale={[0, 0, 0]}
      animation={{ name: AR_STEP_FADE_SCALE_IN, run: true }}
      materials={[AR_STEP_CARD_MATERIAL]}
      style={styles.card}
    >
      <ViroText text={step.before} style={styles.expression} />
      <ViroText text="↓" style={styles.arrow} />
      <ViroText text={step.after} style={styles.expressionEmphasized} />
      <ViroText text={step.explanation} style={styles.explanation} maxLines={2} />
    </ViroFlexView>
  );
}

const styles = {
  card: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 0.012,
  },
  expression: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center' as const,
  },
  expressionEmphasized: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
  },
  arrow: {
    fontSize: 10,
    color: '#B8BCD9',
    textAlign: 'center' as const,
  },
  explanation: {
    fontSize: 8,
    color: '#B8BCD9',
    textAlign: 'center' as const,
  },
};

import { ViroAnimations } from '@reactvision/react-viro';

// Registered once at module load. ArStepCard mounts a fresh ViroNode per
// step (keyed by step.id — see ArScene.tsx), starts it at opacity/scale
// 0, and runs "arStepFadeScaleIn" to animate it into place — the AR
// equivalent of PRD section 28's per-token fade/scale requirement,
// applied per-step rather than per-token given the scope of this pass.
ViroAnimations.registerAnimations({
  arStepFadeScaleIn: {
    duration: 350,
    easing: 'easeOut',
    properties: {
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    },
  },
});

export const AR_STEP_FADE_SCALE_IN = 'arStepFadeScaleIn';

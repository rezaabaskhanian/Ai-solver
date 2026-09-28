import { ViroMaterials } from '@reactvision/react-viro';

// Registered once at module load. Viro panels need a named material for
// a background fill (no plain backgroundColor style, unlike RN) — a
// dark, semi-transparent card so step text stays readable over any
// paper/background behind it.
ViroMaterials.createMaterials({
  arStepCardBackground: {
    lightingModel: 'Constant',
    diffuseColor: 'rgba(20,20,30,0.88)',
  },
});

export const AR_STEP_CARD_MATERIAL = 'arStepCardBackground';

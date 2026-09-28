// Single source of truth for the Animation Engine's step-reveal timing
// (PRD sections 14/15), shared between the visual staging in StepCard.tsx
// and the autoplay interval in useStepNavigation.ts so the two can never
// drift out of sync -- autoplay advancing to the next step before the
// current one has finished revealing would just look broken.
export const STAGE_GAP_MS = 260;
export const STAGE_DURATION_MS = 220;
// before -> arrow -> operation badge -> arrow -> after -> explanation
export const STAGE_COUNT = 6;
export const REVEAL_DURATION_MS = STAGE_GAP_MS * (STAGE_COUNT - 1) + STAGE_DURATION_MS;
// How long a fully-revealed step stays on screen during autoplay before
// advancing, on top of the time it took to reveal it.
const AUTOPLAY_HOLD_MS = 1800;
export const AUTOPLAY_STEP_MS = REVEAL_DURATION_MS + AUTOPLAY_HOLD_MS;

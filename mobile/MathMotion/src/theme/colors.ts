// Placeholder palette — minimal/modern/educational per PRD section 29.
// Swap this out freely once real UI/UX designs are ready; every screen
// reads colors from here, never hardcodes hex values.
export const colors = {
  background: '#F7F8FC',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F8',
  border: '#E2E5F1',

  textPrimary: '#1B1D29',
  textSecondary: '#5C6079',
  textInverse: '#FFFFFF',

  primary: '#4A5CF0',
  primaryPressed: '#3A49D6',
  primaryMuted: '#E4E7FD',

  success: '#1E9E6B',
  successMuted: '#DCF5EA',
  danger: '#E0435B',
  dangerMuted: '#FBE2E6',
  warning: '#C9821B',
  warningMuted: '#FBEEDA',

  overlay: 'rgba(27, 29, 41, 0.4)',
};

export type AppColors = typeof colors;

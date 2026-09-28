import { Platform } from 'react-native';

// Vazirmatn (the actively-maintained continuation of "Vazir") for Persian —
// linked via react-native.config.js from src/assets/fonts. The family
// strings below match the font files' own PostScript names, which is also
// how Android resolves an asset font by filename, so one name works on
// both platforms.
export const fontFamily = {
  fa: {
    regular: 'Vazirmatn-Regular',
    medium: 'Vazirmatn-Medium',
    bold: 'Vazirmatn-Bold',
  },
  en: {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  },
};

export type FontWeightKey = keyof typeof fontFamily.fa;

export function fontFamilyFor(language: 'fa' | 'en', weight: FontWeightKey): string {
  return fontFamily[language][weight] as string;
}

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
};

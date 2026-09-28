import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fa from './locales/fa.json';

export const SUPPORTED_LANGUAGES = ['en', 'fa'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// We deliberately do not flip I18nManager's native RTL flag: that only
// takes effect after an app restart in React Native, which is a jarring
// MVP experience. Instead, Farsi screens mirror text alignment and font
// per-component via useIsRTL()/fontFamilyFor() — see src/hooks/useIsRTL.ts.
// Revisit this once the real UI/UX design decides how far RTL mirroring
// should go (e.g. reversing navigation gestures too).
i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;

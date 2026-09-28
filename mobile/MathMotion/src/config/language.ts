import type { AppLanguage } from '../i18n';

// The Cafe Bazaar build ships Persian-only. The English translation
// (src/i18n/locales/en.json) is kept complete on purpose: a Google Play
// build is likely, and switching is just these two constants —
//   Google Play, English-only:   DEFAULT_LANGUAGE = 'en', LANGUAGE_SWITCH_ENABLED = false
//   Both languages, user picks:  LANGUAGE_SWITCH_ENABLED = true
export const DEFAULT_LANGUAGE: AppLanguage = 'fa';

// When false, the Home screen's language switch is hidden and any
// previously saved choice is ignored — everyone gets DEFAULT_LANGUAGE.
export const LANGUAGE_SWITCH_ENABLED = false;

import { useLanguageStore } from '../store/useLanguageStore';

// See src/i18n/index.ts for why this is a soft, per-component RTL mirror
// instead of flipping React Native's native I18nManager direction.
export function useIsRTL(): boolean {
  return useLanguageStore(state => state.language === 'fa');
}

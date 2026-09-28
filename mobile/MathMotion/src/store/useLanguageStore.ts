import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_LANGUAGE, LANGUAGE_SWITCH_ENABLED } from '../config/language';
import i18n, { type AppLanguage } from '../i18n';

interface LanguageState {
  language: AppLanguage;
  hasHydrated: boolean;
  setLanguage: (language: AppLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    set => ({
      language: DEFAULT_LANGUAGE,
      hasHydrated: false,
      setLanguage: language => {
        i18n.changeLanguage(language);
        set({ language });
      },
    }),
    {
      name: 'mathmotion.language',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        // With the switch hidden, a choice saved by an earlier build
        // (e.g. 'en' from before the app went Persian-only) must not
        // strand the user in a language they can no longer change.
        const language =
          LANGUAGE_SWITCH_ENABLED && state ? state.language : DEFAULT_LANGUAGE;
        i18n.changeLanguage(language);
        // Deferred until rehydration settles, so it's safe to reference
        // the store here even though this callback is created inline
        // inside the same `create()` call that defines it.
        useLanguageStore.setState({ language, hasHydrated: true });
      },
    },
  ),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { type AppLanguage } from '../i18n';

interface LanguageState {
  language: AppLanguage;
  hasHydrated: boolean;
  setLanguage: (language: AppLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    set => ({
      language: 'en',
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
        if (state) {
          i18n.changeLanguage(state.language);
        }
        // Deferred until rehydration settles, so it's safe to reference
        // the store here even though this callback is created inline
        // inside the same `create()` call that defines it.
        useLanguageStore.setState({ hasHydrated: true });
      },
    },
  ),
);

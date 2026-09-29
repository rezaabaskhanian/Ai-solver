import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AccentId, TextToneId, ThemeMode } from '../theme/colors';

interface ThemeState {
  mode: ThemeMode;
  accent: AccentId;
  textTone: TextToneId;
  hasHydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentId) => void;
  setTextTone: (textTone: TextToneId) => void;
  reset: () => void;
}

const DEFAULTS = {
  mode: 'light' as ThemeMode,
  accent: 'indigo' as AccentId,
  textTone: 'default' as TextToneId,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      ...DEFAULTS,
      hasHydrated: false,
      setMode: mode => set({ mode }),
      setAccent: accent => set({ accent }),
      setTextTone: textTone => set({ textTone }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'mathmotion.theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ mode, accent, textTone }) => ({ mode, accent, textTone }),
      onRehydrateStorage: () => () => {
        useThemeStore.setState({ hasHydrated: true });
      },
    },
  ),
);

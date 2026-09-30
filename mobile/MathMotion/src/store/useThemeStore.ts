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

// Lime is the brand color of the "MathMotion AI Study System" design.
const DEFAULTS = {
  mode: 'light' as ThemeMode,
  accent: 'lime' as AccentId,
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
      // v1: the default accent moved from indigo to lime. A saved indigo
      // was (almost always) just the old default, so move it along.
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Partial<ThemeState>;
        if (version < 1 && state.accent === 'indigo') {
          state.accent = 'lime';
        }
        return state as ThemeState;
      },
      partialize: ({ mode, accent, textTone }) => ({ mode, accent, textTone }),
      onRehydrateStorage: () => () => {
        useThemeStore.setState({ hasHydrated: true });
      },
    },
  ),
);

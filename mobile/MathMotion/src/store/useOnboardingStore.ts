import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  // True once the first-launch intro (OnboardingScreen) was dismissed.
  seen: boolean;
  hasHydrated: boolean;
  // Which auth form the intro's button asked for («شروع» → sign up,
  // «ورود به حساب» → log in); App.tsx hands it to AuthScreen.
  authMode: 'register' | 'login';
  complete: (authMode?: 'register' | 'login') => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    set => ({
      seen: false,
      hasHydrated: false,
      authMode: 'login',
      complete: (authMode = 'register') => set({ seen: true, authMode }),
    }),
    {
      name: 'mathmotion.onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ seen }) => ({ seen }),
      onRehydrateStorage: () => () => {
        useOnboardingStore.setState({ hasHydrated: true });
      },
    },
  ),
);

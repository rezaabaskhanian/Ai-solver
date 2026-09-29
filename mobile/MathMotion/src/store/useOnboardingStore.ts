import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  // True once the first-launch intro (OnboardingScreen) was dismissed.
  seen: boolean;
  hasHydrated: boolean;
  complete: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    set => ({
      seen: false,
      hasHydrated: false,
      complete: () => set({ seen: true }),
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

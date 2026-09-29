import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CurriculumGrade } from '../content/curriculum';

interface PreferencesState {
  // The student's school grade, picked on the Topics screen — also the
  // Exam setup's starting grade. null = "all topics" / not chosen yet.
  grade: CurriculumGrade | null;
  setGrade: (grade: CurriculumGrade | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      grade: null,
      setGrade: grade => set({ grade }),
    }),
    {
      name: 'mathmotion.preferences',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

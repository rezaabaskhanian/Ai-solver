import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CurriculumGrade } from '../content/curriculum';
import { DEFAULT_TRACK, isStudyTrack, type StudyTrack } from '../content/track';

interface PreferencesState {
  // The student's school grade, picked on the Topics screen — also the
  // Exam setup's starting grade. null = "all topics" / not chosen yet.
  grade: CurriculumGrade | null;
  setGrade: (grade: CurriculumGrade | null) => void;
  // The study track («رشته»), picked in onboarding and changeable in
  // Settings. Old stored data has no `track`: it falls back to riazi.
  track: StudyTrack;
  setTrack: (track: StudyTrack) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      grade: null,
      setGrade: grade => set({ grade }),
      track: DEFAULT_TRACK,
      setTrack: track => set({ track: isStudyTrack(track) ? track : DEFAULT_TRACK }),
    }),
    {
      name: 'mathmotion.preferences',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<PreferencesState>;
        return {
          ...current,
          ...stored,
          track: isStudyTrack(stored.track) ? stored.track : DEFAULT_TRACK,
        };
      },
    },
  ),
);

export function useTrack(): StudyTrack {
  return usePreferencesStore(s => (isStudyTrack(s.track) ? s.track : DEFAULT_TRACK));
}

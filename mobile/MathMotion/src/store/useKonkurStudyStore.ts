import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  emptyDaily,
  ensureDailyPick,
  parseDaily,
  recordDailyAnswer,
  setDailyGoal,
  type DailyState,
} from '../content/konkur/daily';
import { dayIndexOf } from '../content/konkur/dayIndex';
import type { KonkurContent } from '../content/konkur';
import { toggleId, type KonkurProgress } from '../content/konkur/progress';
import {
  emptyReview,
  parseReview,
  reviewAfterAnswer,
  type ReviewState,
} from '../content/konkur/review';

// Everything «مطالعه‌ی روزانه» keeps on this device, separate from the
// answers themselves (useKonkurProgressStore): the daily streak and goal,
// today's «تست روز», the spaced-review schedule and the bookmarked formula
// sheets. Pure logic is in content/konkur/{daily,review}.ts; whatever
// comes back from storage is re-validated there, so a corrupt value
// just starts fresh.

const STUDY_VERSION = 1;

interface StudyState {
  daily: DailyState;
  review: ReviewState;
  formulaBookmarks: string[];
  // Call after every answered question (KonkurQuestionCard).
  recordAnswer: (questionId: string, correct: boolean) => void;
  setGoal: (goal: number) => void;
  // Fixes today's «تست روز» (no-op when already chosen for today).
  ensureTodayPick: (content: KonkurContent, progress: KonkurProgress) => void;
  toggleFormulaBookmark: (chapterId: string) => void;
}

interface Persisted {
  daily: DailyState;
  review: ReviewState;
  formulaBookmarks: string[];
}

export const useKonkurStudyStore = create<StudyState>()(
  persist(
    set => ({
      daily: emptyDaily(),
      review: emptyReview(),
      formulaBookmarks: [],
      recordAnswer: (questionId, correct) =>
        set(state => {
          const now = Date.now();
          return {
            daily: recordDailyAnswer(state.daily, now),
            review: reviewAfterAnswer(state.review, questionId, correct, dayIndexOf(now)),
          };
        }),
      setGoal: goal => set(state => ({ daily: setDailyGoal(state.daily, goal) })),
      ensureTodayPick: (content, progress) =>
        set(state => {
          const next = ensureDailyPick(state.daily, content, progress, dayIndexOf(Date.now()));
          return next === state.daily ? state : { daily: next };
        }),
      toggleFormulaBookmark: chapterId =>
        set(state => ({ formulaBookmarks: toggleId(state.formulaBookmarks, chapterId) })),
    }),
    {
      name: 'mathmotion.konkur.study.v1',
      version: STUDY_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): Persisted => ({
        daily: state.daily,
        review: state.review,
        formulaBookmarks: state.formulaBookmarks,
      }),
      merge: (persisted, current) => {
        const saved = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<Persisted>;
        return {
          ...current,
          daily: parseDaily(saved.daily),
          review: parseReview(saved.review),
          formulaBookmarks: Array.isArray(saved.formulaBookmarks)
            ? Array.from(new Set(saved.formulaBookmarks.filter((x): x is string => typeof x === 'string' && x.length > 0)))
            : [],
        };
      },
    },
  ),
);

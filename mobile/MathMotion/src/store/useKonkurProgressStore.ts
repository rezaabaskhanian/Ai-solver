import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  PROGRESS_VERSION,
  appendAttemptLog,
  emptySyncExtras,
  parseProgress,
  parseSyncExtras,
  recordAttempt,
  stampBookmark,
  toggleId,
  type AttemptEntry,
  type KonkurProgress,
  type QuestionProgress,
  type SyncState,
} from '../content/konkur/progress';

// «پیشرفت من» in the Konkur section: the student's answers and bookmarks,
// on this device only. The pure logic lives in content/konkur/progress.ts;
// whatever comes back from storage is re-validated there, so a corrupt
// value just starts a fresh progress.
//
// attemptLog / bookmarkStamps are only for the server sync (merge, see
// content/konkur/progress.ts and services/konkurProgressSync.ts); readers
// of the progress use the three public fields and the hook below.

interface KonkurProgressState {
  questions: Record<string, QuestionProgress>;
  bookmarkedQuestions: string[];
  bookmarkedTips: string[];
  attemptLog: Record<string, AttemptEntry[]>;
  bookmarkStamps: Record<string, number>;
  // Replaces the progress with a merged copy (sync only).
  applySynced: (merged: SyncState) => void;
  recordAttempt: (questionId: string, choice: number, correct: boolean) => void;
  toggleQuestionBookmark: (questionId: string) => void;
  toggleTipBookmark: (tipId: string) => void;
}

export const useKonkurProgressStore = create<KonkurProgressState>()(
  persist(
    set => ({
      questions: {},
      bookmarkedQuestions: [],
      bookmarkedTips: [],
      ...emptySyncExtras(),
      applySynced: merged =>
        set({
          questions: merged.questions,
          bookmarkedQuestions: merged.bookmarkedQuestions,
          bookmarkedTips: merged.bookmarkedTips,
          attemptLog: merged.attemptLog,
          bookmarkStamps: merged.bookmarkStamps,
        }),
      recordAttempt: (questionId, choice, correct) =>
        set(state => {
          const now = Date.now();
          const next = recordAttempt(snapshotOf(state), questionId, choice, correct, now);
          return {
            questions: next.questions,
            attemptLog: appendAttemptLog(state.attemptLog, questionId, choice, correct, now),
          };
        }),
      toggleQuestionBookmark: questionId =>
        set(state => ({
          bookmarkedQuestions: toggleId(state.bookmarkedQuestions, questionId),
          bookmarkStamps: stampBookmark(state.bookmarkStamps, 'q', questionId, Date.now()),
        })),
      toggleTipBookmark: tipId =>
        set(state => ({
          bookmarkedTips: toggleId(state.bookmarkedTips, tipId),
          bookmarkStamps: stampBookmark(state.bookmarkStamps, 't', tipId, Date.now()),
        })),
    }),
    {
      name: 'mathmotion.konkur.progress.v1',
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        ...snapshotOf(state),
        attemptLog: state.attemptLog,
        bookmarkStamps: state.bookmarkStamps,
      }),
      merge: (persisted, current) => {
        const saved = parseProgress(persisted);
        const extras = parseSyncExtras(persisted);
        return {
          ...current,
          attemptLog: extras.attemptLog,
          bookmarkStamps: extras.bookmarkStamps,
          questions: saved.questions,
          bookmarkedQuestions: saved.bookmarkedQuestions,
          bookmarkedTips: saved.bookmarkedTips,
        };
      },
    },
  ),
);

function snapshotOf(state: KonkurProgressState): KonkurProgress {
  return {
    version: PROGRESS_VERSION,
    questions: state.questions,
    bookmarkedQuestions: state.bookmarkedQuestions,
    bookmarkedTips: state.bookmarkedTips,
  };
}

// For the pure helpers in content/konkur/progress.ts. Select the three
// fields separately so the object is only rebuilt when one changes.
export function useKonkurProgress(): KonkurProgress {
  const questions = useKonkurProgressStore(s => s.questions);
  const bookmarkedQuestions = useKonkurProgressStore(s => s.bookmarkedQuestions);
  const bookmarkedTips = useKonkurProgressStore(s => s.bookmarkedTips);
  return React.useMemo(
    () => ({ version: PROGRESS_VERSION, questions, bookmarkedQuestions, bookmarkedTips }),
    [questions, bookmarkedQuestions, bookmarkedTips],
  );
}

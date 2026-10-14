import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parseTextbookPayload, type TextbookExercise } from '../content/textbook';
import { fetchKonkurVersion } from '../services/api/konkur';
import { fetchTextbookPayload } from '../services/api/textbook';

// «تمرین‌های کتاب»: nothing is bundled — the exercises come from the
// server and the last copy is cached for offline use. Same version check
// as the konkur content (they share one version counter). Any failure
// keeps what we already have.

const CACHE_KEY = 'mathmotion.textbook.content.v1';
const REFRESH_THROTTLE_MS = 10 * 60 * 1000;

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface TextbookState {
  exercises: TextbookExercise[];
  version: number | null;
  status: Status;
  refresh: (force?: boolean) => Promise<void>;
}

let cacheLoaded: Promise<void> | null = null;
let lastCheckAt = 0;
let inFlight: Promise<void> | null = null;

export const useTextbookStore = create<TextbookState>()((set, get) => {
  const loadCache = (): Promise<void> => {
    if (!cacheLoaded) {
      cacheLoaded = (async () => {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (!raw) {
            return;
          }
          const parsed = JSON.parse(raw) as { version?: unknown; exercises?: unknown };
          const exercises = parseTextbookPayload(parsed);
          if (exercises && typeof parsed.version === 'number' && get().version === null) {
            set({ exercises, version: parsed.version, status: 'ready' });
          }
        } catch {
          // Corrupt or unavailable cache: wait for the server.
        }
      })();
    }
    return cacheLoaded;
  };

  return {
    exercises: [],
    version: null,
    status: 'idle',
    refresh: async (force = false) => {
      if (inFlight) {
        return inFlight;
      }
      if (!force && Date.now() - lastCheckAt < REFRESH_THROTTLE_MS) {
        return;
      }
      lastCheckAt = Date.now();
      inFlight = (async () => {
        try {
          await loadCache();
          if (get().status !== 'ready') {
            set({ status: 'loading' });
          }
          const serverVersion = await fetchKonkurVersion();
          if (typeof serverVersion === 'number' && serverVersion === get().version) {
            return;
          }
          const payload = await fetchTextbookPayload();
          const exercises = parseTextbookPayload(payload);
          if (!exercises || typeof payload.version !== 'number') {
            throw new Error('bad textbook payload');
          }
          set({ exercises, version: payload.version, status: 'ready' });
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ version: payload.version, exercises: payload.exercises }),
          );
        } catch {
          // Offline / server down: keep the cached copy, if any. Let the
          // next trigger retry soon instead of waiting out the throttle.
          lastCheckAt = 0;
          if (get().status !== 'ready') {
            set({ status: 'error' });
          }
        } finally {
          inFlight = null;
        }
      })();
      return inFlight;
    },
  };
});

// Loads the cached copy right away, then checks the server.
void useTextbookStore
  .getState()
  .refresh(true)
  .catch(() => undefined);

export function useTextbookExercises(): TextbookExercise[] {
  return useTextbookStore(s => s.exercises);
}

// Call from screens that show exercises; throttled inside the store.
export function refreshTextbook(force = false): void {
  void useTextbookStore.getState().refresh(force);
}

// Which exercises the student marked «فهمیدم» on this device.
interface TextbookProgressState {
  done: Record<string, true>;
  toggleDone: (id: string) => void;
}

export const useTextbookProgressStore = create<TextbookProgressState>()(
  persist(
    set => ({
      done: {},
      toggleDone: id =>
        set(state => {
          const done = { ...state.done };
          if (done[id]) {
            delete done[id];
          } else {
            done[id] = true;
          }
          return { done };
        }),
    }),
    {
      name: 'mathmotion.textbook.progress.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ done: state.done }),
      // A corrupt value just starts fresh.
      merge: (persisted, current) => {
        const p = persisted as { done?: unknown } | undefined;
        const done: Record<string, true> = {};
        if (p && typeof p.done === 'object' && p.done !== null) {
          for (const [k, v] of Object.entries(p.done)) {
            if (v === true) {
              done[k] = true;
            }
          }
        }
        return { ...current, done };
      },
    },
  ),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { BUNDLED_KONKUR_CONTENT, type KonkurContent } from '../content/konkur';
import { parseKonkurContent } from '../content/konkur/validate';
import { fetchKonkurPayload, fetchKonkurVersion } from '../services/api/konkur';

// «نکات کنکوری»: starts with the bundled content (synchronously), swaps
// in the cached server copy once AsyncStorage answers, then refreshes in
// the background when the server's version differs. Any failure keeps
// what we already have.

const CACHE_KEY = 'mathmotion.konkur.content.v1';
const REFRESH_THROTTLE_MS = 10 * 60 * 1000;

interface KonkurContentState {
  content: KonkurContent;
  version: number | null;
  source: 'bundled' | 'server';
  refresh: (force?: boolean) => Promise<void>;
}

let cacheLoaded: Promise<void> | null = null;
let lastCheckAt = 0;
let inFlight: Promise<void> | null = null;

export const useKonkurContentStore = create<KonkurContentState>()((set, get) => {
  const loadCache = (): Promise<void> => {
    if (!cacheLoaded) {
      cacheLoaded = (async () => {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (!raw) {
            return;
          }
          const parsed = JSON.parse(raw) as { version?: unknown; tips?: unknown; questions?: unknown };
          const content = parseKonkurContent(parsed);
          if (content && typeof parsed.version === 'number' && get().source === 'bundled') {
            set({ content, version: parsed.version, source: 'server' });
          }
        } catch {
          // Corrupt or unavailable cache: stay on bundled content.
        }
      })();
    }
    return cacheLoaded;
  };

  return {
    content: BUNDLED_KONKUR_CONTENT,
    version: null,
    source: 'bundled',
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
          const serverVersion = await fetchKonkurVersion();
          if (typeof serverVersion !== 'number' || serverVersion === get().version) {
            return;
          }
          const payload = await fetchKonkurPayload();
          const content = parseKonkurContent(payload);
          if (!content || typeof payload.version !== 'number') {
            return;
          }
          set({ content, version: payload.version, source: 'server' });
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ version: payload.version, tips: payload.tips, questions: payload.questions }),
          );
        } catch {
          // Offline / server down: silently keep what we have. Let the
          // next trigger retry soon instead of waiting out the throttle.
          lastCheckAt = 0;
        } finally {
          inFlight = null;
        }
      })();
      return inFlight;
    },
  };
});

// Loads the cached copy right away (before the first network check).
void useKonkurContentStore
  .getState()
  .refresh(true)
  .catch(() => undefined);

export function useKonkurContent(): KonkurContent {
  return useKonkurContentStore(s => s.content);
}

// Call from screens that show konkur content / on app foreground;
// throttled inside the store.
export function refreshKonkurContent(): void {
  void useKonkurContentStore.getState().refresh();
}

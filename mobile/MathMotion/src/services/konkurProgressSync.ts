import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  mergeProgress,
  parseSyncState,
  syncStateIsEmpty,
  toSyncDocument,
  type SyncState,
} from '../content/konkur/progress';
import { useAuthStore } from '../store/useAuthStore';
import { useKonkurProgressStore } from '../store/useKonkurProgressStore';
import { fetchProgress, pushProgress, type ProgressDoc } from './api/konkurProgress';

// Keeps the Konkur progress (store/useKonkurProgressStore.ts) in step with
// the server copy. Offline-safe and silent: every failure just leaves the
// local data as it is and a retry is scheduled. Nothing is ever replaced —
// whatever comes from the server is merged (content/konkur/progress.ts
// mergeProgress), so no attempt or bookmark is lost.
//
// The server identifies the user from the API client's headers (login
// token, else the device id), so this is only active when signed in.

const META_KEY = 'mathmotion.konkur.sync.v1';
const PUSH_DEBOUNCE_MS = 4000;
const RETRY_MS = 60000;
const MAX_DOC_BYTES = 480 * 1024;
const MAX_CONFLICT_ROUNDS = 3;

interface SyncMeta {
  owner: string | null;
  revision: number;
}

let meta: SyncMeta = { owner: null, revision: 0 };
let metaLoaded = false;
let started = false;
let running = false;
let rerun = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncedJson = '';
// True while a merged copy is being written into the store (not a user change).
let applying = false;

async function loadMeta() {
  if (metaLoaded) {
    return;
  }
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SyncMeta>) : {};
    meta = {
      owner: typeof parsed.owner === 'string' ? parsed.owner : null,
      revision: typeof parsed.revision === 'number' && parsed.revision >= 0 ? parsed.revision : 0,
    };
  } catch {
    meta = { owner: null, revision: 0 };
  }
  metaLoaded = true;
}

async function saveMeta() {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => {});
}

function currentState(): SyncState {
  const s = useKonkurProgressStore.getState();
  return parseSyncState({
    version: 1,
    questions: s.questions,
    bookmarkedQuestions: s.bookmarkedQuestions,
    bookmarkedTips: s.bookmarkedTips,
    attemptLog: s.attemptLog,
    bookmarkStamps: s.bookmarkStamps,
  });
}

function documentOf(state: SyncState): Record<string, unknown> {
  let doc = toSyncDocument(state);
  // Stay under the server's size cap: shorten the attempt logs first.
  if (JSON.stringify(doc).length > MAX_DOC_BYTES) {
    doc = toSyncDocument(state, 3);
  }
  return doc;
}

function applyRemote(remote: ProgressDoc): SyncState {
  const merged = mergeProgress(currentState(), parseSyncState(remote.data));
  applying = true;
  try {
    useKonkurProgressStore.getState().applySynced(merged);
  } finally {
    applying = false;
  }
  return merged;
}

function waitForHydration(): Promise<void> {
  const persist = useKonkurProgressStore.persist;
  if (persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const unsub = persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

function scheduleRetry() {
  schedulePush(RETRY_MS);
}

function schedulePush(delay: number = PUSH_DEBOUNCE_MS) {
  if (useAuthStore.getState().status !== 'signedIn') {
    return;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
  }
  pushTimer = setTimeout(() => {
    pushTimer = null;
    sync();
  }, delay);
}

// One full round: pull + merge, then push when the merged state differs
// from what the server last confirmed. Safe to call any time.
export async function sync(): Promise<void> {
  if (running) {
    rerun = true;
    return;
  }
  const user = useAuthStore.getState().user;
  if (useAuthStore.getState().status !== 'signedIn' || !user) {
    return;
  }
  running = true;
  try {
    await loadMeta();
    await waitForHydration();

    // Another account on this device: its progress is not this one's.
    if (meta.owner && meta.owner !== user.id) {
      applying = true;
      try {
        useKonkurProgressStore.getState().applySynced({
          version: 1,
          questions: {},
          bookmarkedQuestions: [],
          bookmarkedTips: [],
          attemptLog: {},
          bookmarkStamps: {},
        });
      } finally {
        applying = false;
      }
      meta = { owner: user.id, revision: 0 };
      lastSyncedJson = '';
      await saveMeta();
    }

    const remote = await fetchProgress();
    let merged = applyRemote(remote);
    meta = { owner: user.id, revision: remote.revision };

    let synced = false;
    for (let round = 0; round < MAX_CONFLICT_ROUNDS; round++) {
      const doc = documentOf(merged);
      const json = JSON.stringify(doc);
      const remoteJson = JSON.stringify(documentOf(parseSyncState(remote.data)));
      if (round === 0 && (json === remoteJson || (syncStateIsEmpty(merged) && meta.revision === 0))) {
        lastSyncedJson = json;
        synced = true;
        break;
      }
      const result = await pushProgress(meta.revision, doc);
      meta.revision = result.doc.revision;
      if (!result.conflict) {
        lastSyncedJson = json;
        synced = true;
        break;
      }
      merged = applyRemote(result.doc);
    }
    await saveMeta();
    if (!synced) {
      scheduleRetry();
    }
  } catch {
    // Offline or server trouble: keep the local data, try again later.
    scheduleRetry();
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      schedulePush(1000);
    }
  }
}

// Call once at app start (App.tsx). Pulls when the user is signed in (app
// start with a saved login, or a fresh login) and pushes — debounced — after
// every change to the progress.
export function startKonkurProgressSync() {
  if (started) {
    return;
  }
  started = true;

  useAuthStore.subscribe((state, prev) => {
    if (state.status === 'signedIn' && prev.status !== 'signedIn') {
      sync();
    }
  });
  if (useAuthStore.getState().status === 'signedIn') {
    sync();
  }

  useKonkurProgressStore.subscribe(() => {
    if (applying) {
      return;
    }
    if (running) {
      rerun = true;
      return;
    }
    const json = JSON.stringify(documentOf(currentState()));
    if (json !== lastSyncedJson) {
      schedulePush();
    }
  });
}

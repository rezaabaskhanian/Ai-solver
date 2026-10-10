import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

import { APP_VERSION } from '../../config/version';
import { apiClient } from '../api/client';
import { TelemetryQueue, type TelemetryEvent, type TelemetryKind } from './queue';

// Self-hosted error + usage reporting (backend: POST /api/v1/telemetry,
// admin panel tab «خطاها و آمار»). No third-party SDK. Collected: crashes and
// errors (name, message, stack), screen names, a few event names, app / OS
// version, platform and the (random) device id the API already uses. No phone
// numbers, tokens or typed math is ever sent. Every function here swallows
// its own errors — telemetry must never break the app.

const STORAGE_KEY = 'mathmotion.telemetry_queue';
const FLUSH_INTERVAL_MS = 30000;
const PERSIST_DELAY_MS = 1000;
// More than this many error-like events per minute are dropped (an error loop).
const MAX_ERRORS_PER_MINUTE = 20;
const SEND_TIMEOUT_MS = 10000;

const queue = new TelemetryQueue(AsyncStorage, STORAGE_KEY);

let initialized = false;
let currentScreen = '';
let lastTrackedScreen = '';
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let errorWindowStart = 0;
let errorsInWindow = 0;

async function sendBatch(batch: TelemetryEvent[]): Promise<void> {
  await apiClient.post('/api/v1/telemetry', { events: batch }, { timeout: SEND_TIMEOUT_MS });
}

/** Sends what is waiting (batches until empty or a failure). Never throws. */
export async function flushTelemetry(): Promise<void> {
  try {
    await queue.load();
    // Bounded loop: at most the whole queue in batches.
    for (let i = 0; i < 12; i++) {
      if ((await queue.flushOnce(sendBatch)) === 0) {
        break;
      }
    }
  } catch {
    // silent
  }
}

function schedulePersist() {
  if (persistTimer) {
    return;
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    queue.persist();
  }, PERSIST_DELAY_MS);
}

function record(kind: TelemetryKind, name: string, fields: Partial<TelemetryEvent> = {}) {
  try {
    if (kind === 'crash' || kind === 'error') {
      const now = Date.now();
      if (now - errorWindowStart > 60000) {
        errorWindowStart = now;
        errorsInWindow = 0;
      }
      errorsInWindow += 1;
      if (errorsInWindow > MAX_ERRORS_PER_MINUTE) {
        return;
      }
    }
    queue.add({
      kind,
      name,
      screen: currentScreen,
      app_version: APP_VERSION,
      platform: Platform.OS,
      os_version: String(Platform.Version),
      ts: Date.now(),
      ...fields,
    });
    if (kind === 'crash') {
      // The app may be about to die: save now, and try to send right away.
      queue.persist();
      flushTelemetry();
    } else {
      schedulePersist();
    }
  } catch {
    // silent
  }
}

function describe(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: error.message, stack: error.stack };
  }
  try {
    return { name: 'NonError', message: typeof error === 'string' ? error : JSON.stringify(error) };
  } catch {
    return { name: 'NonError', message: String(error) };
  }
}

/** A caught error worth knowing about (not shown to the user as a crash). */
export function recordError(error: unknown, context?: Record<string, unknown>): void {
  try {
    const { name, message, stack } = describe(error);
    record('error', name, { message, stack, extra: context });
  } catch {
    // silent
  }
}

/** An error that took the app (or a screen) down. */
export function recordCrash(error: unknown, context?: Record<string, unknown>): void {
  try {
    const { name, message, stack } = describe(error);
    record('crash', name, { message, stack, extra: context });
  } catch {
    // silent
  }
}

/** A usage event, e.g. trackEvent('exam_started', { count: 10 }). No PII. */
export function trackEvent(name: string, extra?: Record<string, unknown>): void {
  record('event', name, { extra });
}

/** A screen view; repeated reports of the same screen in a row are ignored. */
export function trackScreen(screen: string): void {
  try {
    if (!screen) {
      return;
    }
    currentScreen = screen;
    if (screen === lastTrackedScreen) {
      return;
    }
    lastTrackedScreen = screen;
    record('screen', screen, { screen });
  } catch {
    // silent
  }
}

type NavState = {
  index?: number;
  routes?: Array<{ name: string; state?: NavState }>;
};

/** The innermost active route name in a React Navigation state. */
export function activeRouteName(state: NavState | undefined): string {
  let current: NavState | undefined = state;
  let name = '';
  while (current && current.routes && current.routes.length > 0) {
    const route = current.routes[current.index ?? 0] ?? current.routes[0];
    name = route.name;
    current = route.state;
  }
  return name;
}

/** Call from NavigationContainer onReady / onStateChange. */
export function trackNavigationState(state: NavState | undefined): void {
  try {
    trackScreen(activeRouteName(state));
  } catch {
    // silent
  }
}

/** Installs the global handlers and the flush triggers. Safe to call twice. */
export function initTelemetry(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  try {
    // 1. Uncaught JS errors: record, then let the previous handler run
    //    (red box in dev, native crash in release).
    const errorUtils = (globalThis as any).ErrorUtils;
    if (errorUtils && typeof errorUtils.setGlobalHandler === 'function') {
      const previous = errorUtils.getGlobalHandler?.();
      errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        try {
          if (isFatal) {
            recordCrash(error, { fatal: true });
          } else {
            recordError(error, { fatal: false });
          }
        } catch {
          // silent
        }
        if (typeof previous === 'function') {
          previous(error, isFatal);
        }
      });
    }

    // 2. Unhandled promise rejections (Hermes). Left alone in dev so
    //    LogBox keeps its own warnings.
    const hermes = (globalThis as any).HermesInternal;
    if (!__DEV__ && hermes && typeof hermes.enablePromiseRejectionTracker === 'function') {
      hermes.enablePromiseRejectionTracker({
        allRejections: true,
        onUnhandled: (_id: number, error: unknown) => recordError(error, { unhandledRejection: true }),
      });
    }

    // 3. Flush triggers: start-up, foreground/background, every ~30s.
    flushTelemetry();
    AppState.addEventListener('change', state => {
      if (state === 'active' || state === 'background') {
        flushTelemetry();
      }
    });
    setInterval(flushTelemetry, FLUSH_INTERVAL_MS);
  } catch {
    // silent
  }
}

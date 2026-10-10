// The telemetry queue: events wait here (memory + persisted storage) until
// they're sent in batches. Pure logic with injected storage / clock so it can
// be unit tested; the wiring to the network is in ./index.ts.
// Nothing in this file may throw into the app.

export type TelemetryKind = 'crash' | 'error' | 'screen' | 'event';

export type TelemetryEvent = {
  kind: TelemetryKind;
  name: string;
  message?: string;
  stack?: string;
  screen?: string;
  app_version?: string;
  platform?: string;
  os_version?: string;
  extra?: Record<string, unknown>;
  // When it happened on the device (unix ms).
  ts: number;
};

export type QueueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export const MAX_QUEUE = 200;
export const BATCH_SIZE = 20;
const BASE_BACKOFF_MS = 5000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

export class TelemetryQueue {
  private events: TelemetryEvent[] = [];
  private failures = 0;
  private retryAt = 0;
  private sending = false;
  private loaded = false;

  constructor(
    private readonly storage: QueueStorage,
    private readonly storageKey: string,
    private readonly now: () => number = Date.now,
    private readonly maxSize: number = MAX_QUEUE,
  ) {}

  /** Loads what a previous run left behind (older events go first). */
  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    try {
      const raw = await this.storage.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stored = parsed.filter(
          (e): e is TelemetryEvent => !!e && typeof e === 'object' && typeof e.kind === 'string',
        );
        this.events = [...stored, ...this.events].slice(-this.maxSize);
      }
    } catch {
      // A corrupt or unreadable queue is just dropped.
    }
  }

  add(event: TelemetryEvent): void {
    try {
      this.events.push(event);
      if (this.events.length > this.maxSize) {
        // The newest are the most useful: drop the oldest.
        this.events.splice(0, this.events.length - this.maxSize);
      }
    } catch {
      // never throw
    }
  }

  get size(): number {
    return this.events.length;
  }

  snapshot(): TelemetryEvent[] {
    return this.events.slice();
  }

  /** True when a send may start now (not already sending, not backing off). */
  canSend(): boolean {
    return !this.sending && this.events.length > 0 && this.now() >= this.retryAt;
  }

  /** Milliseconds until the next send is allowed (0 = now). */
  backoffRemaining(): number {
    return Math.max(0, this.retryAt - this.now());
  }

  async persist(): Promise<void> {
    try {
      await this.storage.setItem(this.storageKey, JSON.stringify(this.events));
    } catch {
      // storage full / unavailable: memory still works
    }
  }

  /**
   * Sends one batch with `send`. The batch leaves the queue only when `send`
   * resolves; on failure it stays and the next attempt is delayed with an
   * exponential backoff. Resolves to the number of events sent. Never rejects.
   */
  async flushOnce(send: (batch: TelemetryEvent[]) => Promise<void>): Promise<number> {
    if (!this.canSend()) {
      return 0;
    }
    this.sending = true;
    const batch = this.events.slice(0, BATCH_SIZE);
    try {
      await send(batch);
      // Remove exactly the sent events (new ones may have been added, and
      // the cap may have dropped some of the oldest meanwhile).
      const sent = new Set(batch);
      this.events = this.events.filter(e => !sent.has(e));
      this.failures = 0;
      this.retryAt = 0;
      await this.persist();
      return batch.length;
    } catch {
      this.failures += 1;
      const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (this.failures - 1));
      this.retryAt = this.now() + delay;
      await this.persist();
      return 0;
    } finally {
      this.sending = false;
    }
  }
}

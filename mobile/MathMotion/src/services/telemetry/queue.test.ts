import { BATCH_SIZE, MAX_QUEUE, TelemetryQueue, type QueueStorage, type TelemetryEvent } from './queue';

function memoryStorage(initial?: string): QueueStorage & { data: Record<string, string> } {
  const data: Record<string, string> = initial ? { k: initial } : {};
  return {
    data,
    getItem: async key => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

const ev = (name: string): TelemetryEvent => ({ kind: 'event', name, ts: 1 });

describe('TelemetryQueue', () => {
  it('caps the queue and drops the oldest events', () => {
    const q = new TelemetryQueue(memoryStorage(), 'k');
    for (let i = 0; i < MAX_QUEUE + 10; i++) {
      q.add(ev(`e${i}`));
    }
    expect(q.size).toBe(MAX_QUEUE);
    expect(q.snapshot()[0].name).toBe('e10');
  });

  it('sends in batches and removes only what was sent', async () => {
    const q = new TelemetryQueue(memoryStorage(), 'k');
    for (let i = 0; i < BATCH_SIZE + 5; i++) {
      q.add(ev(`e${i}`));
    }
    const send = jest.fn().mockResolvedValue(undefined);
    expect(await q.flushOnce(send)).toBe(BATCH_SIZE);
    expect(send.mock.calls[0][0]).toHaveLength(BATCH_SIZE);
    expect(q.size).toBe(5);
    expect(await q.flushOnce(send)).toBe(5);
    expect(q.size).toBe(0);
  });

  it('keeps events and backs off when sending fails, then recovers', async () => {
    let now = 1000;
    const q = new TelemetryQueue(memoryStorage(), 'k', () => now);
    q.add(ev('a'));
    const failing = jest.fn().mockRejectedValue(new Error('offline'));
    expect(await q.flushOnce(failing)).toBe(0);
    expect(q.size).toBe(1);
    expect(q.canSend()).toBe(false);
    expect(q.backoffRemaining()).toBeGreaterThan(0);
    // still backing off: send is not even attempted
    expect(await q.flushOnce(failing)).toBe(0);
    expect(failing).toHaveBeenCalledTimes(1);
    now += 10 * 60 * 1000;
    expect(q.canSend()).toBe(true);
    const ok = jest.fn().mockResolvedValue(undefined);
    expect(await q.flushOnce(ok)).toBe(1);
    expect(q.size).toBe(0);
  });

  it('persists and reloads, older events first', async () => {
    const storage = memoryStorage();
    const q1 = new TelemetryQueue(storage, 'k');
    q1.add(ev('old'));
    await q1.persist();
    const q2 = new TelemetryQueue(storage, 'k');
    q2.add(ev('new'));
    await q2.load();
    expect(q2.snapshot().map(e => e.name)).toEqual(['old', 'new']);
  });

  it('ignores corrupt stored data', async () => {
    const q = new TelemetryQueue(memoryStorage('{not json'), 'k');
    await expect(q.load()).resolves.toBeUndefined();
    expect(q.size).toBe(0);
  });

  it('never throws when storage fails', async () => {
    const broken: QueueStorage = {
      getItem: async () => {
        throw new Error('x');
      },
      setItem: async () => {
        throw new Error('x');
      },
    };
    const q = new TelemetryQueue(broken, 'k');
    await expect(q.load()).resolves.toBeUndefined();
    q.add(ev('a'));
    await expect(q.flushOnce(async () => undefined)).resolves.toBe(1);
  });
});

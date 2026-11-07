import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchAllPaperStats } from '../api/konkurProgress';
import type { PaperSummary } from '../api/konkurProgress';
import { loadPaperStats, MIN_PARTICIPANTS_SHOWN, paperStatsMap } from './paperStats';

// The API module drags in axios + device storage; only the fetch itself is
// under test here, so it is replaced wholesale.
jest.mock('../api/konkurProgress', () => ({
  fetchAllPaperStats: jest.fn(),
}));

const row = (paper_key: string, count: number, mean: number): PaperSummary => ({ paper_key, count, mean });

function mockFetch(): jest.Mock {
  return fetchAllPaperStats as jest.Mock;
}

beforeEach(async () => {
  mockFetch().mockReset();
  await AsyncStorage.clear();
});

describe('paperStatsMap', () => {
  it('indexes the rows by paper_key', () => {
    const map = paperStatsMap([row('riazi-1403-r1', 12, 63.4), row('riazi-1402-r2', 8, 51)]);
    expect(map.get('riazi-1403-r1')).toEqual(row('riazi-1403-r1', 12, 63.4));
    expect(map.get('riazi-1402-r2')).toEqual(row('riazi-1402-r2', 8, 51));
    expect(map.size).toBe(2);
  });

  it('drops papers below the participant minimum', () => {
    const map = paperStatsMap([row('big', MIN_PARTICIPANTS_SHOWN, 40), row('small', MIN_PARTICIPANTS_SHOWN - 1, 40)]);
    expect(map.has('big')).toBe(true);
    expect(map.has('small')).toBe(false);
  });

  it('mirrors the server sample minimum (privacy)', () => {
    expect(MIN_PARTICIPANTS_SHOWN).toBe(5);
  });
});

describe('loadPaperStats', () => {
  it('caches between calls and refetches on force', async () => {
    mockFetch().mockResolvedValue([row('riazi-1403-r1', 12, 63)]);
    await loadPaperStats();
    await loadPaperStats();
    expect(mockFetch()).toHaveBeenCalledTimes(1);
    await loadPaperStats(true);
    expect(mockFetch()).toHaveBeenCalledTimes(2);
  });

  it('refetches once the TTL has passed', async () => {
    mockFetch().mockResolvedValue([row('riazi-1403-r1', 12, 63)]);
    await loadPaperStats();
    // 16 minutes later the cache is stale (TTL is 15 minutes).
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockImplementation(() => now + 16 * 60 * 1000);
    try {
      await loadPaperStats();
    } finally {
      spy.mockRestore();
    }
    expect(mockFetch()).toHaveBeenCalledTimes(2);
  });

  it('shares one request between concurrent callers', async () => {
    // The gate is created up front, so resolving it before the fetch is
    // invoked (readCache awaits first) is safe and deterministic.
    let resolveFetch!: (rows: PaperSummary[]) => void;
    const gate = new Promise<PaperSummary[]>(resolve => { resolveFetch = resolve; });
    mockFetch().mockImplementation(() => gate);
    const first = loadPaperStats();
    const second = loadPaperStats();
    resolveFetch([row('riazi-1403-r1', 12, 63)]);
    expect(await first).toEqual([row('riazi-1403-r1', 12, 63)]);
    expect(await second).toEqual([row('riazi-1403-r1', 12, 63)]);
    expect(mockFetch()).toHaveBeenCalledTimes(1);
  });

  it('returns [] offline without caching the failure', async () => {
    mockFetch().mockRejectedValueOnce(new Error('offline'));
    expect(await loadPaperStats()).toEqual([]);
    mockFetch().mockResolvedValueOnce([row('riazi-1403-r1', 12, 63)]);
    // The failed attempt must not have been cached as "done".
    expect(await loadPaperStats()).toEqual([row('riazi-1403-r1', 12, 63)]);
  });
});

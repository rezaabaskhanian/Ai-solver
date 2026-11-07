import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchAllPaperStats, type PaperSummary } from '../api/konkurProgress';

// User averages for the konkur exam list: fetched once per session and
// cached in AsyncStorage with a TTL, so opening the screen usually costs
// no request. The server already omits papers with fewer than
// MIN_PARTICIPANTS_SHOWN participants; the filter here is defense in
// depth (and keeps the pure helper testable without a server).

const CACHE_KEY = 'paper_stats_cache_v1';
const TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  fetchedAt: number;
  rows: PaperSummary[];
}

// Mirrors the server's MinStatsSample: below this the average is hidden
// so a near-single user's score cannot leak through it.
export const MIN_PARTICIPANTS_SHOWN = 5;

let inflight: Promise<PaperSummary[]> | null = null;

// rows → paper_key → row, dropping small papers.
export function paperStatsMap(rows: PaperSummary[]): Map<string, PaperSummary> {
  const map = new Map<string, PaperSummary>();
  for (const row of rows) {
    if (row.count >= MIN_PARTICIPANTS_SHOWN) {
      map.set(row.paper_key, row);
    }
  }
  return map;
}

// The cached list when it is fresh enough, else null.
async function readCache(): Promise<PaperSummary[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.fetchedAt >= TTL_MS || !Array.isArray(entry.rows)) {
      return null;
    }
    return entry.rows;
  } catch {
    return null;
  }
}

async function writeCache(rows: PaperSummary[]): Promise<void> {
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), rows };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // A full or broken store: averages are a nice-to-have, not a must.
  }
}

// Fetches the per-paper averages (cached for TTL_MS); concurrent callers
// share one request. Offline → [] (the list just shows no averages).
export async function loadPaperStats(force = false): Promise<PaperSummary[]> {
  if (!force) {
    const cached = await readCache();
    if (cached) {
      return cached;
    }
  }
  if (!inflight) {
    inflight = fetchAllPaperStats()
      .then(async rows => {
        await writeCache(rows);
        return rows;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch {
    return [];
  }
}

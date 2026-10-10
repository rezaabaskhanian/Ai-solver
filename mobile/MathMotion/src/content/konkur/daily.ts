import type { KonkurContent, KonkurQuestion } from './index';
import { dayIndexOf } from './dayIndex';
import { weakTips, type KonkurProgress } from './progress';

// «تست روز», the streak and the daily goal. Pure logic — no React, no
// storage; store/useKonkurStudyStore.ts only persists what comes back.
//
// Days are LOCAL calendar days (dayIndexOf). The streak is computed from
// per-day answer counts, so a timezone change or a clock set back can
// never break the arithmetic: a day is just a key that has a count.

export const DAILY_VERSION = 1;
export const DEFAULT_DAILY_GOAL = 5;
export const MIN_DAILY_GOAL = 1;
export const MAX_DAILY_GOAL = 50;
// Counts older than this many days are dropped (the longest streak is
// kept separately, so pruning never lowers it).
const KEEP_DAYS = 400;

export interface DailyState {
  version: typeof DAILY_VERSION;
  goal: number;
  // Answers given per local day: key = String(day index).
  counts: Record<string, number>;
  // Highest streak ever reached.
  longestStreak: number;
  // Today's «تست روز», fixed for the day once picked.
  pick: { day: number; questionId: string } | null;
}

export function emptyDaily(): DailyState {
  return { version: DAILY_VERSION, goal: DEFAULT_DAILY_GOAL, counts: {}, longestStreak: 0, pick: null };
}

export function clampGoal(goal: number): number {
  if (!Number.isFinite(goal)) {
    return DEFAULT_DAILY_GOAL;
  }
  return Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, Math.round(goal)));
}

export function answeredOnDay(state: DailyState, day: number): number {
  return state.counts[String(day)] ?? 0;
}

// Consecutive days with at least one answer, counted back from today.
// Today having no answer yet does not break the streak (the day isn't
// over) — it then counts back from yesterday. Days after `today` (the
// clock was set back) are ignored.
export function currentStreak(state: DailyState, today: number): number {
  let day = answeredOnDay(state, today) > 0 ? today : today - 1;
  let streak = 0;
  while (answeredOnDay(state, day) > 0) {
    streak += 1;
    day -= 1;
  }
  return streak;
}

function longestRun(counts: Record<string, number>): number {
  const days = Object.keys(counts)
    .filter(k => counts[k] > 0)
    .map(Number)
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = 0;
  days.forEach((day, i) => {
    run = i > 0 && day === prev + 1 ? run + 1 : 1;
    prev = day;
    best = Math.max(best, run);
  });
  return best;
}

export function longestStreak(state: DailyState, today: number): number {
  return Math.max(state.longestStreak, longestRun(state.counts), currentStreak(state, today));
}

// One more answered question on the day of `now`.
export function recordDailyAnswer(state: DailyState, now: number): DailyState {
  const today = dayIndexOf(now);
  const key = String(today);
  const counts: Record<string, number> = { ...state.counts, [key]: (state.counts[key] ?? 0) + 1 };
  for (const k of Object.keys(counts)) {
    if (Number(k) < today - KEEP_DAYS) {
      delete counts[k];
    }
  }
  const next: DailyState = { ...state, counts };
  return { ...next, longestStreak: Math.max(state.longestStreak, currentStreak(next, today)) };
}

export function setDailyGoal(state: DailyState, goal: number): DailyState {
  return { ...state, goal: clampGoal(goal) };
}

export interface GoalProgress {
  done: number;
  goal: number;
  // 0-1, capped at 1.
  fraction: number;
  reached: boolean;
}

export function goalProgress(state: DailyState, today: number): GoalProgress {
  const done = answeredOnDay(state, today);
  const goal = clampGoal(state.goal);
  return { done, goal, fraction: Math.min(1, done / goal), reached: done >= goal };
}

// Small deterministic integer hash (no Math.random: the same day always
// gives the same pick).
function seededIndex(seed: number, length: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % length;
}

// The day's question: a real exam question when the content has any,
// preferring (1) topics the student is weak in and has not yet answered
// right, then (2) questions never tried, then (3) anything. `content` is
// the student's track content, so the pick is always their track's.
export function pickDailyQuestion(
  content: KonkurContent,
  progress: KonkurProgress,
  today: number,
): KonkurQuestion | null {
  const real = content.questions.filter(q => q.source.kind === 'konkur');
  const pool = (real.length > 0 ? real : content.questions).slice().sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0) {
    return null;
  }
  const weakIds = new Set(weakTips(progress, content).map(entry => entry.tip.id));
  const tiers: KonkurQuestion[][] = [
    pool.filter(q => q.tipIds.some(id => weakIds.has(id)) && !progress.questions[q.id]?.lastCorrect),
    pool.filter(q => !progress.questions[q.id]),
    pool,
  ];
  const tier = tiers.find(list => list.length > 0) ?? pool;
  return tier[seededIndex(today, tier.length)];
}

// Fixes today's pick once: returns the same state when today's pick is
// already stored and still exists in the content.
export function ensureDailyPick(
  state: DailyState,
  content: KonkurContent,
  progress: KonkurProgress,
  today: number,
): DailyState {
  if (state.pick && state.pick.day === today && content.questions.some(q => q.id === state.pick!.questionId)) {
    return state;
  }
  const question = pickDailyQuestion(content, progress, today);
  return question ? { ...state, pick: { day: today, questionId: question.id } } : state;
}

// Stored data is untrusted: bad counts are dropped one by one; a wholly
// corrupt value (or another version) starts fresh.
export function parseDaily(raw: unknown): DailyState {
  if (!raw || typeof raw !== 'object') {
    return emptyDaily();
  }
  const r = raw as Record<string, unknown>;
  if (r.version !== DAILY_VERSION) {
    return emptyDaily();
  }
  const counts: Record<string, number> = {};
  if (r.counts && typeof r.counts === 'object' && !Array.isArray(r.counts)) {
    for (const [key, value] of Object.entries(r.counts as Record<string, unknown>)) {
      if (/^-?\d+$/.test(key) && typeof value === 'number' && Number.isFinite(value) && value > 0) {
        counts[key] = Math.floor(value);
      }
    }
  }
  const pickRaw = r.pick as Record<string, unknown> | null | undefined;
  const pick =
    pickRaw &&
    typeof pickRaw === 'object' &&
    typeof pickRaw.day === 'number' &&
    Number.isInteger(pickRaw.day) &&
    typeof pickRaw.questionId === 'string' &&
    pickRaw.questionId.length > 0
      ? { day: pickRaw.day, questionId: pickRaw.questionId }
      : null;
  return {
    version: DAILY_VERSION,
    goal: typeof r.goal === 'number' ? clampGoal(r.goal) : DEFAULT_DAILY_GOAL,
    counts,
    longestStreak:
      typeof r.longestStreak === 'number' && Number.isFinite(r.longestStreak) && r.longestStreak > 0
        ? Math.floor(r.longestStreak)
        : 0,
    pick,
  };
}

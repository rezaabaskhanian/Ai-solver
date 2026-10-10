import type { KonkurContent, KonkurQuestion, KonkurTip } from './index';

// Pure logic behind the local «پیشرفت من» of the Konkur section: no
// React, no storage — the zustand store (store/useKonkurProgressStore.ts)
// only persists what these functions return.

export const PROGRESS_VERSION = 1;

// A tip with at least this many attempts and a lower percent is «ضعیف».
export const WEAK_MIN_ATTEMPTS = 3;
export const WEAK_BELOW_PERCENT = 50;

export interface QuestionProgress {
  attempts: number;
  correctAttempts: number;
  // The latest pick (0-3) and whether it was right.
  lastChoice: number;
  lastCorrect: boolean;
  firstCorrect: boolean;
  firstAt: number;
  lastAt: number;
}

export interface KonkurProgress {
  version: typeof PROGRESS_VERSION;
  questions: Record<string, QuestionProgress>;
  bookmarkedQuestions: string[];
  bookmarkedTips: string[];
}

export function emptyProgress(): KonkurProgress {
  return { version: PROGRESS_VERSION, questions: {}, bookmarkedQuestions: [], bookmarkedTips: [] };
}

export function recordAttempt(
  progress: KonkurProgress,
  questionId: string,
  choice: number,
  correct: boolean,
  now: number = Date.now(),
): KonkurProgress {
  const prev = progress.questions[questionId];
  const next: QuestionProgress = prev
    ? {
        ...prev,
        attempts: prev.attempts + 1,
        correctAttempts: prev.correctAttempts + (correct ? 1 : 0),
        lastChoice: choice,
        lastCorrect: correct,
        lastAt: now,
      }
    : {
        attempts: 1,
        correctAttempts: correct ? 1 : 0,
        lastChoice: choice,
        lastCorrect: correct,
        firstCorrect: correct,
        firstAt: now,
        lastAt: now,
      };
  return { ...progress, questions: { ...progress.questions, [questionId]: next } };
}

// Adds the id when missing, removes it when present.
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function parseQuestionProgress(raw: unknown): QuestionProgress | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (
    !isCount(r.attempts) ||
    r.attempts < 1 ||
    !isCount(r.correctAttempts) ||
    r.correctAttempts > r.attempts ||
    typeof r.lastChoice !== 'number' ||
    ![0, 1, 2, 3].includes(r.lastChoice) ||
    typeof r.lastCorrect !== 'boolean' ||
    typeof r.firstCorrect !== 'boolean' ||
    !isCount(r.firstAt) ||
    !isCount(r.lastAt)
  ) {
    return null;
  }
  return {
    attempts: r.attempts,
    correctAttempts: r.correctAttempts,
    lastChoice: r.lastChoice,
    lastCorrect: r.lastCorrect,
    firstCorrect: r.firstCorrect,
    firstAt: r.firstAt,
    lastAt: r.lastAt,
  };
}

function parseIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return Array.from(new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0)));
}

// Anything stored is untrusted: bad entries are dropped one by one, and
// a wholly corrupt value (or another version) gives an empty progress.
export function parseProgress(raw: unknown): KonkurProgress {
  if (!raw || typeof raw !== 'object') {
    return emptyProgress();
  }
  const r = raw as Record<string, unknown>;
  if (r.version !== PROGRESS_VERSION) {
    return emptyProgress();
  }
  const questions: Record<string, QuestionProgress> = {};
  if (r.questions && typeof r.questions === 'object' && !Array.isArray(r.questions)) {
    for (const [id, value] of Object.entries(r.questions as Record<string, unknown>)) {
      const parsed = parseQuestionProgress(value);
      if (parsed) {
        questions[id] = parsed;
      }
    }
  }
  return {
    version: PROGRESS_VERSION,
    questions,
    bookmarkedQuestions: parseIds(r.bookmarkedQuestions),
    bookmarkedTips: parseIds(r.bookmarkedTips),
  };
}

// Progress is kept for ids that vanished from the content (it may only be
// the bundled fallback for now), but never shown or counted.
function questionById(content: KonkurContent): Map<string, KonkurQuestion> {
  return new Map(content.questions.map(q => [q.id, q]));
}

// Questions whose latest attempt was wrong, most recently missed first.
export function mistakesOf(progress: KonkurProgress, content: KonkurContent): KonkurQuestion[] {
  const byId = questionById(content);
  return Object.entries(progress.questions)
    .filter(([id, p]) => !p.lastCorrect && byId.has(id))
    .sort((a, b) => b[1].lastAt - a[1].lastAt)
    .map(([id]) => byId.get(id)!);
}

export function bookmarkedQuestionsOf(progress: KonkurProgress, content: KonkurContent): KonkurQuestion[] {
  const byId = questionById(content);
  return progress.bookmarkedQuestions.map(id => byId.get(id)).filter((q): q is KonkurQuestion => !!q);
}

export function bookmarkedTipsOf(progress: KonkurProgress, content: KonkurContent): KonkurTip[] {
  const byId = new Map(content.tips.map(t => [t.id, t]));
  return progress.bookmarkedTips.map(id => byId.get(id)).filter((t): t is KonkurTip => !!t);
}

export interface QuestionGroup {
  tip: KonkurTip;
  questions: KonkurQuestion[];
}

// Groups by each question's main tip (the first of tipIds), keeping the
// order in which the groups first appear.
export function groupByMainTip(questions: KonkurQuestion[], content: KonkurContent): QuestionGroup[] {
  const tipById = new Map(content.tips.map(t => [t.id, t]));
  const groups = new Map<string, QuestionGroup>();
  for (const q of questions) {
    const tip = tipById.get(q.tipIds[0]);
    if (!tip) {
      continue;
    }
    const group = groups.get(tip.id) ?? { tip, questions: [] };
    group.questions.push(q);
    groups.set(tip.id, group);
  }
  return Array.from(groups.values());
}

export interface TopicStats {
  totalQuestions: number;
  // Distinct questions tried at least once.
  answeredQuestions: number;
  attempts: number;
  correctAttempts: number;
  // Share of correct attempts, 0-100; null before any attempt.
  percent: number | null;
  weak: boolean;
}

// Stats over any set of questions (a tip's, or a chapter's — duplicates
// by id are counted once).
export function statsForQuestions(progress: KonkurProgress, questions: KonkurQuestion[]): TopicStats {
  const seen = new Set<string>();
  let answeredQuestions = 0;
  let attempts = 0;
  let correctAttempts = 0;
  for (const q of questions) {
    if (seen.has(q.id)) {
      continue;
    }
    seen.add(q.id);
    const p = progress.questions[q.id];
    if (p) {
      answeredQuestions += 1;
      attempts += p.attempts;
      correctAttempts += p.correctAttempts;
    }
  }
  const percent = attempts > 0 ? Math.round((correctAttempts / attempts) * 100) : null;
  return {
    totalQuestions: seen.size,
    answeredQuestions,
    attempts,
    correctAttempts,
    percent,
    weak: percent !== null && attempts >= WEAK_MIN_ATTEMPTS && percent < WEAK_BELOW_PERCENT,
  };
}

function questionsOfTip(tipId: string, content: KonkurContent): KonkurQuestion[] {
  return content.questions.filter(q => q.tipIds.includes(tipId));
}

export function statsForTip(progress: KonkurProgress, tipId: string, content: KonkurContent): TopicStats {
  return statsForQuestions(progress, questionsOfTip(tipId, content));
}

export function statsForChapter(progress: KonkurProgress, chapterId: string, content: KonkurContent): TopicStats {
  const tipIds = new Set(content.tips.filter(t => t.chapterId === chapterId).map(t => t.id));
  return statsForQuestions(
    progress,
    content.questions.filter(q => q.tipIds.some(id => tipIds.has(id))),
  );
}

// Tips the student struggles with, weakest first.
export function weakTips(progress: KonkurProgress, content: KonkurContent): { tip: KonkurTip; stats: TopicStats }[] {
  return content.tips
    .map(tip => ({ tip, stats: statsForTip(progress, tip.id, content) }))
    .filter(entry => entry.stats.weak)
    .sort((a, b) => (a.stats.percent ?? 0) - (b.stats.percent ?? 0));
}

// ---------------------------------------------------------------------
// Sync (server copy of the progress, see store/useKonkurProgressStore.ts
// and services/konkurProgressSync.ts). The shape of KonkurProgress above
// is untouched; everything the merge additionally needs lives in
// SyncExtras, kept next to it in the same stored/synced document:
//  - attemptLog: the latest attempts per question as [at, choice, correct]
//    tuples, so two devices' attempts can be unioned by (questionId, at);
//  - bookmarkStamps: when each bookmark was last toggled ("q:<id>" /
//    "t:<id>" -> ms), so removing a bookmark isn't undone by the merge.
// ---------------------------------------------------------------------

export const ATTEMPT_LOG_PER_QUESTION = 10;

// [at (ms), choice (0-3), correct (1 | 0)]
export type AttemptEntry = [number, number, number];

export interface SyncExtras {
  attemptLog: Record<string, AttemptEntry[]>;
  bookmarkStamps: Record<string, number>;
}

export type SyncState = KonkurProgress & SyncExtras;

export function emptySyncExtras(): SyncExtras {
  return { attemptLog: {}, bookmarkStamps: {} };
}

export function emptySyncState(): SyncState {
  return { ...emptyProgress(), ...emptySyncExtras() };
}

// Sorted by time, one entry per timestamp, only the newest few kept.
function normalizeLog(entries: AttemptEntry[], max: number = ATTEMPT_LOG_PER_QUESTION): AttemptEntry[] {
  const byAt = new Map<number, AttemptEntry>();
  for (const e of entries) {
    if (!byAt.has(e[0])) {
      byAt.set(e[0], e);
    }
  }
  const sorted = Array.from(byAt.values()).sort((a, b) => a[0] - b[0]);
  return sorted.length > max ? sorted.slice(sorted.length - max) : sorted;
}

export function appendAttemptLog(
  log: Record<string, AttemptEntry[]>,
  questionId: string,
  choice: number,
  correct: boolean,
  at: number,
): Record<string, AttemptEntry[]> {
  const entry: AttemptEntry = [at, choice, correct ? 1 : 0];
  return { ...log, [questionId]: normalizeLog([...(log[questionId] ?? []), entry]) };
}

export function stampBookmark(
  stamps: Record<string, number>,
  kind: 'q' | 't',
  id: string,
  at: number,
): Record<string, number> {
  return { ...stamps, [`${kind}:${id}`]: at };
}

function parseAttemptEntry(raw: unknown): AttemptEntry | null {
  if (
    Array.isArray(raw) &&
    raw.length === 3 &&
    isCount(raw[0]) &&
    typeof raw[1] === 'number' &&
    [0, 1, 2, 3].includes(raw[1]) &&
    (raw[2] === 0 || raw[2] === 1)
  ) {
    return [raw[0], raw[1], raw[2]];
  }
  return null;
}

export function parseSyncExtras(raw: unknown): SyncExtras {
  const extras = emptySyncExtras();
  if (!raw || typeof raw !== 'object') {
    return extras;
  }
  const r = raw as Record<string, unknown>;
  if (r.attemptLog && typeof r.attemptLog === 'object' && !Array.isArray(r.attemptLog)) {
    for (const [id, list] of Object.entries(r.attemptLog as Record<string, unknown>)) {
      if (!Array.isArray(list)) {
        continue;
      }
      const entries = list.map(parseAttemptEntry).filter((e): e is AttemptEntry => e !== null);
      if (entries.length > 0) {
        extras.attemptLog[id] = normalizeLog(entries);
      }
    }
  }
  if (r.bookmarkStamps && typeof r.bookmarkStamps === 'object' && !Array.isArray(r.bookmarkStamps)) {
    for (const [key, at] of Object.entries(r.bookmarkStamps as Record<string, unknown>)) {
      if (isCount(at)) {
        extras.bookmarkStamps[key] = at;
      }
    }
  }
  return extras;
}

// A document from the server (or storage): untrusted, like parseProgress.
export function parseSyncState(raw: unknown): SyncState {
  return { ...parseProgress(raw), ...parseSyncExtras(raw) };
}

function mergeQuestion(
  a: QuestionProgress | undefined,
  b: QuestionProgress | undefined,
  logA: AttemptEntry[] | undefined,
  logB: AttemptEntry[] | undefined,
): { progress: QuestionProgress | undefined; log: AttemptEntry[] } {
  const log = normalizeLog([...(logA ?? []), ...(logB ?? [])]);
  if (!a && !b) {
    return { progress: undefined, log };
  }
  if (!a || !b) {
    return { progress: (a ?? b)!, log };
  }
  // The counters of the side that saw more attempts, or the attempts both
  // logs add up to when the devices answered independently (exact while a
  // question has at most ATTEMPT_LOG_PER_QUESTION attempts on each side).
  const fromLog =
    log.length > 0
      ? { attempts: log.length, correctAttempts: log.filter(e => e[2] === 1).length }
      : { attempts: 0, correctAttempts: 0 };
  let best: { attempts: number; correctAttempts: number } = a;
  for (const c of [b, fromLog]) {
    if (
      c.attempts > best.attempts ||
      (c.attempts === best.attempts && c.correctAttempts > best.correctAttempts)
    ) {
      best = c;
    }
  }
  const newest = b.lastAt > a.lastAt ? b : a;
  const first = b.firstAt < a.firstAt ? b : a;
  return {
    progress: {
      attempts: best.attempts,
      correctAttempts: Math.min(best.correctAttempts, best.attempts),
      lastChoice: newest.lastChoice,
      lastCorrect: newest.lastCorrect,
      lastAt: newest.lastAt,
      firstCorrect: first.firstCorrect,
      firstAt: first.firstAt,
    },
    log,
  };
}

// Union of ids; an id that was toggled on either side (has a stamp) is kept
// only if the side with the newest toggle has it. A tie keeps it.
function mergeIds(
  kind: 'q' | 't',
  a: string[],
  b: string[],
  stampsA: Record<string, number>,
  stampsB: Record<string, number>,
): string[] {
  const inA = new Set(a);
  const inB = new Set(b);
  const out: string[] = [];
  for (const id of [...a, ...b]) {
    if (out.includes(id)) {
      continue;
    }
    const key = `${kind}:${id}`;
    const sa = stampsA[key];
    const sb = stampsB[key];
    if (sa === undefined && sb === undefined) {
      out.push(id);
      continue;
    }
    const ta = sa ?? 0;
    const tb = sb ?? 0;
    const keep = ta === tb ? inA.has(id) || inB.has(id) : ta > tb ? inA.has(id) : inB.has(id);
    if (keep) {
      out.push(id);
    }
  }
  return out;
}

// Never loses data: attempts are unioned by (questionId, timestamp),
// bookmarks are unioned (a removal wins only when it is the newest toggle),
// and on a conflict in the "last answer" fields the newest attempt wins.
// Pure and symmetric up to ordering: mergeProgress(a, b) and (b, a) hold the
// same data, and merging the result again changes nothing.
export function mergeProgress(local: SyncState, remote: SyncState): SyncState {
  const questions: Record<string, QuestionProgress> = {};
  const attemptLog: Record<string, AttemptEntry[]> = {};
  const ids = new Set([
    ...Object.keys(local.questions),
    ...Object.keys(remote.questions),
    ...Object.keys(local.attemptLog),
    ...Object.keys(remote.attemptLog),
  ]);
  for (const id of ids) {
    const merged = mergeQuestion(local.questions[id], remote.questions[id], local.attemptLog[id], remote.attemptLog[id]);
    if (merged.progress) {
      questions[id] = merged.progress;
    }
    if (merged.log.length > 0) {
      attemptLog[id] = merged.log;
    }
  }
  const bookmarkStamps: Record<string, number> = { ...local.bookmarkStamps };
  for (const [key, at] of Object.entries(remote.bookmarkStamps)) {
    bookmarkStamps[key] = Math.max(at, bookmarkStamps[key] ?? 0);
  }
  return {
    version: PROGRESS_VERSION,
    questions,
    attemptLog,
    bookmarkStamps,
    bookmarkedQuestions: mergeIds(
      'q',
      local.bookmarkedQuestions,
      remote.bookmarkedQuestions,
      local.bookmarkStamps,
      remote.bookmarkStamps,
    ),
    bookmarkedTips: mergeIds('t', local.bookmarkedTips, remote.bookmarkedTips, local.bookmarkStamps, remote.bookmarkStamps),
  };
}

function sortedRecord<T>(record: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of Object.keys(record).sort()) {
    out[key] = record[key];
  }
  return out;
}

// The document that goes to the server: keys and id lists sorted, so two
// equal states serialize identically (used to tell whether a push is due).
export function toSyncDocument(state: SyncState, maxLogPerQuestion: number = ATTEMPT_LOG_PER_QUESTION): Record<string, unknown> {
  const attemptLog: Record<string, AttemptEntry[]> = {};
  for (const [id, entries] of Object.entries(sortedRecord(state.attemptLog))) {
    attemptLog[id] = normalizeLog(entries, maxLogPerQuestion);
  }
  return {
    version: PROGRESS_VERSION,
    questions: sortedRecord(state.questions),
    attemptLog,
    bookmarkStamps: sortedRecord(state.bookmarkStamps),
    bookmarkedQuestions: [...state.bookmarkedQuestions].sort(),
    bookmarkedTips: [...state.bookmarkedTips].sort(),
  };
}

export function syncStateIsEmpty(state: SyncState): boolean {
  return (
    Object.keys(state.questions).length === 0 &&
    state.bookmarkedQuestions.length === 0 &&
    state.bookmarkedTips.length === 0 &&
    Object.keys(state.bookmarkStamps).length === 0
  );
}

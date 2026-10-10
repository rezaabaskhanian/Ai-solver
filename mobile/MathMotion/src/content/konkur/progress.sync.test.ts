import {
  appendAttemptLog,
  emptySyncState,
  mergeProgress,
  parseSyncState,
  stampBookmark,
  syncStateIsEmpty,
  toSyncDocument,
  type SyncState,
} from './progress';
import { recordAttempt } from './progress';

// Builds a state the way the store does: recordAttempt + the attempt log.
function attempt(state: SyncState, id: string, choice: number, correct: boolean, at: number): SyncState {
  const next = recordAttempt(state, id, choice, correct, at);
  return { ...state, questions: next.questions, attemptLog: appendAttemptLog(state.attemptLog, id, choice, correct, at) };
}

describe('mergeProgress', () => {
  it('unions attempts of different devices on the same question', () => {
    let a = emptySyncState();
    a = attempt(a, 'q1', 1, false, 100);
    a = attempt(a, 'q1', 2, true, 200);
    let b = emptySyncState();
    b = attempt(b, 'q1', 0, false, 150);

    const m = mergeProgress(a, b);
    expect(m.questions.q1.attempts).toBe(3);
    expect(m.questions.q1.correctAttempts).toBe(1);
    // The newest attempt decides the "last" fields.
    expect(m.questions.q1.lastAt).toBe(200);
    expect(m.questions.q1.lastCorrect).toBe(true);
    expect(m.questions.q1.firstAt).toBe(100);
    expect(m.questions.q1.firstCorrect).toBe(false);
  });

  it('does not double count the same attempt (same timestamp)', () => {
    let a = emptySyncState();
    a = attempt(a, 'q1', 1, true, 100);
    const m = mergeProgress(a, a);
    expect(m.questions.q1.attempts).toBe(1);
    expect(m.questions.q1.correctAttempts).toBe(1);
  });

  it('is idempotent and keeps questions only one side has', () => {
    let a = emptySyncState();
    a = attempt(a, 'q1', 1, true, 100);
    let b = emptySyncState();
    b = attempt(b, 'q2', 3, false, 300);
    const m = mergeProgress(a, b);
    expect(Object.keys(m.questions).sort()).toEqual(['q1', 'q2']);
    expect(toSyncDocument(mergeProgress(m, b))).toEqual(toSyncDocument(m));
    expect(toSyncDocument(mergeProgress(b, a))).toEqual(toSyncDocument(m));
  });

  it('never lowers counters of a legacy side without a log', () => {
    const legacy: SyncState = {
      ...emptySyncState(),
      questions: {
        q1: { attempts: 5, correctAttempts: 3, lastChoice: 1, lastCorrect: true, firstCorrect: false, firstAt: 10, lastAt: 90 },
      },
    };
    const other = attempt(emptySyncState(), 'q1', 2, false, 200);
    const m = mergeProgress(legacy, other);
    expect(m.questions.q1.attempts).toBeGreaterThanOrEqual(5);
    expect(m.questions.q1.lastAt).toBe(200);
    expect(m.questions.q1.correctAttempts).toBeLessThanOrEqual(m.questions.q1.attempts);
  });

  it('unions bookmarks', () => {
    const a: SyncState = { ...emptySyncState(), bookmarkedQuestions: ['a'], bookmarkedTips: ['t1'] };
    const b: SyncState = { ...emptySyncState(), bookmarkedQuestions: ['b', 'a'], bookmarkedTips: ['t2'] };
    const m = mergeProgress(a, b);
    expect(m.bookmarkedQuestions.sort()).toEqual(['a', 'b']);
    expect(m.bookmarkedTips.sort()).toEqual(['t1', 't2']);
  });

  it('lets the newest toggle win for a bookmark', () => {
    // Device A bookmarked at 100; device B removed it at 200.
    const a: SyncState = {
      ...emptySyncState(),
      bookmarkedQuestions: ['x'],
      bookmarkStamps: stampBookmark({}, 'q', 'x', 100),
    };
    const b: SyncState = { ...emptySyncState(), bookmarkStamps: stampBookmark({}, 'q', 'x', 200) };
    expect(mergeProgress(a, b).bookmarkedQuestions).toEqual([]);
    // ...and the other way round the bookmark survives.
    const b2: SyncState = { ...emptySyncState(), bookmarkStamps: stampBookmark({}, 'q', 'x', 50) };
    expect(mergeProgress(a, b2).bookmarkedQuestions).toEqual(['x']);
  });
});

describe('sync document', () => {
  it('caps the attempt log per question', () => {
    let log = {};
    for (let i = 1; i <= 15; i++) {
      log = appendAttemptLog(log, 'q1', 0, true, i);
    }
    expect((log as Record<string, unknown[]>).q1).toHaveLength(10);
  });

  it('round-trips through parseSyncState and drops bad entries', () => {
    let s = emptySyncState();
    s = attempt(s, 'q1', 1, true, 100);
    const doc = toSyncDocument(s);
    expect(parseSyncState(JSON.parse(JSON.stringify(doc)))).toEqual(s);
    const dirty = { ...doc, attemptLog: { q1: [[1, 9, 1], 'x', [5, 1, 0]] }, bookmarkStamps: { 'q:a': -3, 'q:b': 7 } };
    const parsed = parseSyncState(dirty);
    expect(parsed.attemptLog.q1).toEqual([[5, 1, 0]]);
    expect(parsed.bookmarkStamps).toEqual({ 'q:b': 7 });
  });

  it('reports an empty state', () => {
    expect(syncStateIsEmpty(emptySyncState())).toBe(true);
    expect(syncStateIsEmpty({ ...emptySyncState(), bookmarkedTips: ['t'] })).toBe(false);
  });
});

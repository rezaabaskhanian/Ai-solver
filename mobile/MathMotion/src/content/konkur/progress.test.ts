import type { KonkurContent, KonkurQuestion, KonkurTip } from './index';
import {
  bookmarkedQuestionsOf,
  emptyProgress,
  groupByMainTip,
  mistakesOf,
  parseProgress,
  recordAttempt,
  statsForChapter,
  statsForQuestions,
  statsForTip,
  toggleId,
  weakTips,
} from './progress';

const tip = (id: string, chapterId?: string): KonkurTip => ({ id, grade: 10, chapterId, title: id, body: ['x'] });
const question = (id: string, tipIds: string[]): KonkurQuestion => ({
  id,
  tipIds,
  text: id,
  choices: ['1', '2', '3', '4'],
  answer: 0,
  solution: ['x'],
  source: { kind: 'authored' },
});

const content: KonkurContent = {
  tips: [tip('t1', 'c1'), tip('t2', 'c1'), tip('t3', 'c2')],
  questions: [question('q1', ['t1']), question('q2', ['t1', 't2']), question('q3', ['t2']), question('q4', ['t3'])],
};

describe('recordAttempt', () => {
  it('creates and then updates a question entry without mutating', () => {
    const start = emptyProgress();
    const a = recordAttempt(start, 'q1', 2, false, 100);
    expect(start.questions.q1).toBeUndefined();
    expect(a.questions.q1).toEqual({
      attempts: 1,
      correctAttempts: 0,
      lastChoice: 2,
      lastCorrect: false,
      firstCorrect: false,
      firstAt: 100,
      lastAt: 100,
    });
    const b = recordAttempt(a, 'q1', 0, true, 200);
    expect(b.questions.q1).toMatchObject({
      attempts: 2,
      correctAttempts: 1,
      lastChoice: 0,
      lastCorrect: true,
      firstCorrect: false,
      firstAt: 100,
      lastAt: 200,
    });
  });
});

describe('toggleId', () => {
  it('adds then removes', () => {
    expect(toggleId([], 'a')).toEqual(['a']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('parseProgress', () => {
  it('returns empty progress for garbage or another version', () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress('x')).toEqual(emptyProgress());
    expect(parseProgress({ version: 99, questions: {} })).toEqual(emptyProgress());
  });

  it('keeps valid entries and drops broken ones', () => {
    const good = recordAttempt(emptyProgress(), 'q1', 1, true, 5);
    const parsed = parseProgress({
      ...good,
      questions: { ...good.questions, bad: { attempts: -1 }, worse: 7 },
      bookmarkedQuestions: ['q1', 'q1', 3, ''],
      bookmarkedTips: 'nope',
    });
    expect(Object.keys(parsed.questions)).toEqual(['q1']);
    expect(parsed.bookmarkedQuestions).toEqual(['q1']);
    expect(parsed.bookmarkedTips).toEqual([]);
  });
});

describe('mistakes and bookmarks', () => {
  it('lists latest-wrong questions, drops fixed and unknown ones', () => {
    let p = emptyProgress();
    p = recordAttempt(p, 'q1', 1, false, 10);
    p = recordAttempt(p, 'q2', 1, false, 20);
    p = recordAttempt(p, 'q3', 1, false, 30);
    p = recordAttempt(p, 'q3', 0, true, 40);
    p = recordAttempt(p, 'gone', 1, false, 50);
    expect(mistakesOf(p, content).map(q => q.id)).toEqual(['q2', 'q1']);
  });

  it('ignores bookmarks of missing questions', () => {
    const p = { ...emptyProgress(), bookmarkedQuestions: ['q4', 'gone'] };
    expect(bookmarkedQuestionsOf(p, content).map(q => q.id)).toEqual(['q4']);
  });

  it('groups by the main tip', () => {
    const groups = groupByMainTip([content.questions[1], content.questions[0], content.questions[2]], content);
    expect(groups.map(g => [g.tip.id, g.questions.map(q => q.id)])).toEqual([
      ['t1', ['q2', 'q1']],
      ['t2', ['q3']],
    ]);
  });
});

describe('stats', () => {
  it('computes per tip, per chapter and flags weak topics', () => {
    let p = emptyProgress();
    p = recordAttempt(p, 'q1', 1, false);
    p = recordAttempt(p, 'q1', 1, false);
    p = recordAttempt(p, 'q2', 0, true);
    p = recordAttempt(p, 'q2', 1, false);
    const t1 = statsForTip(p, 't1', content);
    expect(t1).toMatchObject({ totalQuestions: 2, answeredQuestions: 2, attempts: 4, correctAttempts: 1, percent: 25, weak: true });
    expect(statsForTip(p, 't3', content)).toMatchObject({ attempts: 0, percent: null, weak: false });
    // q2 belongs to t1 and t2 but counts once in the chapter.
    expect(statsForChapter(p, 'c1', content)).toMatchObject({ totalQuestions: 3, answeredQuestions: 2, attempts: 4 });
    expect(weakTips(p, content).map(e => e.tip.id)).toEqual(['t1']);
  });

  it('needs enough attempts to be weak', () => {
    const p = recordAttempt(emptyProgress(), 'q1', 1, false);
    expect(statsForQuestions(p, content.questions).weak).toBe(false);
  });
});

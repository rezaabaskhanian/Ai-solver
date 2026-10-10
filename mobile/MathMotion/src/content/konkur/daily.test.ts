import {
  clampGoal,
  currentStreak,
  emptyDaily,
  ensureDailyPick,
  goalProgress,
  longestStreak,
  parseDaily,
  pickDailyQuestion,
  recordDailyAnswer,
  setDailyGoal,
} from './daily';
import { dayIndexOf } from './dayIndex';
import type { KonkurContent, KonkurQuestion, KonkurTip } from './index';
import { emptyProgress, recordAttempt } from './progress';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

const tip = (id: string): KonkurTip => ({ id, grade: 10, title: id, body: ['x'] });
const question = (id: string, tipId: string, kind: 'konkur' | 'authored' = 'konkur'): KonkurQuestion => ({
  id,
  tipIds: [tipId],
  text: id,
  choices: ['1', '2', '3', '4'],
  answer: 0,
  solution: ['x'],
  source: kind === 'konkur' ? { kind: 'konkur', year: 1400, track: 'riazi' } : { kind: 'authored' },
});

describe('dayIndexOf', () => {
  it('is the same for any time on one local date and +1 for the next', () => {
    expect(dayIndexOf(at(2026, 3, 10, 0))).toBe(dayIndexOf(at(2026, 3, 10, 23)));
    expect(dayIndexOf(at(2026, 3, 11, 1))).toBe(dayIndexOf(at(2026, 3, 10, 23)) + 1);
  });

  it('counts across month, year and DST boundaries without gaps', () => {
    expect(dayIndexOf(at(2026, 1, 1))).toBe(dayIndexOf(at(2025, 12, 31)) + 1);
    expect(dayIndexOf(at(2026, 3, 1))).toBe(dayIndexOf(at(2026, 2, 28)) + 1);
    expect(dayIndexOf(at(2026, 3, 30))).toBe(dayIndexOf(at(2026, 3, 29)) + 1);
    expect(dayIndexOf(at(2026, 10, 26))).toBe(dayIndexOf(at(2026, 10, 25)) + 1);
  });

  it('survives an invalid timestamp', () => {
    expect(dayIndexOf(Number.NaN)).toBe(0);
  });
});

describe('streak', () => {
  const answerOn = (state = emptyDaily(), ...days: [number, number, number][]) =>
    days.reduce((s, [y, m, d]) => recordDailyAnswer(s, at(y, m, d)), state);

  it('is 0 with no answers', () => {
    expect(currentStreak(emptyDaily(), dayIndexOf(at(2026, 3, 10)))).toBe(0);
  });

  it('counts consecutive days, and several answers on a day count once', () => {
    const s = answerOn(emptyDaily(), [2026, 3, 8], [2026, 3, 9], [2026, 3, 10], [2026, 3, 10]);
    expect(currentStreak(s, dayIndexOf(at(2026, 3, 10)))).toBe(3);
  });

  it('keeps the streak alive until the end of the day after the last answer', () => {
    const s = answerOn(emptyDaily(), [2026, 3, 8], [2026, 3, 9]);
    expect(currentStreak(s, dayIndexOf(at(2026, 3, 10)))).toBe(2);
    expect(currentStreak(s, dayIndexOf(at(2026, 3, 11)))).toBe(0);
  });

  it('a missed day resets the current streak but keeps the longest', () => {
    const s = answerOn(emptyDaily(), [2026, 3, 1], [2026, 3, 2], [2026, 3, 3], [2026, 3, 6]);
    const today = dayIndexOf(at(2026, 3, 6));
    expect(currentStreak(s, today)).toBe(1);
    expect(longestStreak(s, today)).toBe(3);
    expect(s.longestStreak).toBe(3);
  });

  it('ignores days in the future when the clock is set back', () => {
    const s = answerOn(emptyDaily(), [2026, 3, 10], [2026, 3, 11]);
    expect(currentStreak(s, dayIndexOf(at(2026, 3, 9)))).toBe(0);
    expect(currentStreak(s, dayIndexOf(at(2026, 3, 10)))).toBe(1);
  });

  it('prunes very old days but never lowers the longest streak', () => {
    let s = answerOn(emptyDaily(), [2024, 1, 1], [2024, 1, 2], [2024, 1, 3]);
    s = recordDailyAnswer(s, at(2026, 3, 10));
    expect(Object.keys(s.counts)).toHaveLength(1);
    expect(longestStreak(s, dayIndexOf(at(2026, 3, 10)))).toBe(3);
  });
});

describe('daily goal', () => {
  it('defaults to 5 and is clamped', () => {
    expect(emptyDaily().goal).toBe(5);
    expect(clampGoal(0)).toBe(1);
    expect(clampGoal(500)).toBe(50);
    expect(clampGoal(Number.NaN)).toBe(5);
    expect(setDailyGoal(emptyDaily(), 12).goal).toBe(12);
  });

  it('reports progress for today only', () => {
    const today = dayIndexOf(at(2026, 3, 10));
    let s = setDailyGoal(emptyDaily(), 2);
    s = recordDailyAnswer(s, at(2026, 3, 9));
    expect(goalProgress(s, today)).toEqual({ done: 0, goal: 2, fraction: 0, reached: false });
    s = recordDailyAnswer(s, at(2026, 3, 10));
    expect(goalProgress(s, today).fraction).toBe(0.5);
    s = recordDailyAnswer(recordDailyAnswer(s, at(2026, 3, 10)), at(2026, 3, 10));
    expect(goalProgress(s, today)).toEqual({ done: 3, goal: 2, fraction: 1, reached: true });
  });
});

describe('pickDailyQuestion', () => {
  const content: KonkurContent = {
    tips: [tip('t1'), tip('t2')],
    questions: [
      question('a1', 't1'),
      question('a2', 't1'),
      question('b1', 't2'),
      question('b2', 't2'),
      question('auth', 't2', 'authored'),
    ],
  };

  it('is deterministic for a day and only picks real exam questions', () => {
    const day = dayIndexOf(at(2026, 3, 10));
    const first = pickDailyQuestion(content, emptyProgress(), day);
    expect(pickDailyQuestion(content, emptyProgress(), day)).toBe(first);
    for (let d = day; d < day + 30; d++) {
      expect(pickDailyQuestion(content, emptyProgress(), d)!.id).not.toBe('auth');
    }
  });

  it('varies across days', () => {
    const day = dayIndexOf(at(2026, 3, 10));
    const ids = new Set<string>();
    for (let d = day; d < day + 30; d++) {
      ids.add(pickDailyQuestion(content, emptyProgress(), d)!.id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it('prefers weak topics', () => {
    let p = emptyProgress();
    // t2 becomes weak: 3 wrong attempts on b1.
    for (let i = 0; i < 3; i++) {
      p = recordAttempt(p, 'b1', 1, false);
    }
    const day = dayIndexOf(at(2026, 3, 10));
    for (let d = day; d < day + 20; d++) {
      expect(['b1', 'b2']).toContain(pickDailyQuestion(content, p, d)!.id);
    }
  });

  it('falls back to authored questions and null when empty', () => {
    expect(pickDailyQuestion({ tips: [], questions: [] }, emptyProgress(), 1)).toBeNull();
    const authoredOnly: KonkurContent = { tips: [tip('t1')], questions: [question('x', 't1', 'authored')] };
    expect(pickDailyQuestion(authoredOnly, emptyProgress(), 1)!.id).toBe('x');
  });

  it('ensureDailyPick keeps the pick stable through the day even as progress changes', () => {
    const day = dayIndexOf(at(2026, 3, 10));
    const s1 = ensureDailyPick(emptyDaily(), content, emptyProgress(), day);
    const picked = s1.pick!.questionId;
    let p = emptyProgress();
    for (let i = 0; i < 3; i++) {
      p = recordAttempt(p, picked === 'b1' ? 'a1' : 'b1', 1, false);
    }
    expect(ensureDailyPick(s1, content, p, day)).toBe(s1);
    expect(ensureDailyPick(s1, content, p, day + 1).pick!.day).toBe(day + 1);
  });

  it('ensureDailyPick re-picks when the stored question left the content', () => {
    const day = dayIndexOf(at(2026, 3, 10));
    const stale = { ...emptyDaily(), pick: { day, questionId: 'gone' } };
    expect(content.questions.map(q => q.id)).toContain(ensureDailyPick(stale, content, emptyProgress(), day).pick!.questionId);
  });
});

describe('parseDaily', () => {
  it('round-trips a valid state', () => {
    const s = recordDailyAnswer(setDailyGoal(emptyDaily(), 8), at(2026, 3, 10));
    expect(parseDaily(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('starts fresh from garbage or another version', () => {
    expect(parseDaily(null)).toEqual(emptyDaily());
    expect(parseDaily('x')).toEqual(emptyDaily());
    expect(parseDaily({ version: 99, goal: 3 })).toEqual(emptyDaily());
  });

  it('drops bad fields one by one', () => {
    const parsed = parseDaily({
      version: 1,
      goal: 'many',
      counts: { '100': 2, abc: 1, '101': -4, '102': 'x' },
      longestStreak: -3,
      pick: { day: 'x', questionId: 5 },
    });
    expect(parsed.goal).toBe(5);
    expect(parsed.counts).toEqual({ '100': 2 });
    expect(parsed.longestStreak).toBe(0);
    expect(parsed.pick).toBeNull();
  });
});

import { dayIndexOf } from './dayIndex';
import type { KonkurContent, KonkurQuestion } from './index';
import { emptyProgress, recordAttempt } from './progress';
import {
  REVIEW_INTERVAL_DAYS,
  dueReviews,
  emptyReview,
  nextDueDay,
  parseReview,
  reviewAfterAnswer,
} from './review';

const question = (id: string): KonkurQuestion => ({
  id,
  tipIds: ['t1'],
  text: id,
  choices: ['1', '2', '3', '4'],
  answer: 0,
  solution: ['x'],
  source: { kind: 'authored' },
});
const content: KonkurContent = {
  tips: [{ id: 't1', grade: 10, title: 't1', body: ['x'] }],
  questions: [question('q1'), question('q2'), question('q3')],
};
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe('reviewAfterAnswer', () => {
  it('schedules a wrong answer for tomorrow', () => {
    const r = reviewAfterAnswer(emptyReview(), 'q1', false, 100);
    expect(r.items.q1).toEqual({ level: 0, dueDay: 101 });
  });

  it('climbs 1 → 3 → 7 → 14 days and then leaves the schedule', () => {
    let day = 100;
    let r = reviewAfterAnswer(emptyReview(), 'q1', false, day);
    const gaps: number[] = [];
    while (r.items.q1) {
      day = r.items.q1.dueDay;
      const before = day;
      r = reviewAfterAnswer(r, 'q1', true, day);
      if (r.items.q1) {
        gaps.push(r.items.q1.dueDay - before);
      }
    }
    expect(gaps).toEqual([3, 7, 14]);
    expect(REVIEW_INTERVAL_DAYS).toEqual([1, 3, 7, 14]);
    expect(r.items.q1).toBeUndefined();
  });

  it('a wrong review resets to the first step', () => {
    let r = reviewAfterAnswer(emptyReview(), 'q1', false, 100);
    r = reviewAfterAnswer(r, 'q1', true, 101);
    expect(r.items.q1.level).toBe(1);
    r = reviewAfterAnswer(r, 'q1', false, 104);
    expect(r.items.q1).toEqual({ level: 0, dueDay: 105 });
  });

  it('a correct answer before the due day changes nothing', () => {
    const r = reviewAfterAnswer(emptyReview(), 'q1', false, 100);
    expect(reviewAfterAnswer(r, 'q1', true, 100)).toBe(r);
  });

  it('a correct answer to a question that was never wrong changes nothing', () => {
    const r = emptyReview();
    expect(reviewAfterAnswer(r, 'q1', true, 100)).toBe(r);
  });

  it('a late review still moves up one step, counted from the day it happened', () => {
    let r = reviewAfterAnswer(emptyReview(), 'q1', false, 100);
    r = reviewAfterAnswer(r, 'q1', true, 120);
    expect(r.items.q1).toEqual({ level: 1, dueDay: 123 });
  });
});

describe('dueReviews', () => {
  it('lists only due items, most overdue first', () => {
    let r = reviewAfterAnswer(emptyReview(), 'q1', false, 100); // due 101
    r = reviewAfterAnswer(r, 'q2', false, 95); // due 96
    r = reviewAfterAnswer(r, 'q3', false, 110); // due 111
    const due = dueReviews(r, emptyProgress(), content, 105);
    expect(due.map(d => d.question.id)).toEqual(['q2', 'q1']);
    expect(due.map(d => d.overdueDays)).toEqual([9, 4]);
  });

  it('treats old mistakes without a schedule as due one day after the miss', () => {
    const wrongAt = at(2026, 3, 10);
    const p = recordAttempt(emptyProgress(), 'q1', 1, false, wrongAt);
    const day = dayIndexOf(wrongAt);
    expect(dueReviews(emptyReview(), p, content, day)).toHaveLength(0);
    expect(dueReviews(emptyReview(), p, content, day + 1).map(d => d.question.id)).toEqual(['q1']);
  });

  it('ignores a mistake that was answered right since', () => {
    let p = recordAttempt(emptyProgress(), 'q1', 1, false, at(2026, 3, 1));
    p = recordAttempt(p, 'q1', 0, true, at(2026, 3, 2));
    expect(dueReviews(emptyReview(), p, content, dayIndexOf(at(2026, 4, 1)))).toHaveLength(0);
  });

  it('skips ids missing from the content', () => {
    const r = reviewAfterAnswer(emptyReview(), 'gone', false, 100);
    expect(dueReviews(r, emptyProgress(), content, 200)).toHaveLength(0);
  });

  it('nextDueDay is the earliest day, or null', () => {
    expect(nextDueDay(emptyReview(), emptyProgress())).toBeNull();
    let r = reviewAfterAnswer(emptyReview(), 'q1', false, 100);
    r = reviewAfterAnswer(r, 'q2', false, 90);
    expect(nextDueDay(r, emptyProgress())).toBe(91);
  });
});

describe('parseReview', () => {
  it('round-trips and drops bad items', () => {
    const r = reviewAfterAnswer(emptyReview(), 'q1', false, 100);
    expect(parseReview(JSON.parse(JSON.stringify(r)))).toEqual(r);
    const parsed = parseReview({
      version: 1,
      items: { ok: { level: 2, dueDay: 5 }, bad1: { level: 9, dueDay: 5 }, bad2: { level: 1 }, bad3: null },
    });
    expect(Object.keys(parsed.items)).toEqual(['ok']);
  });

  it('starts empty from garbage', () => {
    expect(parseReview(undefined)).toEqual(emptyReview());
    expect(parseReview({ version: 2, items: {} })).toEqual(emptyReview());
    expect(parseReview({ version: 1, items: [] })).toEqual(emptyReview());
  });
});

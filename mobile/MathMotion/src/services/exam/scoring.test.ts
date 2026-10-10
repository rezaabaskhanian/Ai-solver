import {
  averageSecondsPerQuestion,
  defaultDurationSec,
  elapsedSeconds,
  formatClock,
  groupScores,
  isWarning,
  localizeDigits,
  remainingSeconds,
  tally,
} from './scoring';

describe('tally (konkur marking)', () => {
  it('gives +3 per correct, -1 per wrong and 0 per blank', () => {
    const t = tally([0, 1, 2, 3], [0, 0, null, 3]);
    expect(t).toMatchObject({ correct: 2, wrong: 1, blank: 1, total: 4, points: 5 });
    // 5 / 12 = 41.666...% -> one decimal
    expect(t.percent).toBe(41.7);
  });

  it('can go negative', () => {
    const t = tally([0, 0, 0], [1, 2, 3]);
    expect(t.points).toBe(-3);
    expect(t.percent).toBe(-33.3);
  });

  it('treats missing answers as blank and handles an empty exam', () => {
    expect(tally([1, 2], [])).toMatchObject({ blank: 2, points: 0, percent: 0 });
    expect(tally([], [])).toMatchObject({ total: 0, percent: 0 });
  });

  it('is 100% when everything is right', () => {
    expect(tally([1, 2], [1, 2]).percent).toBe(100);
  });
});

describe('groupScores', () => {
  it('counts per group and lists the weakest first, ignoring empty keys', () => {
    const items = [
      { key: 'a', answerIndex: 0 },
      { key: 'a', answerIndex: 1 },
      { key: 'b', answerIndex: 2 },
      { key: '', answerIndex: 0 },
    ];
    const groups = groupScores(items, [0, 0, 2, 0]);
    expect(groups.map(g => g.key)).toEqual(['a', 'b']);
    expect(groups[0]).toMatchObject({ key: 'a', correct: 1, wrong: 1, total: 2, correctPercent: 50 });
    expect(groups[1].correctPercent).toBe(100);
  });
});

describe('timing', () => {
  it('derives remaining time from the deadline, never below zero', () => {
    expect(remainingSeconds(10_000, 0)).toBe(10);
    expect(remainingSeconds(10_000, 9_001)).toBe(1);
    expect(remainingSeconds(10_000, 10_000)).toBe(0);
    expect(remainingSeconds(10_000, 99_000)).toBe(0);
  });

  it('clamps elapsed time to the duration', () => {
    expect(elapsedSeconds(0, 30_000, 60)).toBe(30);
    expect(elapsedSeconds(0, 500_000, 60)).toBe(60);
    expect(elapsedSeconds(5_000, 0, 60)).toBe(0);
  });

  it('formats mm:ss and flags the last minute', () => {
    expect(formatClock(75)).toBe('01:15');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(3600)).toBe('60:00');
    expect(formatClock(-4)).toBe('00:00');
    expect(isWarning(61)).toBe(false);
    expect(isWarning(60)).toBe(true);
  });

  it('computes average seconds per question and default durations', () => {
    expect(averageSecondsPerQuestion(100, 8)).toBe(12.5);
    expect(averageSecondsPerQuestion(100, 0)).toBe(0);
    expect(defaultDurationSec(10)).toBe(600);
    expect(defaultDurationSec(10, 90)).toBe(900);
  });
});

describe('localizeDigits', () => {
  it('converts digits only for Persian', () => {
    expect(localizeDigits('12:05', true)).toBe('۱۲:۰۵');
    expect(localizeDigits(7.5, false)).toBe('7.5');
    expect(localizeDigits(-3, false)).toBe('-3');
  });
});

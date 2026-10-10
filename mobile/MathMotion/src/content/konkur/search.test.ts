import type { KonkurContent } from './index';
import { normalizeSearchText, searchKonkur } from './search';

const content: KonkurContent = {
  tips: [
    { id: 't1', grade: 10, title: 'معادله‌ی درجه دوم', body: ['دلتا را حساب کن', { math: 'x^2 - 4' }], details: ['توضیح کامل ریشه'] },
    { id: 't2', grade: null, title: 'مدیریت زمان', body: ['ساعت'] },
  ],
  questions: [
    {
      id: 'q1',
      tipIds: ['t1'],
      text: 'ریشه‌های معادله را بیابید',
      expression: '3x^2 - 7x + 4 = 0',
      choices: ['1', '2', '3', '4'],
      answer: 0,
      solution: ['x'],
      source: { kind: 'konkur', year: 1402, track: 'riazi', number: 5 },
    },
    {
      id: 'q2',
      tipIds: ['t2'],
      text: 'یک تست',
      choices: ['1', '2', '3', '4'],
      answer: 0,
      solution: ['x'],
      source: { kind: 'authored' },
    },
  ],
};

describe('normalizeSearchText', () => {
  it('unifies Arabic letters, digits, ZWNJ and diacritics', () => {
    expect(normalizeSearchText('كتاب يك')).toBe('کتاب یک');
    expect(normalizeSearchText('۱۴۰۲ ١٤٠٢ 1402')).toBe('1402 1402 1402');
    expect(normalizeSearchText('می‌خواهم')).toBe('میخواهم');
    expect(normalizeSearchText('مَعادِله')).toBe('معادله');
  });
});

describe('searchKonkur', () => {
  it('returns nothing for an empty or one-character query', () => {
    expect(searchKonkur(content, '  ')).toEqual({ tips: [], questions: [] });
    expect(searchKonkur(content, 'م')).toEqual({ tips: [], questions: [] });
  });

  it('matches tip title, body and details', () => {
    expect(searchKonkur(content, 'درجه دوم').tips.map(t => t.id)).toEqual(['t1']);
    expect(searchKonkur(content, 'دلتا').tips.map(t => t.id)).toEqual(['t1']);
    expect(searchKonkur(content, 'ريشه').tips.map(t => t.id)).toEqual(['t1']);
  });

  it('matches question text and the source label with any digit script', () => {
    expect(searchKonkur(content, 'کنکور ریاضی ۱۴۰۲').questions.map(q => q.id)).toEqual(['q1']);
    expect(searchKonkur(content, '1402').questions.map(q => q.id)).toEqual(['q1']);
    expect(searchKonkur(content, 'تست تألیفی').questions.map(q => q.id)).toEqual(['q2']);
  });

  it('requires every word to match', () => {
    expect(searchKonkur(content, 'دلتا زمان').tips).toEqual([]);
  });
});

import { KONKUR_QUESTIONS, type KonkurContent } from './index';
import { hasUnderstandStep, hintsFor, solutionSteps } from './solvingPath';
import type { KonkurQuestion } from './types';
import { parseKonkurContent } from './validate';

const content: KonkurContent = {
  tips: [
    { id: 'main', grade: 10, chapterId: 'g10_equations', title: 'تجزیه', body: ['b'] },
    { id: 'extra', grade: 10, chapterId: 'g10_equations', title: 'دلتا', body: ['b'] },
  ],
  questions: [],
};

const question = (patch: Partial<KonkurQuestion> = {}): KonkurQuestion => ({
  id: 'q1',
  tipIds: ['main', 'extra'],
  text: 'سؤال',
  choices: ['1', '2', '3', '4'],
  answer: 1,
  solution: ['p1', { math: 'm1' }, 'p2', { math: 'm2' }, { math: 'm3' }, 'p3', 'p4', { math: 'm4' }],
  source: { kind: 'authored' },
  ...patch,
});

describe('solutionSteps', () => {
  it('starts a step at each prose line that follows math', () => {
    expect(solutionSteps(question().solution)).toEqual([
      ['p1', { math: 'm1' }],
      ['p2', { math: 'm2' }, { math: 'm3' }],
      ['p3', 'p4', { math: 'm4' }],
    ]);
  });

  it('keeps a leading math line and handles empty input', () => {
    expect(solutionSteps([{ math: 'm' }, 'p'])).toEqual([[{ math: 'm' }], ['p']]);
    expect(solutionSteps([])).toEqual([]);
  });

  it('never loses a line of the bundled solutions', () => {
    KONKUR_QUESTIONS.forEach(q => {
      expect(solutionSteps(q.solution).flat()).toEqual(q.solution);
    });
  });
});

describe('hintsFor', () => {
  it('uses the written guide when there is one', () => {
    const hints = [['h1'], ['h2', { math: 'x' }]];
    expect(hintsFor(question({ guide: { hints } }), content)).toBe(hints);
  });

  it('falls back to the tips and the first step of a long solution', () => {
    const hints = hintsFor(question(), content);
    expect(hints).toHaveLength(2);
    expect(hints[0][0]).toContain('«تجزیه»');
    expect(hints[0][1]).toContain('«دلتا»');
    expect(hints[1]).toEqual(['قدم اول حل این است:', 'p1', { math: 'm1' }]);
  });

  it('does not give away a short solution as a hint', () => {
    const hints = hintsFor(question({ tipIds: ['main'], solution: ['p', { math: 'm' }] }), content);
    expect(hints).toEqual([['ایده‌ی اصلی این تست، نکته‌ی «تجزیه» است.']]);
  });
});

describe('guide parsing', () => {
  const payload = (guide: unknown) => ({ tips: content.tips, questions: [{ ...question(), guide }] });

  it('keeps a valid guide and drops empty parts', () => {
    const parsed = parseKonkurContent(payload({ given: ['g'], asked: [], hints: [[], ['h']], trap: null }));
    const q = parsed!.questions[0];
    expect(q.guide).toEqual({ given: ['g'], hints: [['h']] });
    expect(hasUnderstandStep(q)).toBe(true);
  });

  it('drops a malformed guide but keeps the question', () => {
    const parsed = parseKonkurContent(payload({ hints: ['not a list of lines'] }));
    expect(parsed!.questions).toHaveLength(1);
    expect(parsed!.questions[0].guide).toBeUndefined();
    expect(hasUnderstandStep(parsed!.questions[0])).toBe(false);
  });
});

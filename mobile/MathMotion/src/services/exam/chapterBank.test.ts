import type { KonkurContent, KonkurQuestion } from '../../content/konkur';
import { buildExam } from './buildExam';
import { chapterBankCounts, chapterBankQuestions } from './chapterBank';

const question = (id: string, tipId: string): KonkurQuestion => ({
  id,
  tipIds: [tipId],
  text: `سؤال ${id}`,
  choices: ['1', '2', '3', '4'],
  answer: 1,
  solution: [],
  source: { kind: 'authored' },
});

const content: KonkurContent = {
  tips: [
    { id: 'tip-trig', grade: 10, chapterId: 'g10_trig', title: 'مثلثات', body: [] },
    { id: 'tip-sets', grade: 10, chapterId: 'g10_sets', title: 'مجموعه', body: [] },
    { id: 'tip-general', grade: null, title: 'عمومی', body: [] },
  ],
  questions: [
    question('t1', 'tip-trig'),
    question('t2', 'tip-trig'),
    question('t3', 'tip-trig'),
    question('s1', 'tip-sets'),
    question('g1', 'tip-general'),
  ],
};

// A fixed sequence, so shuffles are repeatable.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

it('counts questions by their main tip’s chapter', () => {
  const counts = chapterBankCounts(content);
  expect(counts.get('g10_trig')).toBe(3);
  expect(counts.get('g10_sets')).toBe(1);
  expect(counts.has('undefined')).toBe(false);
});

it('interleaves the picked chapters', () => {
  const bank = chapterBankQuestions(content, ['g10_trig', 'g10_sets'], seeded(3));
  expect(bank).toHaveLength(4);
  // The small chapter isn't pushed to the end behind the big one.
  expect(bank.slice(0, 2).map(q => q.chapterId).sort()).toEqual(['g10_sets', 'g10_trig']);
  expect(bank.every(q => q.konkurId && q.answerIndex === 1 && q.topicId === undefined)).toBe(true);
});

it('examines a generator-less chapter from its bank alone', () => {
  const bank = chapterBankQuestions(content, ['g10_trig'], seeded(5));
  const exam = buildExam({ grade: 10, chapterIds: ['g10_trig'], count: 10 }, seeded(5), bank);
  // Only 3 bank questions exist, so the exam is shorter than asked.
  expect(exam).toHaveLength(3);
  expect(new Set(exam.map(q => q.id)).size).toBe(3);
});

it('fills up to half of a mixed exam from the bank', () => {
  const bank = chapterBankQuestions(content, ['g10_sets'], seeded(7));
  const exam = buildExam({ grade: 10, chapterIds: ['g10_sets'], count: 10 }, seeded(7), bank);
  expect(exam).toHaveLength(10);
  expect(exam.filter(q => q.konkurId)).toHaveLength(1);
});

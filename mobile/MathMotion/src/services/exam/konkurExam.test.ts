import type { KonkurContent, KonkurQuestion } from '../../content/konkur';
import { buildKonkurExam, konkurExamConfig, konkurPapers } from './konkurExam';

function q(id: string, year: number, number: number, extra: object = {}): KonkurQuestion {
  return {
    id,
    tipIds: ['tip1'],
    text: `text ${id}`,
    choices: ['1', '2', '3', '4'],
    answer: 1,
    solution: [],
    source: { kind: 'konkur', year, track: 'riazi', number, ...extra },
  } as KonkurQuestion;
}

const many = (year: number, n: number, extra: object = {}) =>
  Array.from({ length: n }, (_, i) => q(`y${year}-${JSON.stringify(extra)}-${i}`, year, n - i, extra));

const content: KonkurContent = {
  tips: [{ id: 'tip1', grade: 12, chapterId: 'ch1', title: 'Tip One', body: [] }],
  questions: [
    ...many(1400, 12),
    ...many(1402, 11, { round: 1 }),
    ...many(1402, 11, { round: 2 }),
    ...many(1399, 3),
    { ...q('auth', 1400, 1), source: { kind: 'authored' } } as KonkurQuestion,
  ],
};

describe('konkur year exams', () => {
  it('lists only full papers, newest year first, split by round', () => {
    const papers = konkurPapers(content);
    expect(papers.map(p => [p.selector.year, p.selector.round ?? 0, p.questionCount])).toEqual([
      [1402, 1, 11],
      [1402, 2, 11],
      [1400, 0, 12],
    ]);
  });

  it('builds a timed exam in booklet order with 1.5 minutes per question', () => {
    const paper = konkurPapers(content)[2];
    const config = konkurExamConfig(paper);
    expect(config.durationSec).toBe(12 * 90);
    const questions = buildKonkurExam(content, paper.selector);
    expect(questions).toHaveLength(12);
    expect(questions[0].text).toBe('text y1400-{}-11');
    expect(questions[0]).toMatchObject({ answerIndex: 1, topicId: 'tip1', topicLabel: 'Tip One', chapterId: 'ch1' });
  });
});

describe('konkur papers per track', () => {
  const tajrobi: KonkurContent = {
    tips: content.tips,
    questions: [
      ...content.questions,
      ...Array.from({ length: 10 }, (_, i) => ({
        ...q(`t${i}`, 1401, i + 1),
        source: { kind: 'konkur', year: 1401, track: 'tajrobi', number: i + 1 },
      })) as unknown as KonkurQuestion[],
    ],
  };

  it('offers only papers of the chosen track', () => {
    expect(konkurPapers(tajrobi, 'tajrobi').map(p => p.selector.year)).toEqual([1401]);
    expect(konkurPapers(tajrobi, 'riazi').map(p => p.selector.year)).toEqual([1402, 1402, 1400]);
  });

  it('returns no papers (not an error) for a track without content', () => {
    expect(konkurPapers(content, 'tajrobi')).toEqual([]);
  });

  it('builds the exam from the selector track', () => {
    const paper = konkurPapers(tajrobi, 'tajrobi')[0];
    expect(buildKonkurExam(tajrobi, paper.selector)).toHaveLength(10);
  });
});

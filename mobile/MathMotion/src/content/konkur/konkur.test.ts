import { CURRICULUM } from '../curriculum';
import { KONKUR_QUESTIONS, KONKUR_TIPS, questionsForTip, sourceLabel } from './index';

const chapters = CURRICULUM.flatMap(g => g.books.flatMap(b => b.chapters.map(c => ({ grade: g.grade, id: c.id }))));

describe('konkur content', () => {
  it('has unique tip and question ids', () => {
    const tipIds = KONKUR_TIPS.map(t => t.id);
    const questionIds = KONKUR_QUESTIONS.map(q => q.id);
    expect(new Set(tipIds).size).toBe(tipIds.length);
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });

  it('puts every grade tip in a chapter of that grade', () => {
    KONKUR_TIPS.filter(t => t.grade !== null).forEach(tip => {
      const chapter = chapters.find(c => c.id === tip.chapterId);
      expect(chapter).toBeDefined();
      expect(chapter!.grade).toBe(tip.grade);
    });
  });

  it('only tags questions with tips that exist', () => {
    const tipIds = new Set(KONKUR_TIPS.map(t => t.id));
    KONKUR_QUESTIONS.forEach(q => {
      expect(q.tipIds.length).toBeGreaterThan(0);
      q.tipIds.forEach(id => expect(tipIds).toContain(id));
    });
  });

  it('has four distinct choices and a valid answer', () => {
    KONKUR_QUESTIONS.forEach(q => {
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.solution.length).toBeGreaterThan(0);
    });
  });

  it('gives every grade 7–12 some tips and questions', () => {
    [7, 8, 9, 10, 11, 12].forEach(grade => {
      const tips = KONKUR_TIPS.filter(t => t.grade === grade);
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(t => questionsForTip(t.id).length > 0)).toBe(true);
    });
  });

  it('labels the source in Persian', () => {
    expect(sourceLabel({ kind: 'authored' })).toBe('تست تألیفی');
    expect(sourceLabel({ kind: 'konkur', year: 1402, track: 'riazi', number: 123 })).toBe(
      'کنکور ریاضی ۱۴۰۲ — سؤال ۱۲۳',
    );
    expect(sourceLabel({ kind: 'konkur', year: 1399, track: 'tajrobi', abroad: true })).toBe(
      'کنکور تجربی خارج از کشور ۱۳۹۹',
    );
  });

  it('labels the exam round', () => {
    expect(sourceLabel({ kind: 'konkur', year: 1404, track: 'riazi', round: 2, number: 5 })).toBe(
      'کنکور ریاضی ۱۴۰۴ نوبت دوم — سؤال ۵',
    );
  });

  it('lists real exam questions before authored ones, newest first', () => {
    const order = (tipId: string) => questionsForTip(tipId).map(q => (q.source.kind === 'konkur' ? q.source.year : 0));
    KONKUR_TIPS.forEach(tip => {
      const years = order(tip.id);
      expect([...years].sort((a, b) => b - a)).toEqual(years);
    });
  });
});

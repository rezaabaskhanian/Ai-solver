import type { KonkurContent, KonkurQuestion } from './index';
import { contentForTrack } from './trackContent';
import { parseKonkurContent } from './validate';

const question = (id: string, tipIds: string[], source: KonkurQuestion['source']): KonkurQuestion => ({
  id,
  tipIds,
  text: id,
  choices: ['1', '2', '3', '4'],
  answer: 0,
  solution: [],
  source,
});

const content: KonkurContent = {
  tips: [
    { id: 'shared', grade: null, title: 'shared', body: [] },
    { id: 'onlyT', grade: 11, title: 'only tajrobi', body: [], tracks: ['tajrobi'] },
    { id: 'riaziChapter', grade: 12, chapterId: 'g12c_derivative', title: 'riazi book', body: [] },
  ],
  questions: [
    question('r-real', ['shared'], { kind: 'konkur', year: 1400, track: 'riazi' }),
    question('t-real', ['shared'], { kind: 'konkur', year: 1400, track: 'tajrobi' }),
    question('auth-shared', ['shared'], { kind: 'authored' }),
    question('auth-t', ['onlyT'], { kind: 'authored' }),
  ],
};

describe('contentForTrack', () => {
  it('gives riazi the shared and riazi-book content', () => {
    const c = contentForTrack(content, 'riazi');
    expect(c.tips.map(t => t.id)).toEqual(['shared', 'riaziChapter']);
    expect(c.questions.map(q => q.id)).toEqual(['r-real', 'auth-shared']);
  });

  it('gives tajrobi the shared and tajrobi-only content, never a crash on empty', () => {
    const c = contentForTrack(content, 'tajrobi');
    expect(c.tips.map(t => t.id)).toEqual(['shared', 'onlyT']);
    expect(c.questions.map(q => q.id)).toEqual(['t-real', 'auth-shared', 'auth-t']);
    expect(contentForTrack({ tips: [], questions: [] }, 'tajrobi')).toEqual({ tips: [], questions: [] });
  });
});

describe('parseKonkurContent tracks', () => {
  it('keeps valid tip tracks and drops unknown ones', () => {
    const parsed = parseKonkurContent({
      tips: [
        { id: 'a', grade: null, title: 'a', body: ['x'], tracks: ['tajrobi', 'bogus'] },
        { id: 'b', grade: null, title: 'b', body: ['x'], tracks: ['bogus'] },
        { id: 'c', grade: null, title: 'c', body: ['x'], tracks: null },
      ],
      questions: [],
    });
    expect(parsed?.tips.find(t => t.id === 'a')?.tracks).toEqual(['tajrobi']);
    expect(parsed?.tips.find(t => t.id === 'b')?.tracks).toBeUndefined();
    expect(parsed?.tips.find(t => t.id === 'c')?.tracks).toBeUndefined();
  });
});

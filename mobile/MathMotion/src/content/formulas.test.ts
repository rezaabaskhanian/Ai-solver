import { CURRICULUM } from './curriculum';
import { CHAPTER_FORMULAS, findFormulaChapter, formulaChaptersForTrack, formulasForChapter } from './formulas';

const chapterIds = new Set(CURRICULUM.flatMap(g => g.books.flatMap(b => b.chapters.map(c => c.id))));

describe('formula sheets', () => {
  it('only describe chapters that exist, once each, with content', () => {
    const seen = new Set<string>();
    for (const entry of CHAPTER_FORMULAS) {
      expect(chapterIds.has(entry.chapterId)).toBe(true);
      expect(seen.has(entry.chapterId)).toBe(false);
      seen.add(entry.chapterId);
      expect(entry.items.length).toBeGreaterThan(0);
      for (const item of entry.items) {
        expect(item.caption.trim().length).toBeGreaterThan(0);
        expect(item.lines.length).toBeGreaterThan(0);
      }
    }
  });

  it('math lines have balanced brackets, no underscores and no Persian words', () => {
    for (const entry of CHAPTER_FORMULAS) {
      for (const item of entry.items) {
        for (const line of item.lines) {
          if (typeof line === 'string') {
            continue;
          }
          const m = line.math;
          expect(m).not.toMatch(/_/);
          expect(m).not.toMatch(/[؀-ۿ]/);
          let depth = 0;
          for (const ch of m) {
            depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
            expect(depth).toBeGreaterThanOrEqual(0);
          }
          expect(depth).toBe(0);
        }
      }
    }
  });

  it('cover grades 10-12 for both tracks', () => {
    for (const track of ['riazi', 'tajrobi'] as const) {
      const refs = formulaChaptersForTrack(track);
      expect(refs.length).toBeGreaterThanOrEqual(15);
      expect(new Set(refs.map(r => r.grade))).toEqual(new Set([10, 11, 12]));
    }
  });

  it('respect the track of the chapter', () => {
    const riazi = formulaChaptersForTrack('riazi').map(r => r.chapter.id);
    const tajrobi = formulaChaptersForTrack('tajrobi').map(r => r.chapter.id);
    expect(riazi.some(id => id.startsWith('g11t_') || id.startsWith('g12t_'))).toBe(false);
    expect(tajrobi.some(id => /^g1[12][chsd]/.test(id) && !id.startsWith('g10'))).toBe(false);
    expect(tajrobi).toContain('g11t_trig');
    expect(riazi).toContain('g12c_derivative');
  });

  it('look up by chapter id', () => {
    expect(formulasForChapter('g12c_derivative')?.items.length).toBeGreaterThan(0);
    expect(formulasForChapter('nope')).toBeUndefined();
    expect(findFormulaChapter('g10_trig')?.grade).toBe(10);
  });
});

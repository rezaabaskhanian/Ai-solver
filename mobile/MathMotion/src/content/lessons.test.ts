import en from '../i18n/locales/en.json';
import fa from '../i18n/locales/fa.json';
import { LESSONS } from './lessons';
import { TOPICS } from './topics';

type Tree = Record<string, unknown>;

function lookup(tree: Tree, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], tree);
}

describe('lessons', () => {
  const entries = Object.entries(LESSONS);

  it('exist for the new topics and only for real topics', () => {
    const ids = TOPICS.map(t => t.id);
    entries.forEach(([id]) => expect(ids).toContain(id));
    ['limit', 'logarithm', 'sets', 'vectors', 'geometry', 'graphs'].forEach(id =>
      expect(LESSONS).toHaveProperty([id]),
    );
  });

  it('have Persian and English text for every key', () => {
    const keys: string[] = [];
    entries.forEach(([id, lesson]) => {
      if (lesson!.intro) keys.push(`lessons.${id}.intro`);
      lesson!.concepts.forEach(c => keys.push(`lessons.${id}.concepts.${c.key}`));
      lesson!.examples.forEach(e => {
        keys.push(`lessons.${id}.examples.${e.key}`);
        e.steps.forEach(s => s.key && keys.push(`lessons.${id}.steps.${s.key}`));
      });
      lesson!.mistakes.forEach(m => keys.push(`lessons.${id}.mistakes.${m.key}`));
    });
    keys.forEach(key => {
      expect(typeof lookup(fa as Tree, key)).toBe('string');
      expect(typeof lookup(en as Tree, key)).toBe('string');
    });
  });

  it('have at least 3 ideas, 2 worked examples and 3 mistakes each', () => {
    entries.forEach(([, lesson]) => {
      expect(lesson!.concepts.length).toBeGreaterThanOrEqual(3);
      expect(lesson!.examples.length).toBeGreaterThanOrEqual(2);
      expect(lesson!.mistakes.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('show every mistake as a wrong line, and a right one when there is one', () => {
    entries.forEach(([, lesson]) => lesson!.mistakes.forEach(m => expect(m.wrong ?? m.right).toBeTruthy()));
  });
});

import { EXAM_SYLLABUS } from '../../content/examSyllabus';
import en from '../../i18n/locales/en.json';
import fa from '../../i18n/locales/fa.json';
import { buildExam, scoreExam } from './buildExam';
import { GENERATORS, type Rng, type SkillId } from './generators';

// Deterministic RNG so a failure is reproducible.
function seeded(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

// Same token set MathExpression renders — anything else would vanish.
const RENDERABLE = /^(\d+(\.\d+)?|[a-zA-Z]+[₀-₉]*|\^|[+\-*/=(),]|[^\s\w]|\s)+$/;

const skills = Object.keys(GENERATORS) as SkillId[];

describe('exam generators', () => {
  it.each(skills)('%s makes valid 4-choice questions', skill => {
    const rng = seeded(skills.indexOf(skill) + 7);
    for (let i = 0; i < 300; i += 1) {
      const q = GENERATORS[skill](rng);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
      q.choices.forEach(c => expect(c).toMatch(RENDERABLE));
      if (q.expression) {
        expect(q.expression).toMatch(RENDERABLE);
      }
      expect(fa.exam.q).toHaveProperty([q.textKey]);
      expect(en.exam.q).toHaveProperty([q.textKey]);
    }
  });

  it('computes linear equation answers correctly', () => {
    const rng = seeded(3);
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.linear(rng);
      // "ax ± b = c"
      const m = q.expression!.match(/^(-?\d*)x(?: ([+-]) (\d+))? = (-?\d+)$/)!;
      const a = Number(m[1]);
      const b = m[2] ? Number(`${m[2]}${m[3]}`) : 0;
      const c = Number(m[4]);
      expect(Number(q.choices[q.answerIndex])).toBe((c - b) / a);
    }
  });

  it('computes gcd answers correctly', () => {
    const rng = seeded(5);
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.gcd(rng);
      const a = Number(q.params!.a);
      const b = Number(q.params!.b);
      const answer = Number(q.choices[q.answerIndex]);
      expect(a % answer).toBe(0);
      expect(b % answer).toBe(0);
      for (let d = answer + 1; d <= Math.min(a, b); d += 1) {
        expect(a % d === 0 && b % d === 0).toBe(false);
      }
    }
  });
});

describe('set and vector generators', () => {
  it('computes vector AB as B - A', () => {
    const rng = seeded(11);
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.vectorFromPoints(rng);
      const [x1, y1, x2, y2] = q.expression!.match(/-?\d+/g)!.map(Number);
      expect(q.choices[q.answerIndex]).toBe(`[${x2 - x1}, ${y2 - y1}]`);
    }
  });

  it('computes set operations correctly', () => {
    const rng = seeded(13);
    const parse = (s: string) => (s === '∅' ? [] : s.slice(1, -1).split(', ').map(Number));
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.setOps(rng);
      const [a, b] = q.expression!.split(' , ').map(part => parse(part.slice(4)));
      const answer = parse(q.choices[q.answerIndex]);
      const want =
        q.textKey === 'set_union'
          ? [...new Set([...a, ...b])]
          : q.textKey === 'set_intersection'
            ? a.filter(n => b.includes(n))
            : a.filter(n => !b.includes(n));
      expect(answer).toEqual(want.sort((x, y) => x - y));
    }
  });
});

describe('solid volume generator', () => {
  it('uses V = 4πr³/3, πr²h/3 and a²h/3', () => {
    const rng = seeded(17);
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.solidVolume(rng);
      const { r, h, a } = q.params as Record<string, number>;
      const want =
        q.textKey === 'sphere_volume'
          ? `${(4 * r ** 3) / 3}π`
          : q.textKey === 'cone_volume'
            ? ((r * r * h) / 3 === 1 ? 'π' : `${(r * r * h) / 3}π`)
            : String((a * a * h) / 3);
      expect(q.choices[q.answerIndex]).toBe(want);
    }
  });
});

describe('grade 10–12 generators', () => {
  const rng = seeded(23);

  it('gives real roots of the quadratic', () => {
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.quadraticRoots(rng);
      const m = q.expression!.match(/^x\^2(?: ([+-]) (\d*)x)?(?: ([+-]) (\d+))? = 0$/)!;
      const b = m[1] ? Number(`${m[1]}${m[2] || '1'}`) : 0;
      const c = m[3] ? Number(`${m[3]}${m[4]}`) : 0;
      q.choices[q.answerIndex].split(' , ').map(Number).forEach(r => expect(r * r + b * r + c).toBe(0));
    }
  });

  it('computes log values as exponents', () => {
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.logValue(rng);
      const [, sub, value] = q.expression!.match(/^log([₀-₉]?)\((\d+)\)$/)!;
      const base = sub ? '₀₁₂₃₄₅₆₇₈₉'.indexOf(sub) : 10;
      expect(base ** Number(q.choices[q.answerIndex])).toBe(Number(value));
    }
  });

  it('cancels the common factor in a 0/0 limit', () => {
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.limitAlgebraic(rng);
      const [, a] = q.expression!.match(/^lim\(x→(-?\d+)\)/)!;
      const x = Number(a);
      // Evaluate the expression just next to the point: it must be close
      // to the answer (works for both the 0/0 and the polynomial kind).
      const body = q.expression!.replace(/^lim\(x→-?\d+\) /, '');
      const js = body.replace(/(\d)x/g, '$1*x').replace(/\^/g, '**').replace(/x/g, '(x)');
      const f = new Function('x', `return ${js};`) as (v: number) => number;
      expect(f(x + 1e-7)).toBeCloseTo(Number(q.choices[q.answerIndex]), 4);
    }
  });

  it('counts the edges of complete graphs', () => {
    for (let i = 0; i < 100; i += 1) {
      const q = GENERATORS.graphCounting(rng);
      const { p, k, q: edges } = q.params as Record<string, number>;
      const answer = Number(q.choices[q.answerIndex]);
      if (q.textKey === 'graph_complete') expect(answer).toBe((p * (p - 1)) / 2);
      if (q.textKey === 'graph_regular') expect(answer).toBe((k * p) / 2);
      if (q.textKey === 'graph_degree_sum') expect(answer).toBe(2 * edges);
      if (q.textKey === 'graph_complement') expect(answer).toBe((p * (p - 1)) / 2 - edges);
    }
  });
});

describe('exam syllabus', () => {
  it('has fa and en titles for every chapter', () => {
    EXAM_SYLLABUS.flatMap(g => g.chapters).forEach(ch => {
      expect(fa.exam.chapters).toHaveProperty([ch.id]);
      expect(en.exam.chapters).toHaveProperty([ch.id]);
    });
  });
});

describe('buildExam / scoreExam', () => {
  it('builds the requested number of questions from the picked chapters only', () => {
    const questions = buildExam(
      { grade: 6, chapterIds: ['g6_fractions', 'g6_ratio'], count: 10 },
      seeded(11),
    );
    expect(questions).toHaveLength(10);
    questions.forEach(q => expect(['g6_fractions', 'g6_ratio']).toContain(q.chapterId));
    // Round-robin: both chapters are covered.
    expect(new Set(questions.map(q => q.chapterId)).size).toBe(2);
  });

  it('returns no questions when only "coming soon" chapters are picked', () => {
    expect(buildExam({ grade: 6, chapterIds: ['g6_symmetry'], count: 5 }, seeded(1))).toEqual([]);
  });

  it('scores answers and lists the weakest chapter first', () => {
    const questions = buildExam(
      { grade: 7, chapterIds: ['g7_integers', 'g7_powers'], count: 4 },
      seeded(2),
    );
    const answers = questions.map(q =>
      q.chapterId === 'g7_integers' ? q.answerIndex : (q.answerIndex + 1) % 4,
    );
    const score = scoreExam(questions, answers);
    expect(score.total).toBe(4);
    expect(score.correct).toBe(2);
    expect(score.percent).toBe(50);
    expect(score.byChapter[0].chapterId).toBe('g7_powers');
  });
});

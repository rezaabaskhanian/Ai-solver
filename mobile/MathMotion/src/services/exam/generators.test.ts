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
const RENDERABLE = /^(\d+(\.\d+)?|[a-zA-Z]+|\^|[+\-*/=(),]|\s)+$/;

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

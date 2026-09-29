import { findGrade, type GradeId } from '../../content/examSyllabus';
import { GENERATORS, shuffle, type GeneratedQuestion, type Rng, type SkillId } from './generators';

export interface ExamConfig {
  grade: GradeId;
  chapterIds: string[];
  count: number;
}

export interface ExamQuestion extends GeneratedQuestion {
  id: string;
  chapterId: string;
  skill: SkillId;
}

// Spreads `count` questions evenly over the picked chapters' skills
// (round-robin, so 10 questions over 3 chapters never all come from one),
// avoids exact repeats, then shuffles the order.
export function buildExam(config: ExamConfig, rng: Rng = Math.random): ExamQuestion[] {
  const grade = findGrade(config.grade);
  const pool = shuffle(
    rng,
    (grade?.chapters ?? [])
      .filter(ch => config.chapterIds.includes(ch.id))
      .flatMap(ch => ch.skills.map(skill => ({ chapterId: ch.id, skill }))),
  );
  if (pool.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const questions: ExamQuestion[] = [];
  for (let i = 0; i < config.count; i += 1) {
    const { chapterId, skill } = pool[i % pool.length];
    let question = GENERATORS[skill](rng);
    for (let tries = 0; tries < 5 && seen.has(signature(question)); tries += 1) {
      question = GENERATORS[skill](rng);
    }
    seen.add(signature(question));
    questions.push({ ...question, id: String(i), chapterId, skill });
  }
  return shuffle(rng, questions);
}

function signature(q: GeneratedQuestion): string {
  return `${q.textKey}|${q.expression ?? ''}|${JSON.stringify(q.params ?? {})}`;
}

export interface ChapterScore {
  chapterId: string;
  correct: number;
  total: number;
}

export interface ExamScore {
  correct: number;
  total: number;
  percent: number;
  byChapter: ChapterScore[];
}

// answers[i] is the chosen choice index for questions[i] (null = skipped).
export function scoreExam(questions: ExamQuestion[], answers: (number | null)[]): ExamScore {
  const byChapter = new Map<string, ChapterScore>();
  let correct = 0;
  questions.forEach((q, i) => {
    const entry = byChapter.get(q.chapterId) ?? { chapterId: q.chapterId, correct: 0, total: 0 };
    entry.total += 1;
    if (answers[i] === q.answerIndex) {
      entry.correct += 1;
      correct += 1;
    }
    byChapter.set(q.chapterId, entry);
  });
  const total = questions.length;
  return {
    correct,
    total,
    percent: total ? Math.round((correct / total) * 100) : 0,
    // Weakest chapter first — that's what to study next.
    byChapter: [...byChapter.values()].sort((a, b) => a.correct / a.total - b.correct / b.total),
  };
}

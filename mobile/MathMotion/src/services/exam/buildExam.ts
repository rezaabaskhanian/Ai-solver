import { findGrade, type GradeId } from '../../content/examSyllabus';
import type { StudyTrack } from '../../content/track';
import type { ImageSourcePropType } from 'react-native';

import { GENERATORS, shuffle, type GeneratedQuestion, type Rng, type SkillId } from './generators';
import { groupScores, tally, type GroupScore } from './scoring';

// Which real konkur paper a full-year exam is built from (one booklet:
// 1402 and the abroad papers have several per year).
export interface KonkurExamSelector {
  year: number;
  abroad?: boolean;
  newSystem?: boolean;
  round?: 1 | 2;
  // The paper's study track; missing = riazi (older configs).
  track?: StudyTrack;
}

export interface ExamConfig {
  grade: GradeId;
  chapterIds: string[];
  count: number;
  // Time limit in seconds; when missing the exam uses 60 s per question.
  durationSec?: number;
  // Set for a «full konkur year» exam; questions then come from the
  // konkur content instead of the generators.
  konkur?: KonkurExamSelector;
}

export interface ExamQuestion extends GeneratedQuestion {
  id: string;
  chapterId: string;
  skill: SkillId;
  // Konkur questions carry their own Persian text (textKey is '') and,
  // optionally, the figure and the topic (main tip) they belong to.
  text?: string;
  figure?: ImageSourcePropType;
  choicesMath?: boolean;
  konkurId?: string;
  topicId?: string;
  topicLabel?: string;
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

export interface TopicScore extends GroupScore {
  label: string;
}

export interface ExamScore {
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  // 3*correct - wrong.
  points: number;
  // Konkur percentage (3*correct - wrong) / (3*total) * 100; can be negative.
  percent: number;
  // Generated exams: per chapter, weakest first.
  byChapter: ChapterScore[];
  // Konkur exams: per topic (main tip) when the questions carry one.
  byTopic: TopicScore[];
}

// answers[i] is the chosen choice index for questions[i] (null = blank).
export function scoreExam(questions: ExamQuestion[], answers: (number | null)[]): ExamScore {
  const counts = tally(
    questions.map(q => q.answerIndex),
    answers,
  );
  const chapters = groupScores(
    questions.map(q => ({ key: q.topicId ? '' : q.chapterId, answerIndex: q.answerIndex })),
    answers,
  );
  const topics = groupScores(
    questions.map(q => ({ key: q.topicId ?? '', answerIndex: q.answerIndex })),
    answers,
  );
  const labels = new Map<string, string>();
  questions.forEach(q => {
    if (q.topicId) {
      labels.set(q.topicId, q.topicLabel ?? q.topicId);
    }
  });
  return {
    ...counts,
    byChapter: chapters.map(g => ({ chapterId: g.key, correct: g.correct, total: g.total })),
    byTopic: topics.map(g => ({ ...g, label: labels.get(g.key) ?? g.key })),
  };
}

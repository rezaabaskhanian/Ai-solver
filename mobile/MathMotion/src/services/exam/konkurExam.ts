import type { KonkurContent, KonkurQuestion, KonkurSource } from '../../content/konkur';
import { DEFAULT_TRACK, type StudyTrack } from '../../content/track';
import type { ExamConfig, ExamQuestion, KonkurExamSelector } from './buildExam';
import { KONKUR_SECONDS_PER_QUESTION } from './scoring';

// «Full konkur year» exam: every question of one real paper of the
// student's track, in booklet order, against the clock.

type RealSource = Extract<KonkurSource, { kind: 'konkur' }>;

function realSource(q: KonkurQuestion, track: StudyTrack): RealSource | null {
  return q.source.kind === 'konkur' && q.source.track === track ? q.source : null;
}

function matches(source: RealSource, sel: KonkurExamSelector): boolean {
  return (
    source.track === (sel.track ?? DEFAULT_TRACK) &&
    source.year === sel.year &&
    Boolean(source.abroad) === Boolean(sel.abroad) &&
    Boolean(source.newSystem) === Boolean(sel.newSystem) &&
    (source.round ?? 0) === (sel.round ?? 0)
  );
}

// A paper needs at least this many questions in the content to be offered
// (some years are only partially transcribed).
export const MIN_PAPER_QUESTIONS = 10;

export interface KonkurPaper {
  selector: KonkurExamSelector;
  questionCount: number;
}

// Papers with enough questions, newest year first.
export function konkurPapers(content: KonkurContent, track: StudyTrack = DEFAULT_TRACK): KonkurPaper[] {
  const papers: KonkurPaper[] = [];
  content.questions.forEach(q => {
    const source = realSource(q, track);
    if (!source) {
      return;
    }
    const sel: KonkurExamSelector = {
      year: source.year,
      track,
      ...(source.abroad ? { abroad: true } : {}),
      ...(source.newSystem ? { newSystem: true } : {}),
      ...(source.round ? { round: source.round } : {}),
    };
    const existing = papers.find(p => matches(source, p.selector));
    if (existing) {
      existing.questionCount += 1;
    } else {
      papers.push({ selector: sel, questionCount: 1 });
    }
  });
  return papers
    .filter(p => p.questionCount >= MIN_PAPER_QUESTIONS)
    .sort((a, b) => b.selector.year - a.selector.year || (a.selector.round ?? 0) - (b.selector.round ?? 0));
}

export function konkurPaperQuestions(content: KonkurContent, sel: KonkurExamSelector): KonkurQuestion[] {
  return content.questions
    .filter(q => {
      const source = realSource(q, sel.track ?? DEFAULT_TRACK);
      return source !== null && matches(source, sel);
    })
    .sort((a, b) => {
      const na = (a.source.kind === 'konkur' ? a.source.number : undefined) ?? 0;
      const nb = (b.source.kind === 'konkur' ? b.source.number : undefined) ?? 0;
      return na - nb;
    });
}

export function konkurExamDurationSec(questionCount: number): number {
  return questionCount * KONKUR_SECONDS_PER_QUESTION;
}

export function konkurExamConfig(paper: KonkurPaper): ExamConfig {
  return {
    grade: 12,
    chapterIds: [],
    count: paper.questionCount,
    durationSec: konkurExamDurationSec(paper.questionCount),
    konkur: paper.selector,
  };
}

// Questions keep booklet order (no shuffle) and carry their main tip as
// the topic for the per-topic result.
export function buildKonkurExam(content: KonkurContent, sel: KonkurExamSelector): ExamQuestion[] {
  return konkurPaperQuestions(content, sel).map((q, i) => {
    const topicId = q.tipIds[0];
    const tip = topicId ? content.tips.find(t => t.id === topicId) : undefined;
    return {
      id: String(i),
      chapterId: tip?.chapterId ?? 'konkur',
      skill: 'primes' as const,
      textKey: '',
      text: q.text,
      expression: q.expression,
      figure: q.figure,
      choices: [...q.choices],
      choicesMath: q.choicesMath,
      answerIndex: q.answer,
      konkurId: q.id,
      topicId: tip ? tip.id : undefined,
      topicLabel: tip?.title,
    };
  });
}

// Stable id of a paper on the server (konkur_exam_results.paper_key), e.g.
// riazi-1403-r1 or tajrobi-1404-r2-abroad.
export function paperKeyOf(sel: KonkurExamSelector): string {
  return [
    sel.track ?? DEFAULT_TRACK,
    String(sel.year),
    ...(sel.round ? [`r${sel.round}`] : []),
    ...(sel.abroad ? ['abroad'] : []),
    ...(sel.newSystem ? ['new'] : []),
  ].join('-');
}

import { API_BASE_URL } from '../../config/env';
import type { KonkurContent, KonkurQuestion } from '../../content/konkur';
import type { ExamQuestion } from './buildExam';
import { shuffle, type Rng } from './generators';

// A chapter exam's «question bank»: the multiple-choice questions (konkur
// or authored, added from the admin panel) whose main tip belongs to the
// chapter. A chapter with bank questions can be examined even without a
// generator, so filling a chapter needs no app release.

function chapterOf(q: KonkurQuestion, content: KonkurContent): string | undefined {
  const mainTip = q.tipIds[0];
  return mainTip ? content.tips.find(t => t.id === mainTip)?.chapterId : undefined;
}

// How many bank questions each chapter has.
export function chapterBankCounts(content: KonkurContent): Map<string, number> {
  const counts = new Map<string, number>();
  content.questions.forEach(q => {
    const chapterId = chapterOf(q, content);
    if (chapterId) {
      counts.set(chapterId, (counts.get(chapterId) ?? 0) + 1);
    }
  });
  return counts;
}

function toExamQuestion(q: KonkurQuestion, chapterId: string): ExamQuestion {
  const figure =
    q.figure ??
    (q.figureUrl
      ? {
          uri: /^https?:\/\//i.test(q.figureUrl)
            ? q.figureUrl
            : `${API_BASE_URL}${q.figureUrl.startsWith('/') ? '' : '/'}${q.figureUrl}`,
        }
      : undefined);
  return {
    id: q.id,
    chapterId,
    // Not generated: the skill is only a placeholder (as in konkurExam).
    skill: 'primes',
    textKey: '',
    text: q.text,
    expression: q.expression,
    figure,
    choices: [...q.choices],
    choicesMath: q.choicesMath,
    answerIndex: q.answer,
    // Real questions also feed «پیشرفت من»; scored per chapter (no topicId).
    konkurId: q.id,
  };
}

// The picked chapters' bank questions, interleaved chapter by chapter so
// one big chapter doesn't crowd out the others, each chapter shuffled.
export function chapterBankQuestions(
  content: KonkurContent,
  chapterIds: string[],
  rng: Rng = Math.random,
): ExamQuestion[] {
  const byChapter = new Map<string, ExamQuestion[]>();
  content.questions.forEach(q => {
    const chapterId = chapterOf(q, content);
    if (chapterId && chapterIds.includes(chapterId)) {
      byChapter.set(chapterId, [...(byChapter.get(chapterId) ?? []), toExamQuestion(q, chapterId)]);
    }
  });
  const lists = shuffle(rng, [...byChapter.values()].map(list => shuffle(rng, list)));
  const out: ExamQuestion[] = [];
  for (let i = 0; lists.some(list => i < list.length); i += 1) {
    lists.forEach(list => {
      if (i < list.length) {
        out.push(list[i]);
      }
    });
  }
  return out;
}

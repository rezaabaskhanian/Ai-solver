import { findKonkurTip, type KonkurContent } from './index';
import type { KonkurLine, KonkurQuestion } from './types';

// «مسیر حل»: the pure logic behind a question's solving path — the
// solution split into steps (revealed one at a time) and the hints shown
// before answering.

// Splits a flat solution into steps: a step is prose followed by the math
// lines it explains, so a prose line that comes after math starts the
// next step. Consecutive prose lines stay together.
export function solutionSteps(lines: KonkurLine[]): KonkurLine[][] {
  const steps: KonkurLine[][] = [];
  let current: KonkurLine[] = [];
  let hasMath = false;
  lines.forEach(line => {
    const isMath = typeof line !== 'string';
    if (!isMath && hasMath) {
      steps.push(current);
      current = [];
      hasMath = false;
    }
    current.push(line);
    hasMath = hasMath || isMath;
  });
  if (current.length > 0) {
    steps.push(current);
  }
  return steps;
}

// The hints for a question, general to specific. A written guide wins;
// otherwise: which tip(s) the question is solved with, then — only when
// the solution is long enough that it doesn't give the whole thing
// away — its first step.
export function hintsFor(question: KonkurQuestion, content: KonkurContent): KonkurLine[][] {
  if (question.guide?.hints && question.guide.hints.length > 0) {
    return question.guide.hints;
  }
  const hints: KonkurLine[][] = [];
  const titles = question.tipIds
    .map(id => findKonkurTip(id, content)?.title)
    .filter((title): title is string => !!title);
  if (titles.length > 0) {
    const [main, ...others] = titles;
    const tipHint: KonkurLine[] = [`ایده‌ی اصلی این تست، نکته‌ی «${main}» است.`];
    if (others.length > 0) {
      tipHint.push(`کمکی: ${others.map(t => `«${t}»`).join('، ')}.`);
    }
    hints.push(tipHint);
  }
  const steps = solutionSteps(question.solution);
  if (steps.length >= 3) {
    hints.push(['قدم اول حل این است:', ...steps[0]]);
  }
  return hints;
}

// Whether the question has a written "understand the question" part.
export function hasUnderstandStep(question: KonkurQuestion): boolean {
  return !!(question.guide?.given?.length || question.guide?.asked?.length);
}

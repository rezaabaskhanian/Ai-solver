import {
  ARITHMETIC_SYMBOLS,
  operationDisplayLabel,
  translatedOperationLabel,
} from '../StepViewer/OperationBadge';
import type { SolutionStep } from '../../types/problem';

const ARITHMETIC_OPERATIONS = Object.keys(ARITHMETIC_SYMBOLS);

// A handful of non-arithmetic operations to draw wrong answers from when
// the correct step isn't a "both sides" arithmetic op (e.g. move_term,
// factor, power_rule, ...) and so has no numeric value to swap the sign
// on. Any 3 of these read as plausible-but-wrong next actions regardless
// of the actual step, which is all PRD section 20's example asks for.
const GENERIC_OPERATION_POOL = ['move_term', 'factor', 'expand', 'simplify'];

export interface QuizChoice {
  label: string;
  correct: boolean;
}

// Small seeded shuffle so the same step always renders the same option
// order (stable across re-renders of the same question) without every
// question putting the correct answer in the same slot.
function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  const next = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Builds the 4 multiple-choice options for "what should we do to this
// step?" (PRD section 20) — one correct (the step's actual operation) and
// three plausible-but-wrong ones, in a stable-per-step shuffled order.
export function buildQuizChoices(step: SolutionStep, t: (key: string, opts?: object) => string): QuizChoice[] {
  const correctLabel = operationDisplayLabel(step, t);
  const hasArithmeticValue = Boolean(ARITHMETIC_SYMBOLS[step.operation]) && Boolean(step.value);

  const distractorLabels = hasArithmeticValue
    ? ARITHMETIC_OPERATIONS.filter(op => op !== step.operation).map(
        op => `${ARITHMETIC_SYMBOLS[op]} ${step.value}`,
      )
    : GENERIC_OPERATION_POOL.filter(op => op !== step.operation)
        .slice(0, 3)
        .map(op => translatedOperationLabel(op, t));

  const choices: QuizChoice[] = [
    { label: correctLabel, correct: true },
    ...distractorLabels.map(label => ({ label, correct: false })),
  ];

  return seededShuffle(choices, step.id);
}

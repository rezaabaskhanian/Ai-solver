import {
  ARITHMETIC_SYMBOLS,
  operationDisplayLabel,
  translatedOperationLabel,
} from '../StepViewer/OperationBadge';
import type { ProblemType, SolutionStep } from '../../types/problem';

const ARITHMETIC_OPERATIONS = Object.keys(ARITHMETIC_SYMBOLS);

// A handful of non-arithmetic operations to draw wrong answers from when
// the correct step isn't a "both sides" arithmetic op (e.g. move_term,
// factor, power_rule, ...) and so has no numeric value to swap the sign
// on. Any 3 of these read as plausible-but-wrong next actions regardless
// of the actual step, which is all PRD section 20's example asks for.
const GENERIC_OPERATION_POOL = ['move_term', 'factor', 'expand', 'simplify'];

// Per problem type, the moves that belong to that kind of problem (the
// operation names backend/math-engine/app/solver/* emit), so a wrong
// option is a real alternative ("intersection" when the step is a union)
// rather than something from another chapter.
export const OPERATION_POOLS: Partial<Record<ProblemType, string[]>> = {
  derivative: ['sum_rule', 'power_rule', 'trig_rule', 'constant_rule', 'combine'],
  integral: ['sum_rule', 'power_rule', 'trig_rule', 'constant_rule', 'log_rule', 'add_constant'],
  limit: [
    'substitute',
    'indeterminate_form',
    'factor',
    'multiply_conjugate',
    'cancel',
    'keep_leading_terms',
    'one_sided_limit',
  ],
  log_equation: ['domain', 'combine_logs', 'drop_logs', 'to_exponential', 'reject_root', 'move_term', 'factor'],
  exponential_equation: ['same_base', 'equate_exponents', 'take_log', 'to_exponential', 'move_term'],
  set_operation: ['union', 'intersection', 'difference', 'complement', 'count', 'counting_formula'],
  vector: ['vector_from_points', 'scale', 'add', 'subtract', 'length'],
  geometry: ['formula', 'compute', 'approximate', 'square_root'],
  graph: ['handshake', 'havel_hakimi', 'degree_bound', 'count', 'degrees', 'min_max_degree'],
};

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
// `problemType` picks wrong options from the same kind of problem.
export function buildQuizChoices(
  step: SolutionStep,
  t: (key: string, opts?: object) => string,
  problemType?: ProblemType,
): QuizChoice[] {
  const correctLabel = operationDisplayLabel(step, t);
  const hasArithmeticValue = Boolean(ARITHMETIC_SYMBOLS[step.operation]) && Boolean(step.value);

  let distractorLabels: string[];
  if (hasArithmeticValue) {
    distractorLabels = ARITHMETIC_OPERATIONS.filter(op => op !== step.operation).map(
      op => `${ARITHMETIC_SYMBOLS[op]} ${step.value}`,
    );
  } else {
    // The type's own moves first (varied per step), then the generic
    // pool to top up; never a label equal to the correct one.
    const own = seededShuffle((problemType && OPERATION_POOLS[problemType]) ?? [], step.id + 7);
    distractorLabels = [];
    for (const op of [...own, ...GENERIC_OPERATION_POOL]) {
      const label = translatedOperationLabel(op, t);
      if (op !== step.operation && label !== correctLabel && !distractorLabels.includes(label)) {
        distractorLabels.push(label);
      }
    }
    distractorLabels = distractorLabels.slice(0, 3);
  }

  const choices: QuizChoice[] = [
    { label: correctLabel, correct: true },
    ...distractorLabels.map(label => ({ label, correct: false })),
  ];

  return seededShuffle(choices, step.id);
}

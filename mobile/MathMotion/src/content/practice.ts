import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { ProblemType } from '../types/problem';

// Types backend/math-engine/app/solver/practice.py can generate a fresh
// problem for ("practice similar" on Solution, "practice" on a Topic).
export const PRACTICE_TYPES: ProblemType[] = [
  'linear_equation',
  'quadratic_equation',
  'expression',
  'arithmetic',
  'limit',
  'log_equation',
  'exponential_equation',
  'set_operation',
  'vector',
];

// Types CheckSteps can check line by line (backend/math-engine/app/
// solver/check.py). Practice for these goes there, so the student works
// it out themselves; the rest open on ProblemInput, where they try it on
// paper and then Solve (or Quiz) to compare.
const STEP_CHECK_TYPES: ProblemType[] = ['linear_equation', 'quadratic_equation', 'expression', 'arithmetic'];

// Only `navigate` is used, so any screen's navigation prop fits.
export function openPractice(
  navigation: Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'>,
  type: ProblemType,
  problem: string,
): void {
  if (STEP_CHECK_TYPES.includes(type)) {
    navigation.navigate('CheckSteps', { problem });
  } else {
    navigation.navigate('ProblemInput', { initialProblem: problem });
  }
}

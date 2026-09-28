import type { ProblemType } from '../types/problem';

// The «مباحث درسی» (topics) list in the side drawer. Titles and intro text
// live in i18n (topics.<id>.title / .summary / .tip), so a Google Play
// English build needs no changes here.
//
// Every example must be something the math engine actually parses and
// solves — they're sent through the normal Solve flow. The input formats
// below (d/dx(...), ∫... dx, integrate(..., x)) are the ones
// backend/math-engine/app/solver/parser.py and its tests accept.
export interface Topic {
  id: TopicId;
  icon: string;
  examples: string[];
  // Set only for types backend/math-engine/app/solver/practice.py can
  // generate; the topic then offers "practice a fresh one yourself".
  practiceType?: ProblemType;
}

export type TopicId =
  | 'arithmetic'
  | 'fractions'
  | 'powers'
  | 'expressions'
  | 'linear'
  | 'quadratic'
  | 'trig'
  | 'derivative'
  | 'integral';

export const TOPICS: Topic[] = [
  {
    id: 'arithmetic',
    icon: '🔢',
    examples: ['2*(3 + 4)', '12/4 + 3^2', '(5 - 8)*2 + 10'],
    practiceType: 'arithmetic',
  },
  {
    id: 'fractions',
    icon: '➗',
    examples: ['1/2 + 1/3', '3/4 * 2/9', '5/6 - 1/4'],
  },
  {
    id: 'powers',
    icon: '²',
    examples: ['2^3 * 2^2', 'x^2 * x^3', '(x^3)^2'],
  },
  {
    id: 'expressions',
    icon: '✏️',
    examples: ['2x + 3x', '3(x + 2) + 2x', '4(x - 1) - 2(x + 3)'],
    practiceType: 'expression',
  },
  {
    id: 'linear',
    icon: '⚖️',
    examples: ['2x + 5 = 17', '3(x + 2) = 15', 'x/3 + 4 = 9'],
    practiceType: 'linear_equation',
  },
  {
    id: 'quadratic',
    icon: '📈',
    examples: ['x^2 - 5x + 6 = 0', 'x^2 - 4 = 0', 'x^2 + x - 1 = 0'],
    practiceType: 'quadratic_equation',
  },
  {
    id: 'trig',
    icon: '📐',
    examples: ['sin(x)^2 + cos(x)^2', 'sin(pi/6)', 'tan(x)*cos(x)'],
  },
  {
    id: 'derivative',
    icon: '📉',
    examples: ['d/dx(x^2 + 3x)', 'd/dx(x^3 + sin(x))', 'derivative(cos(x) + 5, x)'],
  },
  {
    id: 'integral',
    icon: '∫',
    examples: ['∫x^2 dx', 'integrate(3x^2 + 2x, x)', 'integrate(1/x + cos(x), x)'],
  },
];

export function findTopic(id: TopicId): Topic | undefined {
  return TOPICS.find(topic => topic.id === id);
}

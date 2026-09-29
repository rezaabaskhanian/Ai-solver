import type { IconName } from '../components/common/Icon';
import type { ProblemType } from '../types/problem';

// The «مباحث درسی» (topics) list in the side drawer. Titles and intro text
// live in i18n (topics.<id>.title / .summary / .tip), so a Google Play
// English build needs no changes here.
//
// Every example must be something the math engine actually parses and
// solves — they're sent through the normal Solve flow. The input formats
// below (d/dx(...), ∫... dx, integrate(..., x), lim(x→a)..., log_2(x),
// A={1,2}, [2, 3]) are the ones backend/math-engine/app/solver/parser.py
// and its tests accept.
export interface Topic {
  id: TopicId;
  icon: IconName;
  examples: string[];
  // Set only for types backend/math-engine/app/solver/practice.py can
  // generate (content/practice.ts PRACTICE_TYPES); the topic then offers
  // "practice a fresh one yourself".
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
  | 'integral'
  | 'limit'
  | 'logarithm'
  | 'sets'
  | 'vectors'
  | 'geometry'
  | 'graphs';

export const TOPICS: Topic[] = [
  {
    id: 'arithmetic',
    icon: 'calculate',
    examples: ['2*(3 + 4)', '12/4 + 3^2', '(5 - 8)*2 + 10'],
    practiceType: 'arithmetic',
  },
  {
    id: 'fractions',
    icon: 'pie-chart',
    examples: ['1/2 + 1/3', '3/4 * 2/9', '5/6 - 1/4'],
  },
  {
    id: 'powers',
    icon: 'superscript',
    examples: ['2^3 * 2^2', 'x^2 * x^3', '(x^3)^2'],
  },
  {
    id: 'expressions',
    icon: 'edit-note',
    examples: ['2x + 3x', '3(x + 2) + 2x', '4(x - 1) - 2(x + 3)'],
    practiceType: 'expression',
  },
  {
    id: 'linear',
    icon: 'balance',
    examples: ['2x + 5 = 17', '3(x + 2) = 15', 'x/3 + 4 = 9'],
    practiceType: 'linear_equation',
  },
  {
    id: 'quadratic',
    icon: 'show-chart',
    examples: ['x^2 - 5x + 6 = 0', 'x^2 - 4 = 0', 'x^2 + x - 1 = 0'],
    practiceType: 'quadratic_equation',
  },
  {
    id: 'trig',
    icon: 'change-history',
    examples: ['sin(x)^2 + cos(x)^2', 'sin(pi/6)', 'tan(x)*cos(x)'],
  },
  {
    id: 'derivative',
    icon: 'trending-down',
    examples: ['d/dx(x^2 + 3x)', 'd/dx(x^3 + sin(x))', 'derivative(cos(x) + 5, x)'],
  },
  {
    id: 'integral',
    icon: 'functions',
    examples: ['∫x^2 dx', 'integrate(3x^2 + 2x, x)', 'integrate(1/x + cos(x), x)'],
  },
  {
    id: 'limit',
    icon: 'arrow-right-alt',
    practiceType: 'limit',
    examples: ['lim(x→2) (x^2 - 4)/(x - 2)', 'lim(x→4) (sqrt(x) - 2)/(x - 4)', 'lim(x→∞) (2x^2 + 1)/(x^2 - 3)', 'lim(x→1) 1/(x - 1)'],
  },
  {
    id: 'logarithm',
    icon: 'stacked-line-chart',
    practiceType: 'log_equation',
    examples: ['log_2(x) + log_2(x - 2) = 3', 'log(x) = 2', '2^(x + 1) = 8', '4^x = 2^(x + 3)'],
  },
  {
    id: 'sets',
    icon: 'join-inner',
    practiceType: 'set_operation',
    examples: [
      'A={1,2,3}, B={2,3,4}, A∪B',
      'A={1,2,3}, B={2,3,4}, (A∪B)-(A∩B)',
      "U={1,2,3,4,5,6}, A={1,2}, A'",
      'A={a,b,c}, n(P(A))',
      'n(A)=5, n(B)=7, n(A∩B)=3, n(A∪B)',
    ],
  },
  {
    id: 'vectors',
    icon: 'north-east',
    practiceType: 'vector',
    examples: ['[2, 3] + [1, -4]', '3[2, -1] - [1, 5]', 'A(1, 2), B(4, 6), AB', 'A(1, 2), B(4, 6), |AB|'],
  },
  {
    // TopicScreen also links to the geometry calculator (GeometryScreen),
    // which builds these same lines from a shape picker.
    id: 'geometry',
    icon: 'square-foot',
    examples: [
      'pythagoras(a=3, b=4)',
      'area(circle, r=3)',
      'volume(cone, r=3, h=4)',
      'angle_sum(polygon, n=6)',
    ],
  },
  {
    id: 'graphs',
    icon: 'hub',
    examples: [
      'complete_graph(p=6)',
      'regular_graph(p=8, k=3)',
      'complement_edges(p=6, q=9)',
      'degree_sequence(3, 3, 2, 2, 2)',
      'graph(ab, bc, cd, da, ac)',
    ],
  },
];

export function findTopic(id: TopicId): Topic | undefined {
  return TOPICS.find(topic => topic.id === id);
}

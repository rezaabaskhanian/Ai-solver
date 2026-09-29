import type { TopicId } from './topics';

// «درسنامه»: a short lesson per topic, shown on its Topic screen — the
// idea, worked examples and common mistakes. Sentences are i18n keys
// under lessons.<topic>.<key>; the math sits in its own fields and is
// drawn by MathExpression (always LTR), never inside a Persian sentence
// where RTL layout would scramble it.
//
// Every worked example's `problem` is something the math engine solves
// (the "try it" button sends it to ProblemInput), and its `answer` must
// match the engine's — backend/math-engine/tests/test_lessons.py checks
// both.

export interface LessonConcept {
  key: string;
  formula?: string;
}

export interface LessonStep {
  math: string;
  key?: string;
}

export interface LessonExample {
  key: string;
  problem: string;
  steps: LessonStep[];
  answer: string;
}

export interface LessonMistake {
  key: string;
  wrong?: string;
  right?: string;
}

export interface Lesson {
  concepts: LessonConcept[];
  examples: LessonExample[];
  mistakes: LessonMistake[];
}

export const LESSONS: Partial<Record<TopicId, Lesson>> = {
  limit: {
    concepts: [
      { key: 'meaning', formula: 'lim(x→a) f(x) = L' },
      { key: 'substitute', formula: 'lim(x→3) (2x + 1) = 7' },
      { key: 'zeroOverZero', formula: '(x^2 - 4)/(x - 2) = x + 2' },
      { key: 'infinite', formula: 'lim(x→0⁺) 1/x = ∞' },
      { key: 'atInfinity', formula: 'lim(x→∞) (2x^2 + 1)/(x^2 - 3) = 2' },
    ],
    examples: [
      {
        key: 'factor',
        problem: 'lim(x→2) (x^2 - 4)/(x - 2)',
        steps: [
          { math: '(2^2 - 4)/(2 - 2) = 0/0', key: 'factor1' },
          { math: '(x - 2)(x + 2)/(x - 2)', key: 'factor2' },
          { math: 'x + 2', key: 'factor3' },
          { math: '2 + 2 = 4', key: 'factor4' },
        ],
        answer: '4',
      },
      {
        key: 'conjugate',
        problem: 'lim(x→4) (sqrt(x) - 2)/(x - 4)',
        steps: [
          { math: '(sqrt(4) - 2)/(4 - 4) = 0/0', key: 'conjugate1' },
          { math: '(x - 4)/((x - 4)(sqrt(x) + 2))', key: 'conjugate2' },
          { math: '1/(sqrt(x) + 2)', key: 'conjugate3' },
          { math: '1/(2 + 2) = 1/4', key: 'conjugate4' },
        ],
        answer: '1/4',
      },
    ],
    mistakes: [
      { key: 'zeroOverZero', wrong: '0/0 = 1' },
      { key: 'infinityOverInfinity', wrong: '∞/∞ = 1', right: 'lim(x→∞) (2x^2 + 1)/(x^2 - 3) = 2' },
      { key: 'sides', wrong: 'lim(x→1) 1/(x - 1) = ∞', right: 'lim(x→1) 1/(x - 1) = ∄' },
    ],
  },

  logarithm: {
    concepts: [
      { key: 'meaning', formula: 'log₂(8) = 3 ⟺ 2^3 = 8' },
      { key: 'bases', formula: 'log(100) = 2' },
      { key: 'product', formula: 'log(ab) = log(a) + log(b)' },
      { key: 'quotient', formula: 'log(a/b) = log(a) - log(b)' },
      { key: 'power', formula: 'log(a^k) = k·log(a)' },
      { key: 'domain', formula: 'log(A) → A > 0' },
      { key: 'exponential', formula: '2^(x + 1) = 2^3 → x + 1 = 3' },
    ],
    examples: [
      {
        key: 'logEquation',
        problem: 'log_2(x) + log_2(x - 2) = 3',
        steps: [
          { math: 'x > 0 , x - 2 > 0', key: 'logEquation1' },
          { math: 'log₂(x(x - 2)) = 3', key: 'logEquation2' },
          { math: 'x(x - 2) = 2^3 = 8', key: 'logEquation3' },
          { math: 'x^2 - 2x - 8 = 0 → (x - 4)(x + 2) = 0', key: 'logEquation4' },
          { math: 'x = 4 ✓ , x = -2 ✗', key: 'logEquation5' },
        ],
        answer: 'x = 4',
      },
      {
        key: 'sameBase',
        problem: '9^x = 27',
        steps: [
          { math: '3^(2x) = 3^3', key: 'sameBase1' },
          { math: '2x = 3', key: 'sameBase2' },
          { math: 'x = 3/2' },
        ],
        answer: 'x = 3/2',
      },
    ],
    mistakes: [
      { key: 'sum', wrong: 'log(a + b) = log(a) + log(b)', right: 'log(ab) = log(a) + log(b)' },
      { key: 'domain', wrong: 'x = 4 , x = -2', right: 'x = 4' },
      { key: 'quotient', wrong: 'log(a)/log(b) = log(a/b)', right: 'log(a) - log(b) = log(a/b)' },
    ],
  },

  sets: {
    concepts: [
      { key: 'meaning', formula: '{1, 2, 2, 3} = {1, 2, 3}' },
      { key: 'union', formula: '{1, 2} ∪ {2, 3} = {1, 2, 3}' },
      { key: 'intersection', formula: '{1, 2} ∩ {2, 3} = {2}' },
      { key: 'difference', formula: '{1, 2} - {2, 3} = {1}' },
      { key: 'complement', formula: "U = {1, 2, 3, 4} , A = {1, 2} → A' = {3, 4}" },
      { key: 'subsets', formula: 'n(P(A)) = 2^n' },
      { key: 'counting', formula: 'n(A ∪ B) = n(A) + n(B) - n(A ∩ B)' },
    ],
    examples: [
      {
        key: 'operations',
        problem: 'A={1,2,3}, B={2,3,4}, (A∪B)-(A∩B)',
        steps: [
          { math: 'A ∪ B = {1, 2, 3, 4}', key: 'operations1' },
          { math: 'A ∩ B = {2, 3}', key: 'operations2' },
          { math: '{1, 2, 3, 4} - {2, 3} = {1, 4}', key: 'operations3' },
        ],
        answer: '{1, 4}',
      },
      {
        key: 'counting',
        problem: 'n(A)=8, n(B)=6, n(A∪B)=11, n(A∩B)',
        steps: [
          { math: 'n(A ∪ B) = n(A) + n(B) - n(A ∩ B)', key: 'counting1' },
          { math: '11 = 8 + 6 - x', key: 'counting2' },
          { math: 'x = 14 - 11 = 3' },
        ],
        answer: '3',
      },
    ],
    mistakes: [
      { key: 'repeat', wrong: '{1, 2} ∪ {2, 3} = {1, 2, 2, 3}', right: '{1, 2} ∪ {2, 3} = {1, 2, 3}' },
      { key: 'order', wrong: '{1, 2} - {2, 3} = {3}', right: '{1, 2} - {2, 3} = {1}' },
      { key: 'counting', wrong: 'n(A ∪ B) = n(A) + n(B)', right: 'n(A ∪ B) = n(A) + n(B) - n(A ∩ B)' },
    ],
  },

  vectors: {
    concepts: [
      { key: 'meaning', formula: '[3, -2]' },
      { key: 'fromPoints', formula: 'A(1, 2) , B(4, 6) → AB = [3, 4]' },
      { key: 'add', formula: '[2, 3] + [1, -4] = [3, -1]' },
      { key: 'scale', formula: '3[2, -1] = [6, -3]' },
      { key: 'length', formula: '|[a, b]| = sqrt(a^2 + b^2)' },
    ],
    examples: [
      {
        key: 'length',
        problem: 'A(1, 2), B(4, 6), |AB|',
        steps: [
          { math: 'AB = [4 - 1, 6 - 2] = [3, 4]', key: 'length1' },
          { math: '|AB| = sqrt(3^2 + 4^2) = sqrt(25) = 5', key: 'length2' },
        ],
        answer: '5',
      },
      {
        key: 'combine',
        problem: '3[2, -1] - [1, 5]',
        steps: [
          { math: '3[2, -1] = [6, -3]', key: 'combine1' },
          { math: '[6, -3] - [1, 5] = [5, -8]', key: 'combine2' },
        ],
        answer: '[5, -8]',
      },
    ],
    mistakes: [
      { key: 'direction', wrong: 'AB = A - B', right: 'AB = B - A' },
      { key: 'scale', wrong: '3[2, -1] = [6, -1]', right: '3[2, -1] = [6, -3]' },
      { key: 'length', wrong: '|[3, 4]| = 3 + 4 = 7', right: '|[3, 4]| = sqrt(9 + 16) = 5' },
    ],
  },

  geometry: {
    concepts: [
      { key: 'areaPerimeter', formula: 'S = a × b , P = 2 × (a + b)' },
      { key: 'circle', formula: 'S = π × r^2 , P = 2 × π × r' },
      { key: 'pythagoras', formula: 'c^2 = a^2 + b^2' },
      { key: 'prism', formula: 'V = S × h , V = (S × h) / 3' },
      { key: 'sphere', formula: 'V = (4 × π × r^3) / 3 , S = 4 × π × r^2' },
      { key: 'polygon', formula: '(n - 2) × 180' },
    ],
    examples: [
      {
        key: 'pythagoras',
        problem: 'pythagoras(a=5, c=13)',
        steps: [
          { math: 'b^2 = c^2 - a^2', key: 'pythagoras1' },
          { math: 'b^2 = 169 - 25 = 144' },
          { math: 'b = sqrt(144) = 12', key: 'pythagoras3' },
        ],
        answer: '12',
      },
      {
        key: 'cone',
        problem: 'volume(cone, r=3, h=4)',
        steps: [
          { math: 'V = (π × r^2 × h) / 3', key: 'cone1' },
          { math: 'V = (π × 9 × 4) / 3 = 12π' },
          { math: '12π ≈ 37.7', key: 'cone3' },
        ],
        answer: '12π ≈ 37.7',
      },
    ],
    mistakes: [
      { key: 'hypotenuse', wrong: 'b^2 = 13^2 + 5^2', right: 'b^2 = 13^2 - 5^2' },
      { key: 'diameter', wrong: 'd = 6 → S = π × 6^2', right: 'r = 3 → S = π × 3^2' },
      { key: 'third', wrong: 'V = π × r^2 × h', right: 'V = (π × r^2 × h) / 3' },
    ],
  },

  graphs: {
    concepts: [
      { key: 'meaning', formula: 'G = (V, E)' },
      { key: 'degree', formula: '0 ≤ deg(v) ≤ p - 1' },
      { key: 'handshake', formula: 'deg(v₁) + … + deg(vₚ) = 2q' },
      { key: 'complete', formula: 'q(Kₚ) = p(p - 1)/2' },
      { key: 'regular', formula: '2q = k × p' },
      { key: 'complement', formula: "q + q' = p(p - 1)/2" },
    ],
    examples: [
      {
        key: 'regular',
        problem: 'regular_graph(p=7, k=3)',
        steps: [
          { math: '2q = 3 × 7 = 21', key: 'regular1' },
          { math: '21 ≠ 2q', key: 'regular2' },
        ],
        answer: '∄',
      },
      {
        key: 'sequence',
        problem: 'degree_sequence(3, 3, 2, 2, 2)',
        steps: [
          { math: '3 + 3 + 2 + 2 + 2 = 12 = 2q', key: 'sequence1' },
          { math: '(3, 3, 2, 2, 2) → (2, 2, 1, 1)', key: 'sequence2' },
          { math: '(2, 2, 1, 1) → (1, 1, 0) → (0, 0)', key: 'sequence3' },
        ],
        answer: 'q = 6',
      },
    ],
    mistakes: [
      { key: 'evenOnly', wrong: '3 + 3 + 1 + 1 = 8 → ∃', right: '(3, 3, 1, 1) → ∄' },
      { key: 'complete', wrong: 'q(K₆) = 6 × 5 = 30', right: 'q(K₆) = 6 × 5 / 2 = 15' },
      { key: 'maxDegree', wrong: 'p = 4 , deg(v) = 4', right: 'p = 4 → deg(v) ≤ 3' },
    ],
  },
};

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
  // An overview paragraph (lessons.<topic>.intro) shown above the ideas.
  intro?: boolean;
  concepts: LessonConcept[];
  examples: LessonExample[];
  mistakes: LessonMistake[];
}

export const LESSONS: Partial<Record<TopicId, Lesson>> = {
  arithmetic: {
    intro: true,
    concepts: [
      { key: 'order', formula: '2 + 3 × 4 = 2 + 12 = 14' },
      { key: 'parentheses', formula: '(2 + 3) × 4 = 5 × 4 = 20' },
      { key: 'leftToRight', formula: '12 / 4 × 3 = 3 × 3 = 9' },
      { key: 'negatives', formula: '(-3) × (-2) = 6 , (-3) × 2 = -6' },
    ],
    examples: [
      {
        key: 'order',
        problem: '12/4 + 3^2',
        steps: [
          { math: '3^2 = 3 × 3 = 9', key: 'order1' },
          { math: '12 / 4 = 3', key: 'order2' },
          { math: '3 + 9 = 12', key: 'order3' },
        ],
        answer: '12',
      },
      {
        key: 'negative',
        problem: '(5 - 8)*2 + 10',
        steps: [
          { math: '5 - 8 = -3', key: 'negative1' },
          { math: '(-3) × 2 = -6', key: 'negative2' },
          { math: '-6 + 10 = 4', key: 'negative3' },
        ],
        answer: '4',
      },
      {
        key: 'mixed',
        problem: '20 - 3*4 + 2^3',
        steps: [
          { math: '2^3 = 2 × 2 × 2 = 8', key: 'mixed1' },
          { math: '3 × 4 = 12', key: 'mixed2' },
          { math: '20 - 12 + 8 = 8 + 8 = 16', key: 'mixed3' },
        ],
        answer: '16',
      },
    ],
    mistakes: [
      { key: 'addFirst', wrong: '2 + 3 × 4 = 5 × 4 = 20', right: '2 + 3 × 4 = 2 + 12 = 14' },
      { key: 'divisionOrder', wrong: '12 / 4 × 3 = 12 / 12 = 1', right: '12 / 4 × 3 = 3 × 3 = 9' },
      { key: 'negativeSquare', wrong: '-3^2 = 9', right: '-3^2 = -9 , (-3)^2 = 9' },
    ],
  },

  fractions: {
    intro: true,
    concepts: [
      { key: 'meaning', formula: '3/4' },
      { key: 'simplify', formula: '6/8 = (6 ÷ 2)/(8 ÷ 2) = 3/4' },
      { key: 'addSub', formula: '1/2 + 1/3 = 3/6 + 2/6 = 5/6' },
      { key: 'multiply', formula: '2/3 × 4/5 = (2 × 4)/(3 × 5) = 8/15' },
      { key: 'divide', formula: '2/3 ÷ 4/9 = 2/3 × 9/4' },
    ],
    examples: [
      {
        key: 'add',
        problem: '1/2 + 1/3',
        steps: [
          { math: '1/2 = 3/6 , 1/3 = 2/6', key: 'add1' },
          { math: '3/6 + 2/6 = (3 + 2)/6 = 5/6', key: 'add2' },
        ],
        answer: '5/6',
      },
      {
        key: 'multiply',
        problem: '3/4 * 2/9',
        steps: [
          { math: '(3 × 2)/(4 × 9) = 6/36', key: 'multiply1' },
          { math: '6/36 = (6 ÷ 6)/(36 ÷ 6) = 1/6', key: 'multiply2' },
        ],
        answer: '1/6',
      },
      {
        key: 'divide',
        problem: '(2/3)/(4/9)',
        steps: [
          { math: '2/3 ÷ 4/9 = 2/3 × 9/4', key: 'divide1' },
          { math: '(2 × 9)/(3 × 4) = 18/12', key: 'divide2' },
          { math: '18/12 = (18 ÷ 6)/(12 ÷ 6) = 3/2', key: 'divide3' },
        ],
        answer: '3/2',
      },
    ],
    mistakes: [
      { key: 'addTops', wrong: '1/2 + 1/3 = 2/5', right: '1/2 + 1/3 = 5/6' },
      { key: 'crossMultiply', wrong: '2/3 × 4/5 = 10/12', right: '2/3 × 4/5 = 8/15' },
      { key: 'divideFlip', wrong: '2/3 ÷ 4/9 = 2/3 × 4/9', right: '2/3 ÷ 4/9 = 2/3 × 9/4' },
    ],
  },

  powers: {
    intro: true,
    concepts: [
      { key: 'meaning', formula: '2^3 = 2 × 2 × 2 = 8' },
      { key: 'product', formula: 'a^m × a^n = a^(m + n)' },
      { key: 'quotient', formula: 'a^m / a^n = a^(m - n)' },
      { key: 'powerOfPower', formula: '(a^m)^n = a^(m × n)' },
      { key: 'productPower', formula: '(ab)^n = a^n × b^n' },
      { key: 'zeroNegative', formula: 'a^0 = 1 , a^(-n) = 1/a^n' },
    ],
    examples: [
      {
        key: 'sameBase',
        problem: '2^3 * 2^2',
        steps: [
          { math: '2^3 × 2^2 = 2^(3 + 2)', key: 'sameBase1' },
          { math: '2^5 = 2 × 2 × 2 × 2 × 2 = 32', key: 'sameBase2' },
        ],
        answer: '32',
      },
      {
        key: 'quotient',
        problem: 'x^5/x^2',
        steps: [
          { math: 'x^5 / x^2 = x^(5 - 2)', key: 'quotient1' },
          { math: 'x^(5 - 2) = x^3', key: 'quotient2' },
        ],
        answer: 'x^3',
      },
      {
        key: 'productPower',
        problem: '(2x^3)^2',
        steps: [
          { math: '(2x^3)^2 = 2^2 × (x^3)^2', key: 'productPower1' },
          { math: '2^2 = 4 , (x^3)^2 = x^(3 × 2) = x^6', key: 'productPower2' },
          { math: '4 × x^6 = 4x^6', key: 'productPower3' },
        ],
        answer: '4x^6',
      },
    ],
    mistakes: [
      { key: 'multiplyExponents', wrong: 'x^2 × x^3 = x^6', right: 'x^2 × x^3 = x^5' },
      { key: 'baseTimesExponent', wrong: '2^3 = 2 × 3 = 6', right: '2^3 = 2 × 2 × 2 = 8' },
      { key: 'sumPower', wrong: '(a + b)^2 = a^2 + b^2', right: '(a + b)^2 = a^2 + 2ab + b^2' },
    ],
  },

  expressions: {
    intro: true,
    concepts: [
      { key: 'terms', formula: '3x^2 + 5x - 7' },
      { key: 'like', formula: '2x + 3x = 5x' },
      { key: 'distribute', formula: 'a(b + c) = ab + ac' },
      { key: 'minusDistribute', formula: '-2(x + 3) = -2x - 6' },
      { key: 'identities', formula: '(a + b)^2 = a^2 + 2ab + b^2' },
    ],
    examples: [
      {
        key: 'combine',
        problem: '5x + 2 - 3x + 4',
        steps: [
          { math: '(5x - 3x) + (2 + 4)', key: 'combine1' },
          { math: '2x + 6', key: 'combine2' },
        ],
        answer: '2x + 6',
      },
      {
        key: 'distribute',
        problem: '3(x + 2) + 2x',
        steps: [
          { math: '3(x + 2) = 3x + 6', key: 'distribute1' },
          { math: '3x + 6 + 2x = 5x + 6', key: 'distribute2' },
        ],
        answer: '5x + 6',
      },
      {
        key: 'minus',
        problem: '4(x - 1) - 2(x + 3)',
        steps: [
          { math: '4(x - 1) = 4x - 4', key: 'minus1' },
          { math: '-2(x + 3) = -2x - 6', key: 'minus2' },
          { math: '4x - 4 - 2x - 6 = 2x - 10', key: 'minus3' },
        ],
        answer: '2x - 10',
      },
    ],
    mistakes: [
      { key: 'unlike', wrong: '2x + 3 = 5x', right: '2x + 3' },
      { key: 'partialDistribute', wrong: '3(x + 2) = 3x + 2', right: '3(x + 2) = 3x + 6' },
      { key: 'minusSign', wrong: '-2(x + 3) = -2x + 6', right: '-2(x + 3) = -2x - 6' },
    ],
  },

  linear: {
    intro: true,
    concepts: [
      { key: 'meaning', formula: '2x + 5 = 17' },
      { key: 'balance', formula: 'a = b → a + c = b + c' },
      { key: 'strategy', formula: 'ax + b = c → x = (c - b)/a' },
      { key: 'bothSides', formula: '5x - 3 = 2x + 9 → 3x = 12' },
      { key: 'check', formula: 'x = 6 → 2 × 6 + 5 = 17 ✓' },
    ],
    examples: [
      {
        key: 'basic',
        problem: '2x + 5 = 17',
        steps: [
          { math: '2x + 5 - 5 = 17 - 5', key: 'basic1' },
          { math: '2x = 12', key: 'basic2' },
          { math: 'x = 12/2 = 6', key: 'basic3' },
        ],
        answer: 'x = 6',
      },
      {
        key: 'bothSides',
        problem: '5x - 3 = 2x + 9',
        steps: [
          { math: '5x - 2x - 3 = 9', key: 'bothSides1' },
          { math: '3x = 9 + 3 = 12', key: 'bothSides2' },
          { math: 'x = 12/3 = 4', key: 'bothSides3' },
        ],
        answer: 'x = 4',
      },
      {
        key: 'fraction',
        problem: 'x/3 + 4 = 9',
        steps: [
          { math: 'x/3 = 9 - 4 = 5', key: 'fraction1' },
          { math: 'x = 5 × 3 = 15', key: 'fraction2' },
        ],
        answer: 'x = 15',
      },
    ],
    mistakes: [
      { key: 'signMove', wrong: '2x + 5 = 17 → 2x = 17 + 5', right: '2x + 5 = 17 → 2x = 17 - 5' },
      { key: 'divideWrong', wrong: '2x = 12 → x = 12 - 2 = 10', right: '2x = 12 → x = 12/2 = 6' },
      { key: 'partial', wrong: '3(x + 2) = 15 → 3x + 2 = 15', right: '3(x + 2) = 15 → 3x + 6 = 15' },
    ],
  },

  quadratic: {
    intro: true,
    concepts: [
      { key: 'meaning', formula: 'ax^2 + bx + c = 0 , a ≠ 0' },
      { key: 'factor', formula: 'x^2 - 5x + 6 = (x - 2)(x - 3)' },
      { key: 'zeroProduct', formula: 'A × B = 0 → A = 0 or B = 0' },
      { key: 'square', formula: 'x^2 = k → x = ±sqrt(k)' },
      { key: 'delta', formula: 'Δ = b^2 - 4ac' },
      { key: 'formula', formula: 'x = (-b ± sqrt(Δ))/(2a)' },
    ],
    examples: [
      {
        key: 'factor',
        problem: 'x^2 - 5x + 6 = 0',
        steps: [
          { math: '(-2) × (-3) = 6 , (-2) + (-3) = -5', key: 'factor1' },
          { math: '(x - 2)(x - 3) = 0', key: 'factor2' },
          { math: 'x - 2 = 0 → x = 2 , x - 3 = 0 → x = 3', key: 'factor3' },
        ],
        answer: 'x = 2 or x = 3',
      },
      {
        key: 'square',
        problem: 'x^2 - 4 = 0',
        steps: [
          { math: 'x^2 = 4', key: 'square1' },
          { math: 'x = ±sqrt(4) = ±2', key: 'square2' },
        ],
        answer: 'x = -2 or x = 2',
      },
      {
        key: 'delta',
        problem: 'x^2 + x - 1 = 0',
        steps: [
          { math: 'a = 1 , b = 1 , c = -1', key: 'delta1' },
          { math: 'Δ = 1^2 - 4 × 1 × (-1) = 1 + 4 = 5', key: 'delta2' },
          { math: 'x = (-1 ± sqrt(5))/2', key: 'delta3' },
        ],
        answer: 'x = (-1 + sqrt(5))/2 or x = (-1 - sqrt(5))/2',
      },
    ],
    mistakes: [
      { key: 'loseRoot', wrong: 'x^2 = 4 → x = 2', right: 'x^2 = 4 → x = ±2' },
      { key: 'divideByX', wrong: 'x^2 = 3x → x = 3', right: 'x^2 = 3x → x(x - 3) = 0 → x = 0 , x = 3' },
      { key: 'deltaSign', wrong: 'x^2 + x - 1 = 0 → Δ = 1 - 4 = -3', right: 'Δ = 1^2 - 4 × 1 × (-1) = 5' },
    ],
  },

  trig: {
    intro: true,
    concepts: [
      { key: 'ratios', formula: 'sin(α) = a/c , cos(α) = b/c , tan(α) = a/b' },
      { key: 'special', formula: 'sin(30°) = 1/2 , cos(60°) = 1/2 , sin(45°) = sqrt(2)/2' },
      { key: 'radians', formula: 'π = 180° → π/6 = 30°' },
      { key: 'pythagorean', formula: 'sin(x)^2 + cos(x)^2 = 1' },
      { key: 'tan', formula: 'tan(x) = sin(x)/cos(x)' },
    ],
    examples: [
      {
        key: 'special',
        problem: 'sin(pi/6)',
        steps: [
          { math: 'π/6 = 180°/6 = 30°', key: 'special1' },
          { math: 'sin(30°) = 1/2', key: 'special2' },
        ],
        answer: '1/2',
      },
      {
        key: 'tanCos',
        problem: 'tan(x)*cos(x)',
        steps: [
          { math: 'tan(x) = sin(x)/cos(x)', key: 'tanCos1' },
          { math: 'sin(x)/cos(x) × cos(x) = sin(x)', key: 'tanCos2' },
        ],
        answer: 'sin(x)',
      },
      {
        key: 'identity',
        problem: 'sin(x)^2 + cos(x)^2',
        steps: [
          { math: 'sin(x) = a/c , cos(x) = b/c', key: 'identity1' },
          { math: '(a/c)^2 + (b/c)^2 = (a^2 + b^2)/c^2', key: 'identity2' },
          { math: 'a^2 + b^2 = c^2 → c^2/c^2 = 1', key: 'identity3' },
        ],
        answer: '1',
      },
    ],
    mistakes: [
      { key: 'squareInside', wrong: 'sin(x)^2 = sin(x^2)', right: 'sin(x)^2 = sin(x) × sin(x)' },
      { key: 'linear', wrong: 'sin(2x) = 2sin(x)', right: 'sin(2x) = 2sin(x)cos(x)' },
      { key: 'degrees', wrong: 'sin(30) = 1/2', right: 'sin(30°) = 1/2' },
    ],
  },

  derivative: {
    intro: true,
    concepts: [
      { key: 'meaning', formula: "f'(a) = lim(h→0) (f(a + h) - f(a))/h" },
      { key: 'power', formula: 'd/dx(x^n) = n·x^(n - 1)' },
      { key: 'sumConst', formula: "d/dx(c) = 0 , (f + g)' = f' + g'" },
      { key: 'trig', formula: 'd/dx(sin(x)) = cos(x) , d/dx(cos(x)) = -sin(x)' },
      { key: 'product', formula: "(f·g)' = f'·g + f·g'" },
      { key: 'chain', formula: "(f(g(x)))' = f'(g(x))·g'(x)" },
    ],
    examples: [
      {
        key: 'poly',
        problem: 'd/dx(x^3 - 2x^2 + 5)',
        steps: [
          { math: 'd/dx(x^3) = 3x^2', key: 'poly1' },
          { math: 'd/dx(2x^2) = 2 × 2x = 4x', key: 'poly2' },
          { math: 'd/dx(5) = 0', key: 'poly3' },
          { math: '3x^2 - 4x + 0 = 3x^2 - 4x', key: 'poly4' },
        ],
        answer: '3x^2 - 4x',
      },
      {
        key: 'product',
        problem: 'd/dx(x*sin(x))',
        steps: [
          { math: 'f = x , g = sin(x)', key: 'product1' },
          { math: "f' = 1 , g' = cos(x)", key: 'product2' },
          { math: "f'·g + f·g' = 1·sin(x) + x·cos(x)", key: 'product3' },
        ],
        answer: 'x*cos(x) + sin(x)',
      },
      {
        key: 'chain',
        problem: 'd/dx((x^2 + 1)^3)',
        steps: [
          { math: 'u = x^2 + 1 → u^3', key: 'chain1' },
          { math: "(u^3)' = 3u^2·u'", key: 'chain2' },
          { math: "u' = 2x", key: 'chain3' },
          { math: '3(x^2 + 1)^2·2x = 6x(x^2 + 1)^2', key: 'chain4' },
        ],
        answer: '6x(x^2 + 1)^2',
      },
    ],
    mistakes: [
      { key: 'constant', wrong: 'd/dx(5) = 5', right: 'd/dx(5) = 0' },
      { key: 'product', wrong: "(x·sin(x))' = 1·cos(x)", right: "(x·sin(x))' = sin(x) + x·cos(x)" },
      { key: 'chain', wrong: "((x^2 + 1)^3)' = 3(x^2 + 1)^2", right: "((x^2 + 1)^3)' = 3(x^2 + 1)^2·2x" },
    ],
  },

  integral: {
    intro: true,
    concepts: [
      { key: 'meaning', formula: "∫f(x) dx = F(x) + C , F' = f" },
      { key: 'power', formula: '∫x^n dx = x^(n + 1)/(n + 1) + C , n ≠ -1' },
      { key: 'special', formula: '∫1/x dx = ln(x) + C , ∫cos(x) dx = sin(x) + C , ∫sin(x) dx = -cos(x) + C' },
      { key: 'linearity', formula: '∫(f + g) dx = ∫f dx + ∫g dx , ∫k·f dx = k·∫f dx' },
      { key: 'definite', formula: '∫ₐᵇ f(x) dx = F(b) - F(a)' },
    ],
    examples: [
      {
        key: 'poly',
        problem: 'integrate(3x^2 + 2x, x)',
        steps: [
          { math: '∫3x^2 dx = 3 × x^3/3 = x^3', key: 'poly1' },
          { math: '∫2x dx = 2 × x^2/2 = x^2', key: 'poly2' },
          { math: 'x^3 + x^2 + C', key: 'poly3' },
        ],
        answer: 'x^3 + x^2 + C',
      },
      {
        key: 'special',
        problem: 'integrate(1/x + cos(x), x)',
        steps: [
          { math: '∫1/x dx = ln(x)', key: 'special1' },
          { math: '∫cos(x) dx = sin(x)', key: 'special2' },
          { math: 'ln(x) + sin(x) + C', key: 'special3' },
        ],
        answer: 'ln(x) + sin(x) + C',
      },
      {
        key: 'definite',
        problem: 'integrate(x^2, x, 0, 3)',
        steps: [
          { math: 'F(x) = x^3/3', key: 'definite1' },
          { math: 'F(3) = 27/3 = 9 , F(0) = 0', key: 'definite2' },
          { math: 'F(3) - F(0) = 9 - 0 = 9', key: 'definite3' },
        ],
        answer: '9',
      },
    ],
    mistakes: [
      { key: 'forgetC', wrong: '∫2x dx = x^2', right: '∫2x dx = x^2 + C' },
      { key: 'power', wrong: '∫x^2 dx = 2x', right: '∫x^2 dx = x^3/3 + C' },
      { key: 'reciprocal', wrong: '∫x^(-1) dx = x^0/0', right: '∫x^(-1) dx = ln(x) + C' },
    ],
  },

  limit: {
    intro: true,
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
      {
        key: 'atInfinity',
        problem: 'lim(x→∞) (2x^2 + 1)/(x^2 - 3)',
        steps: [
          { math: '(2x^2 + 1)/(x^2 - 3) → ∞/∞', key: 'atInfinity1' },
          { math: '(2x^2)/(x^2)', key: 'atInfinity2' },
          { math: '2x^2/x^2 = 2/1 = 2', key: 'atInfinity3' },
        ],
        answer: '2',
      },
    ],
    mistakes: [
      { key: 'zeroOverZero', wrong: '0/0 = 1' },
      { key: 'infinityOverInfinity', wrong: '∞/∞ = 1', right: 'lim(x→∞) (2x^2 + 1)/(x^2 - 3) = 2' },
      { key: 'sides', wrong: 'lim(x→1) 1/(x - 1) = ∞', right: 'lim(x→1) 1/(x - 1) = ∄' },
    ],
  },

  logarithm: {
    intro: true,
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
          { math: 'x = 3/2', key: 'sameBase3' },
        ],
        answer: 'x = 3/2',
      },
      {
        key: 'common',
        problem: 'log(x) = 2',
        steps: [
          { math: 'x > 0', key: 'common1' },
          { math: 'log(x) = log₁₀(x) = 2', key: 'common2' },
          { math: 'x = 10^2 = 100', key: 'common3' },
        ],
        answer: 'x = 100',
      },
    ],
    mistakes: [
      { key: 'sum', wrong: 'log(a + b) = log(a) + log(b)', right: 'log(ab) = log(a) + log(b)' },
      { key: 'domain', wrong: 'x = 4 , x = -2', right: 'x = 4' },
      { key: 'quotient', wrong: 'log(a)/log(b) = log(a/b)', right: 'log(a) - log(b) = log(a/b)' },
    ],
  },

  sets: {
    intro: true,
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
          { math: 'x = 14 - 11 = 3', key: 'counting3' },
        ],
        answer: '3',
      },
      {
        key: 'subsets',
        problem: 'A={a,b,c}, n(P(A))',
        steps: [
          { math: 'n(A) = 3', key: 'subsets1' },
          { math: 'n(P(A)) = 2^3 = 8', key: 'subsets2' },
          { math: 'P(A) = {∅, {a}, {b}, {c}, {a, b}, {a, c}, {b, c}, {a, b, c}}', key: 'subsets3' },
        ],
        answer: '8',
      },
    ],
    mistakes: [
      { key: 'repeat', wrong: '{1, 2} ∪ {2, 3} = {1, 2, 2, 3}', right: '{1, 2} ∪ {2, 3} = {1, 2, 3}' },
      { key: 'order', wrong: '{1, 2} - {2, 3} = {3}', right: '{1, 2} - {2, 3} = {1}' },
      { key: 'counting', wrong: 'n(A ∪ B) = n(A) + n(B)', right: 'n(A ∪ B) = n(A) + n(B) - n(A ∩ B)' },
    ],
  },

  vectors: {
    intro: true,
    concepts: [
      { key: 'meaning', formula: '[3, -2]' },
      { key: 'fromPoints', formula: 'A(1, 2) , B(4, 6) → AB = [3, 4]' },
      { key: 'add', formula: '[2, 3] + [1, -4] = [3, -1]' },
      { key: 'scale', formula: '3[2, -1] = [6, -3]' },
      { key: 'length', formula: '|[a, b]| = sqrt(a^2 + b^2)' },
    ],
    examples: [
      {
        key: 'add',
        problem: '[2, 3] + [1, -4]',
        steps: [
          { math: '[2 + 1, 3 + (-4)]', key: 'add1' },
          { math: '[3, -1]', key: 'add2' },
        ],
        answer: '[3, -1]',
      },
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
    intro: true,
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
          { math: 'b^2 = 169 - 25 = 144', key: 'pythagoras2' },
          { math: 'b = sqrt(144) = 12', key: 'pythagoras3' },
        ],
        answer: '12',
      },
      {
        key: 'cone',
        problem: 'volume(cone, r=3, h=4)',
        steps: [
          { math: 'V = (π × r^2 × h) / 3', key: 'cone1' },
          { math: 'V = (π × 9 × 4) / 3 = 12π', key: 'cone2' },
          { math: '12π ≈ 37.7', key: 'cone3' },
        ],
        answer: '12π ≈ 37.7',
      },
      {
        key: 'polygon',
        problem: 'angle_sum(polygon, n=6)',
        steps: [
          { math: '(n - 2) × 180°', key: 'polygon1' },
          { math: '(6 - 2) × 180° = 4 × 180° = 720°', key: 'polygon2' },
          { math: '720° / 6 = 120°', key: 'polygon3' },
        ],
        answer: '720°',
      },
    ],
    mistakes: [
      { key: 'hypotenuse', wrong: 'b^2 = 13^2 + 5^2', right: 'b^2 = 13^2 - 5^2' },
      { key: 'diameter', wrong: 'd = 6 → S = π × 6^2', right: 'r = 3 → S = π × 3^2' },
      { key: 'third', wrong: 'V = π × r^2 × h', right: 'V = (π × r^2 × h) / 3' },
    ],
  },

  graphs: {
    intro: true,
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
      {
        key: 'complete',
        problem: 'complete_graph(p=6)',
        steps: [
          { math: 'deg(v) = p - 1 = 5', key: 'complete1' },
          { math: '6 × 5 = 30 = 2q', key: 'complete2' },
          { math: 'q = 30/2 = 15', key: 'complete3' },
        ],
        answer: 'q = 15',
      },
    ],
    mistakes: [
      { key: 'evenOnly', wrong: '3 + 3 + 1 + 1 = 8 → ∃', right: '(3, 3, 1, 1) → ∄' },
      { key: 'complete', wrong: 'q(K₆) = 6 × 5 = 30', right: 'q(K₆) = 6 × 5 / 2 = 15' },
      { key: 'maxDegree', wrong: 'p = 4 , deg(v) = 4', right: 'p = 4 → deg(v) ≤ 3' },
    ],
  },
};

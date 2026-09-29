// Exam question generators — one per skill. Everything runs on the device:
// no Math Engine call, so an exam never spends the free-solve quota and
// works offline. Each question is 4-choice multiple choice; wrong choices
// come from typical student mistakes first, random near-misses after.
//
// Math shown to the student (expression, choices) must only use what
// MathExpression's tokenizer keeps: digits, letters, ^ + - * / = ( ) , and
// single symbols such as { } [ ] ∪ ∩ ∅
// Question sentences are i18n keys under exam.q.<textKey>; their params
// are positive numbers only, so no minus sign ever lands in RTL text.

export type Rng = () => number;

export type SkillId =
  | 'patterns'
  | 'primes'
  | 'gcd'
  | 'lcm'
  | 'fracAddSub'
  | 'fracMulDiv'
  | 'rationalAddSub'
  | 'decAddSub'
  | 'decMul'
  | 'unitConvert'
  | 'areaRect'
  | 'proportion'
  | 'percent'
  | 'rounding'
  | 'intAddSub'
  | 'intMulDiv'
  | 'evalExpr'
  | 'simplifyLike'
  | 'linear'
  | 'powers'
  | 'sqrt'
  | 'mean'
  | 'volumeCuboid'
  | 'polygonAngles'
  | 'pythagoras'
  | 'probabilityDice'
  | 'powerRules'
  | 'expandBinomial'
  | 'slope'
  | 'setOps'
  | 'vectorFromPoints'
  | 'vectorAdd'
  | 'solidVolume'
  | 'setComplement'
  | 'quadraticRoots'
  | 'logValue'
  | 'logEquation'
  | 'expEquation'
  | 'limitAlgebraic'
  | 'limitInfinity'
  | 'graphCounting';

export interface GeneratedQuestion {
  textKey: string;
  params?: Record<string, string | number>;
  expression?: string;
  choices: string[];
  answerIndex: number;
}

// ---------- small helpers ----------

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}

function nonZero(rng: Rng, min: number, max: number): number {
  let n = 0;
  while (n === 0) {
    n = randInt(rng, min, max);
  }
  return n;
}

export function shuffle<T>(rng: Rng, items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function gcdOf(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

// Rounds away float noise (0.1 + 0.2) and drops trailing zeros.
function fmtNum(n: number): string {
  return String(parseFloat(n.toFixed(6)));
}

// Negative operands are wrapped: "5 - (-3)", never "5 - -3".
function paren(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

interface Frac {
  n: number;
  d: number;
}

function frac(n: number, d: number): Frac {
  const sign = d < 0 ? -1 : 1;
  const g = gcdOf(n, d);
  return { n: (sign * n) / g, d: (sign * d) / g };
}

function fmtFrac(f: Frac): string {
  return f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`;
}

// a·x + b in the usual written form: "x", "-x", "3x - 2", "5".
function fmtLinear(a: number, b: number, v = 'x'): string {
  let out = '';
  if (a !== 0) {
    out = a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`;
  }
  if (b !== 0) {
    out = out ? `${out} ${b > 0 ? '+' : '-'} ${Math.abs(b)}` : `${b}`;
  }
  return out || '0';
}

// x^2 + b·x + c
function fmtQuadratic(b: number, c: number): string {
  let out = 'x^2';
  if (b !== 0) {
    out += ` ${b > 0 ? '+' : '-'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`;
  }
  if (c !== 0) {
    out += ` ${c > 0 ? '+' : '-'} ${Math.abs(c)}`;
  }
  return out;
}

// Correct answer + 3 distinct wrong ones, shuffled. `candidates` are the
// "typical mistake" answers; `fallback` makes more when those run out or
// collide with the correct one.
function choose(
  rng: Rng,
  correct: string,
  candidates: string[],
  fallback: () => string,
): Pick<GeneratedQuestion, 'choices' | 'answerIndex'> {
  const wrong: string[] = [];
  const add = (c: string) => {
    if (c !== correct && !wrong.includes(c) && !c.includes('NaN') && !c.includes('Infinity')) {
      wrong.push(c);
    }
  };
  shuffle(rng, candidates).forEach(c => wrong.length < 3 && add(c));
  for (let tries = 0; wrong.length < 3 && tries < 100; tries += 1) {
    add(fallback());
  }
  const choices = shuffle(rng, [correct, ...wrong.slice(0, 3)]);
  return { choices, answerIndex: choices.indexOf(correct) };
}

function chooseNumber(rng: Rng, correct: number, candidates: number[], spread = 10) {
  return choose(rng, fmtNum(correct), candidates.map(fmtNum), () =>
    fmtNum(correct + nonZero(rng, -spread, spread)),
  );
}

function chooseDecimal(rng: Rng, correct: number, candidates: number[], step: number) {
  return choose(rng, fmtNum(correct), candidates.map(fmtNum), () =>
    fmtNum(correct + nonZero(rng, -9, 9) * step),
  );
}

function chooseFrac(rng: Rng, correct: Frac, candidates: Frac[]) {
  return choose(rng, fmtFrac(correct), candidates.map(fmtFrac), () =>
    fmtFrac(frac(correct.n * 2 + nonZero(rng, -3, 3), correct.d * 2)),
  );
}

function fmtSet(items: number[]): string {
  const sorted = [...new Set(items)].sort((a, b) => a - b);
  return sorted.length ? `{${sorted.join(', ')}}` : '∅';
}

function randomSet(rng: Rng, size: number): number[] {
  return shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, size);
}

// Parenthesised only when it's more than one term: "x" but "(x + 2)".
function group(expr: string): string {
  return expr.includes(' ') ? `(${expr})` : expr;
}

// a·x^n with the usual coefficient shorthand: "x^2", "-x^2", "3x^2".
function term(a: number, power: string): string {
  return `${a === 1 ? '' : a === -1 ? '-' : a}${power}`;
}

function fmtVec(x: number, y: number): string {
  return `[${x}, ${y}]`;
}

// ---------- generators ----------

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
// Odd composites that "look prime" — the interesting wrong answers.
const TRICKY_COMPOSITES = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 77, 81, 85, 87, 91, 93, 95];

function coprimePair(rng: Rng): [number, number] {
  for (;;) {
    const x = randInt(rng, 2, 9);
    const y = randInt(rng, 2, 9);
    if (x !== y && gcdOf(x, y) === 1) {
      return [x, y];
    }
  }
}

type Generator = (rng: Rng) => GeneratedQuestion;

export const GENERATORS: Record<SkillId, Generator> = {
  patterns: rng => {
    const a = randInt(rng, 1, 20);
    const d = randInt(rng, 2, 9);
    const seq = [0, 1, 2, 3].map(i => a + i * d).join('، ');
    const next = a + 4 * d;
    return {
      textKey: 'patterns',
      params: { seq },
      ...chooseNumber(rng, next, [next + d, next + 1, next - 1, a + 3 * d + d + 2]),
    };
  },

  primes: rng => {
    const prime = pick(rng, PRIMES.slice(4));
    const wrong = shuffle(rng, TRICKY_COMPOSITES).slice(0, 3).map(String);
    const choices = shuffle(rng, [String(prime), ...wrong]);
    return { textKey: 'primes', choices, answerIndex: choices.indexOf(String(prime)) };
  },

  gcd: rng => {
    const g = randInt(rng, 2, 9);
    const [x, y] = coprimePair(rng);
    const a = g * x;
    const b = g * y;
    return {
      textKey: 'gcd',
      params: { a, b },
      ...chooseNumber(rng, g, [g * x * y, Math.min(a, b), g * 2, 1]),
    };
  },

  lcm: rng => {
    const g = randInt(rng, 2, 6);
    const [x, y] = coprimePair(rng);
    const a = g * x;
    const b = g * y;
    const lcm = g * x * y;
    return {
      textKey: 'lcm',
      params: { a, b },
      ...chooseNumber(rng, lcm, [a * b, g, a + b, lcm * 2], 20),
    };
  },

  fracAddSub: rng => {
    let a = randInt(rng, 1, 8);
    let b = randInt(rng, a + 1, 9);
    let c = randInt(rng, 1, 8);
    let d = randInt(rng, c + 1, 9);
    const plus = rng() < 0.5;
    // Grade 6 has no negative numbers: bigger fraction first.
    if (!plus && a * d < c * b) {
      [a, b, c, d] = [c, d, a, b];
    }
    const s = plus ? 1 : -1;
    const correct = frac(a * d + s * c * b, b * d);
    return {
      textKey: 'compute',
      expression: `${a}/${b} ${plus ? '+' : '-'} ${c}/${d}`,
      ...chooseFrac(rng, correct, [
        frac(a + s * c, b + s * d || 1),
        frac(a + s * c, b * d),
        frac(a * d - s * c * b, b * d),
      ]),
    };
  },

  fracMulDiv: rng => {
    const a = randInt(rng, 1, 9);
    const b = randInt(rng, 2, 9);
    const c = randInt(rng, 1, 9);
    const d = randInt(rng, 2, 9);
    const times = rng() < 0.5;
    const product = frac(a * c, b * d);
    const quotient = frac(a * d, b * c);
    return {
      textKey: 'compute',
      expression: `(${a}/${b}) ${times ? '*' : '/'} (${c}/${d})`,
      ...(times
        ? chooseFrac(rng, product, [quotient, frac(a + c, b + d)])
        : chooseFrac(rng, quotient, [product, frac(b * c, a * d)])),
    };
  },

  rationalAddSub: rng => {
    const a = nonZero(rng, -8, 8);
    const b = randInt(rng, 2, 9);
    const c = nonZero(rng, -8, 8);
    const d = randInt(rng, 2, 9);
    const plus = rng() < 0.5;
    const s = plus ? 1 : -1;
    const correct = frac(a * d + s * c * b, b * d);
    return {
      textKey: 'compute',
      expression: `(${a}/${b}) ${plus ? '+' : '-'} (${c}/${d})`,
      ...chooseFrac(rng, correct, [
        frac(-(a * d + s * c * b), b * d),
        frac(a * d - s * c * b, b * d),
        frac(a + s * c, b + d),
      ]),
    };
  },

  decAddSub: rng => {
    // Worked in hundredths to avoid float error.
    let x = randInt(rng, 101, 2999);
    let y = randInt(rng, 11, 999);
    const plus = rng() < 0.5;
    if (!plus && x < y) {
      [x, y] = [y, x];
    }
    const r = plus ? x + y : x - y;
    return {
      textKey: 'compute',
      expression: `${fmtNum(x / 100)} ${plus ? '+' : '-'} ${fmtNum(y / 100)}`,
      ...chooseDecimal(rng, r / 100, [r / 10, (r + 10) / 100, (r - 100) / 100, r / 1000], 0.01),
    };
  },

  decMul: rng => {
    const x = randInt(rng, 2, 99); // tenths
    const both = rng() < 0.5;
    const y = both ? randInt(rng, 2, 9) : randInt(rng, 2, 12); // tenths or whole
    const scale = both ? 100 : 10;
    const r = (x * y) / scale;
    return {
      textKey: 'compute',
      expression: `${fmtNum(x / 10)} * ${both ? fmtNum(y / 10) : y}`,
      ...chooseDecimal(rng, r, [r * 10, r / 10, r + 1], both ? 0.01 : 0.1),
    };
  },

  unitConvert: rng => {
    const conv = pick(rng, [
      { key: 'unit_km_m', f: 1000 },
      { key: 'unit_m_cm', f: 100 },
      { key: 'unit_cm_mm', f: 10 },
      { key: 'unit_kg_g', f: 1000 },
      { key: 'unit_l_ml', f: 1000 },
      { key: 'unit_h_min', f: 60 },
    ]);
    const half = conv.f !== 60 && rng() < 0.4;
    const value = half ? randInt(rng, 2, 19) + 0.5 : randInt(rng, 2, 20);
    const r = value * conv.f;
    const otherF = conv.f === 60 ? 100 : conv.f === 1000 ? 100 : 1000;
    return {
      textKey: conv.key,
      params: { value: fmtNum(value) },
      ...chooseNumber(rng, r, [r / 10, r * 10, value * otherF], conv.f),
    };
  },

  areaRect: rng => {
    const w = randInt(rng, 2, 20);
    const h = randInt(rng, 2, 20);
    const area = w * h;
    const perimeter = 2 * (w + h);
    const askArea = rng() < 0.5;
    return {
      textKey: askArea ? 'rect_area' : 'rect_perimeter',
      params: { w, h },
      ...(askArea
        ? chooseNumber(rng, area, [perimeter, w + h, area * 2])
        : chooseNumber(rng, perimeter, [area, w + h, 2 * w + h])),
    };
  },

  proportion: rng => {
    const a = randInt(rng, 1, 9);
    const b = randInt(rng, a + 1, 12);
    const k = randInt(rng, 2, 6);
    const c = b * k;
    const x = a * k;
    return {
      textKey: 'find_x',
      expression: `${a}/${b} = x/${c}`,
      ...chooseNumber(rng, x, [a + c - b, x + k, c - a, b * k * a]),
    };
  },

  percent: rng => {
    const p = pick(rng, [5, 10, 20, 25, 30, 40, 50, 60, 75]);
    const n = randInt(rng, 1, 20) * (100 / gcdOf(p, 100));
    const r = (n * p) / 100;
    return {
      textKey: 'percent',
      params: { p, n },
      ...chooseNumber(rng, r, [(n * p) / 10, n - r, r * 2, p]),
    };
  },

  rounding: rng => {
    const x = randInt(rng, 1001, 99999); // thousandths
    const toTenth = rng() < 0.5;
    const value = fmtNum(x / 1000);
    if (toTenth) {
      const r = Math.round(x / 100) / 10;
      return {
        textKey: 'round_tenth',
        params: { value },
        ...chooseDecimal(rng, r, [Math.floor(x / 100) / 10, Math.ceil(x / 100) / 10, Math.round(x / 10) / 100], 0.1),
      };
    }
    const r = Math.round(x / 1000);
    return {
      textKey: 'round_int',
      params: { value },
      ...chooseNumber(rng, r, [Math.floor(x / 1000), Math.ceil(x / 1000), r + 1], 3),
    };
  },

  intAddSub: rng => {
    const a = nonZero(rng, -20, 20);
    const b = nonZero(rng, -20, 20);
    const plus = rng() < 0.5;
    const r = plus ? a + b : a - b;
    return {
      textKey: 'compute',
      expression: `${a} ${plus ? '+' : '-'} ${paren(b)}`,
      ...chooseNumber(rng, r, [-r, plus ? a - b : a + b, Math.abs(a) + Math.abs(b)]),
    };
  },

  intMulDiv: rng => {
    const a = nonZero(rng, -12, 12);
    const b = nonZero(rng, -12, 12);
    if (rng() < 0.5) {
      const r = a * b;
      return {
        textKey: 'compute',
        expression: `${paren(a)} * ${paren(b)}`,
        ...chooseNumber(rng, r, [-r, a + b, r + b]),
      };
    }
    const dividend = a * b;
    return {
      textKey: 'compute',
      expression: `${paren(dividend)} / ${paren(b)}`,
      ...chooseNumber(rng, a, [-a, dividend - b, a + 1], 5),
    };
  },

  evalExpr: rng => {
    const m = randInt(rng, 2, 9);
    const c = randInt(rng, 1, 20);
    const v = randInt(rng, 2, 9);
    const r = m * v + c;
    return {
      textKey: 'evaluate',
      params: { v },
      expression: `${m}x + ${c}`,
      // "2x with x = 4" read as 24 is the classic mistake.
      ...chooseNumber(rng, r, [Number(`${m}${v}`) + c, m + v + c, m * (v + c)]),
    };
  },

  simplifyLike: rng => {
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 1, 15);
    const c = nonZero(rng, -9, 9);
    const d = randInt(rng, 1, 15);
    const expression = `${a}x + ${b} ${c > 0 ? '+' : '-'} ${Math.abs(c)}x - ${d}`;
    const correct = fmtLinear(a + c, b - d);
    return {
      textKey: 'simplify',
      expression,
      ...choose(
        rng,
        correct,
        [
          fmtLinear(a + c + b - d, 0),
          fmtLinear(a + c, b + d),
          fmtLinear(a - c, b - d),
        ],
        () => fmtLinear(a + c + nonZero(rng, -3, 3), b - d),
      ),
    };
  },

  linear: rng => {
    const x = nonZero(rng, -9, 9);
    const a = randInt(rng, 2, 9);
    const b = nonZero(rng, -15, 15);
    const c = a * x + b;
    return {
      textKey: 'solve_x',
      expression: `${fmtLinear(a, b)} = ${c}`,
      ...chooseNumber(rng, x, [(c + b) / a, c - b, -x, x + 1], 5),
    };
  },

  powers: rng => {
    const base = randInt(rng, 2, 9);
    const exp = base <= 3 ? randInt(rng, 2, 5) : randInt(rng, 2, 3);
    const r = base ** exp;
    return {
      textKey: 'compute',
      expression: `${base}^${exp}`,
      ...chooseNumber(rng, r, [base * exp, base ** (exp - 1), exp ** base, r + base], 10),
    };
  },

  sqrt: rng => {
    const n = randInt(rng, 2, 20);
    return {
      textKey: 'compute',
      expression: `sqrt(${n * n})`,
      ...chooseNumber(rng, n, [(n * n) / 2, n + 1, n - 1, 2 * n], 4),
    };
  },

  mean: rng => {
    const count = randInt(rng, 3, 5);
    const nums = Array.from({ length: count }, () => randInt(rng, 1, 30));
    // Nudge the last number so the mean is a whole number.
    const rest = nums.slice(0, -1).reduce((s, n) => s + n, 0);
    const mean = Math.max(1, Math.round((rest + nums[count - 1]) / count));
    nums[count - 1] = mean * count - rest;
    if (nums[count - 1] <= 0) {
      return GENERATORS.mean(rng);
    }
    const sum = mean * count;
    return {
      textKey: 'mean',
      params: { list: nums.join('، ') },
      ...chooseNumber(rng, mean, [sum, mean + 1, Math.round(sum / (count - 1))], 5),
    };
  },

  volumeCuboid: rng => {
    const a = randInt(rng, 2, 12);
    const b = randInt(rng, 2, 12);
    const c = randInt(rng, 2, 12);
    const v = a * b * c;
    return {
      textKey: 'cuboid_volume',
      params: { a, b, c },
      ...chooseNumber(rng, v, [a + b + c, 2 * (a * b + b * c + a * c), a * b + c], 20),
    };
  },

  polygonAngles: rng => {
    const n = randInt(rng, 5, 12);
    const r = (n - 2) * 180;
    return {
      textKey: 'polygon_angles',
      params: { n },
      ...choose(
        rng,
        fmtNum(r),
        [n * 180, (n - 1) * 180, 360, (n - 2) * 90].map(fmtNum),
        () => fmtNum(r + nonZero(rng, -3, 3) * 180),
      ),
    };
  },

  pythagoras: rng => {
    const [p, q, h] = pick(rng, [
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25],
    ]);
    const k = randInt(rng, 1, 3);
    const [a, b, c] = [p * k, q * k, h * k];
    if (rng() < 0.5) {
      return {
        textKey: 'hypotenuse',
        params: { a, b },
        ...chooseNumber(rng, c, [a + b, a * a + b * b, b + 1], 3),
      };
    }
    return {
      textKey: 'leg',
      params: { c, a },
      ...chooseNumber(rng, b, [c - a, c + a, c * c - a * a], 3),
    };
  },

  probabilityDice: rng => {
    const k = randInt(rng, 1, 4);
    const event = pick(rng, [
      { key: 'dice_even', count: 3 },
      { key: 'dice_prime', count: 3 },
      { key: 'dice_mult3', count: 2 },
      { key: 'dice_greater', count: 6 - k },
    ]);
    const correct = frac(event.count, 6);
    const others = [1, 2, 3, 4, 5].map(n => frac(n, 6));
    return {
      textKey: event.key,
      params: { k },
      ...chooseFrac(rng, correct, [frac(6 - event.count, 6), frac(1, event.count), ...others]),
    };
  },

  powerRules: rng => {
    const a = randInt(rng, 2, 7);
    const b = randInt(rng, 2, 6);
    const rule = pick(rng, ['mul', 'pow', 'div'] as const);
    const pw = (e: number) => (e === 1 ? 'x' : `x^${e}`);
    if (rule === 'mul') {
      return {
        textKey: 'simplify',
        expression: `x^${a} * x^${b}`,
        ...choose(rng, pw(a + b), [pw(a * b), `2${pw(a + b)}`, `${pw(a + b)}^2`], () => pw(a + b + nonZero(rng, -2, 2))),
      };
    }
    if (rule === 'pow') {
      return {
        textKey: 'simplify',
        expression: `(x^${a})^${b}`,
        ...choose(rng, pw(a * b), [pw(a + b), pw(a * b + a), `${b}${pw(a)}`], () => pw(a * b + nonZero(rng, -2, 2))),
      };
    }
    const big = a + b;
    return {
      textKey: 'simplify',
      expression: `x^${big} / x^${b}`,
      ...choose(rng, pw(a), [pw(big + b), pw(big * b), `${pw(a)}^2`], () => pw(a + nonZero(rng, 1, 3))),
    };
  },

  expandBinomial: rng => {
    const a = nonZero(rng, -9, 9);
    const b = nonZero(rng, -9, 9);
    const sign = (n: number) => (n > 0 ? `+ ${n}` : `- ${-n}`);
    return {
      textKey: 'expand',
      expression: `(x ${sign(a)})(x ${sign(b)})`,
      ...choose(
        rng,
        fmtQuadratic(a + b, a * b),
        [fmtQuadratic(0, a * b), fmtQuadratic(a * b, a + b), fmtQuadratic(a + b, a + b), fmtQuadratic(-(a + b), a * b)],
        () => fmtQuadratic(a + b + nonZero(rng, -2, 2), a * b),
      ),
    };
  },

  setOps: rng => {
    // Overlapping sets, so union, intersection and difference all differ.
    const shared = randomSet(rng, randInt(rng, 1, 2));
    const rest = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !shared.includes(n)));
    const a = [...shared, ...rest.slice(0, randInt(rng, 1, 3))];
    const b = [...shared, ...rest.slice(3, 3 + randInt(rng, 1, 3))];
    const union = fmtSet([...a, ...b]);
    const inter = fmtSet(a.filter(n => b.includes(n)));
    const aMinusB = fmtSet(a.filter(n => !b.includes(n)));
    const bMinusA = fmtSet(b.filter(n => !a.includes(n)));
    const op = pick(rng, [
      { key: 'set_union', correct: union },
      { key: 'set_intersection', correct: inter },
      { key: 'set_difference', correct: aMinusB },
    ] as const);
    return {
      textKey: op.key,
      expression: `A = ${fmtSet(a)} , B = ${fmtSet(b)}`,
      ...choose(rng, op.correct, [union, inter, aMinusB, bMinusA, fmtSet(a), fmtSet(b)], () =>
        fmtSet(randomSet(rng, randInt(rng, 1, 4))),
      ),
    };
  },

  vectorFromPoints: rng => {
    const [x1, y1, x2, y2] = [0, 0, 0, 0].map(() => randInt(rng, -6, 6));
    const [dx, dy] = [x2 - x1, y2 - y1];
    return {
      textKey: 'vector_ab',
      expression: `A(${x1}, ${y1}) , B(${x2}, ${y2})`,
      ...choose(
        rng,
        fmtVec(dx, dy),
        // A - B, B + A, and x/y swapped: the usual slips.
        [fmtVec(-dx, -dy), fmtVec(x2 + x1, y2 + y1), fmtVec(dy, dx)],
        () => fmtVec(dx + nonZero(rng, -3, 3), dy + randInt(rng, -3, 3)),
      ),
    };
  },

  vectorAdd: rng => {
    const [a, b, c, d] = [0, 0, 0, 0].map(() => randInt(rng, -6, 6));
    const k = randInt(rng, 2, 4);
    const kind = randInt(rng, 0, 2);
    if (kind === 0) {
      return {
        textKey: 'compute',
        expression: `${fmtVec(a, b)} + ${fmtVec(c, d)}`,
        ...choose(rng, fmtVec(a + c, b + d), [fmtVec(a - c, b - d), fmtVec(a + d, b + c), fmtVec(a * c, b * d)], () =>
          fmtVec(a + c + nonZero(rng, -3, 3), b + d),
        ),
      };
    }
    if (kind === 1) {
      return {
        textKey: 'compute',
        expression: `${fmtVec(a, b)} - ${fmtVec(c, d)}`,
        ...choose(rng, fmtVec(a - c, b - d), [fmtVec(a + c, b + d), fmtVec(c - a, d - b), fmtVec(a - c, b + d)], () =>
          fmtVec(a - c, b - d + nonZero(rng, -3, 3)),
        ),
      };
    }
    return {
      textKey: 'compute',
      expression: `${k}${fmtVec(a, b)} + ${fmtVec(c, d)}`,
      // Forgetting to multiply the second component, or scaling the sum.
      ...choose(rng, fmtVec(k * a + c, k * b + d), [fmtVec(k * a + c, b + d), fmtVec(k * (a + c), k * (b + d)), fmtVec(a + c, b + d)], () =>
        fmtVec(k * a + c + nonZero(rng, -3, 3), k * b + d),
      ),
    };
  },

  // ریاضی نهم «حجم و مساحت»: sphere, cone and pyramid, sized so the
  // answer is a whole number (times π where it has one).
  solidVolume: rng => {
    const piTimes = (k: number) => (k === 1 ? 'π' : `${k}π`);
    const kind = randInt(rng, 0, 2);
    if (kind === 0) {
      const r = 3 * randInt(rng, 1, 3);
      const k = (4 * r ** 3) / 3;
      return {
        textKey: 'sphere_volume',
        params: { r },
        // Missing the 4/3, using r^2, or 4πr^2 (the surface area).
        ...choose(rng, piTimes(k), [piTimes(r ** 3), piTimes((4 * r ** 2) / 3), piTimes(4 * r ** 2)], () =>
          piTimes(k + 3 * nonZero(rng, -5, 5)),
        ),
      };
    }
    if (kind === 1) {
      const r = randInt(rng, 1, 6);
      const h = 3 * randInt(rng, 1, 4);
      const k = (r * r * h) / 3;
      return {
        textKey: 'cone_volume',
        params: { r, h },
        // Forgetting ÷3 (a cylinder), or r instead of r^2.
        ...choose(rng, piTimes(k), [piTimes(r * r * h), piTimes((r * h) / 3), piTimes(2 * r * h)], () =>
          piTimes(k + nonZero(rng, -5, 5)),
        ),
      };
    }
    const a = randInt(rng, 2, 9);
    const h = 3 * randInt(rng, 1, 4);
    const v = (a * a * h) / 3;
    return {
      textKey: 'pyramid_volume',
      params: { a, h },
      ...chooseNumber(rng, v, [a * a * h, (a * h) / 3, 4 * a * h], 6),
    };
  },

  // ---------- grades 10–12 ----------

  setComplement: rng => {
    const u = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = randomSet(rng, randInt(rng, 2, 5)).filter(n => n <= 8);
    const set = a.length ? a : [1, 2];
    const comp = u.filter(n => !set.includes(n));
    return {
      textKey: 'set_complement',
      expression: `U = ${fmtSet(u)} , A = ${fmtSet(set)}`,
      // A itself, U, or the complement with one element slipped in/out.
      ...choose(rng, fmtSet(comp), [fmtSet(set), fmtSet(u), fmtSet([...comp, set[0]]), fmtSet(comp.slice(1))], () =>
        fmtSet(randomSet(rng, randInt(rng, 2, 5)).filter(n => n <= 8)),
      ),
    };
  },

  quadraticRoots: rng => {
    const r1 = randInt(rng, -6, 6);
    let r2 = randInt(rng, -6, 6);
    while (r2 === r1 || r2 === -r1) {
      r2 = randInt(rng, -6, 6);
    }
    // (x - r1)(x - r2) = x^2 - (r1 + r2)x + r1·r2
    const roots = (p: number, q: number) => [p, q].sort((m, n) => m - n).join(' , ');
    return {
      textKey: 'quadratic_roots',
      expression: `${fmtQuadratic(-(r1 + r2), r1 * r2)} = 0`,
      // The classic sign slip, and half-right answers.
      ...choose(rng, roots(r1, r2), [roots(-r1, -r2), roots(r1, -r2), roots(-r1, r2)], () =>
        roots(r1 + nonZero(rng, -2, 2), r2),
      ),
    };
  },

  logValue: rng => {
    const base = pick(rng, [2, 3, 5, 10] as const);
    const k = base === 10 ? randInt(rng, 1, 4) : randInt(rng, 2, base === 2 ? 6 : 4);
    const value = base ** k;
    const name = base === 10 ? 'log' : `log${'₀₁₂₃₄₅₆₇₈₉'[base]}`;
    return {
      textKey: 'compute',
      expression: `${name}(${value})`,
      // value ÷ base, base × k and k + 1 — mixing up log with division.
      ...chooseNumber(rng, k, [value / base, base * k, k + 1], 3),
    };
  },

  logEquation: rng => {
    const base = pick(rng, [2, 3, 5] as const);
    const n = randInt(rng, 1, base === 2 ? 5 : 3);
    const c = randInt(rng, -4, 4);
    const x = base ** n - c;
    const sub = '₀₁₂₃₄₅₆₇₈₉'[base];
    return {
      textKey: 'solve_x',
      expression: `log${sub}(${fmtLinear(1, c)}) = ${n}`,
      // base·n instead of base^n, n^base, and forgetting to move c.
      ...chooseNumber(rng, x, [base * n - c, n ** base - c, base ** n], 5),
    };
  },

  expEquation: rng => {
    const base = pick(rng, [2, 3, 5] as const);
    const p = randInt(rng, 1, base === 5 ? 2 : 3);
    const k = randInt(rng, -3, 3);
    const m = p * randInt(rng, 1, base === 2 ? 3 : 2);
    // (base^p)^(x + k) = base^m  →  p(x + k) = m
    const x = m / p - k;
    return {
      textKey: 'solve_x',
      expression: `${base ** p}^${group(fmtLinear(1, k))} = ${base ** m}`,
      // Using m without dividing by p, and dropping k.
      ...chooseNumber(rng, x, [m - k, m / p, m / p + k], 3),
    };
  },

  limitAlgebraic: rng => {
    const a = randInt(rng, -5, 5);
    if (rng() < 0.3) {
      // A polynomial: just substitute.
      const b = randInt(rng, -5, 5);
      const c = randInt(rng, -5, 5);
      const value = a * a + b * a + c;
      return {
        textKey: 'limit_value',
        expression: `lim(x→${a}) ${fmtQuadratic(b, c)}`,
        ...chooseNumber(rng, value, [a * a + c, value + 2 * a, -value], 4),
      };
    }
    // (x - a)(x + b)/(x - a): 0/0, cancel, substitute → a + b.
    let b = randInt(rng, -5, 5);
    while (b === -a) {
      b = randInt(rng, -5, 5);
    }
    return {
      textKey: 'limit_value',
      expression: `lim(x→${a}) (${fmtQuadratic(b - a, -a * b)})/${group(fmtLinear(1, -a))}`,
      // 0/0 read as 0 or 1, the wrong sign, and b alone.
      ...chooseNumber(rng, a + b, [0, 1, a - b, b], 4),
    };
  },

  limitInfinity: rng => {
    const kind = randInt(rng, 0, 2);
    const p = nonZero(rng, -6, 6);
    const q = randInt(rng, 1, 6);
    const r = randInt(rng, -9, 9);
    const s = nonZero(rng, -9, 9);
    if (kind === 0) {
      // Same degree: ratio of the leading coefficients.
      return {
        textKey: 'limit_value',
        expression: `lim(x→∞) (${term(p, 'x^2')} + ${r})/(${term(q, 'x^2')} + ${s})`.replace(/\+ -/g, '- ').replace(/ \+ 0\)/g, ')'),
        ...choose(rng, fmtFrac(frac(p, q)), [fmtFrac(frac(q, p)), fmtFrac(frac(r, s)), '0', '∞'], () =>
          fmtFrac(frac(p + nonZero(rng, -3, 3), q)),
        ),
      };
    }
    if (kind === 1) {
      // Lower degree on top: 0.
      return {
        textKey: 'limit_value',
        expression: `lim(x→∞) (${term(p, 'x')} + ${r})/(${term(q, 'x^2')} + ${s})`.replace(/\+ -/g, '- ').replace(/ \+ 0\)/g, ')'),
        ...choose(rng, '0', [fmtFrac(frac(p, q)), '∞', fmtFrac(frac(r, s))], () => String(nonZero(rng, -5, 5))),
      };
    }
    // Higher degree on top: ±∞ with the sign of p/q.
    const correct = p > 0 ? '∞' : '-∞';
    return {
      textKey: 'limit_value',
      expression: `lim(x→∞) (${term(p, 'x^2')} + ${r})/(${term(q, 'x')} + ${s})`.replace(/\+ -/g, '- ').replace(/ \+ 0\)/g, ')'),
      ...choose(rng, correct, [p > 0 ? '-∞' : '∞', fmtFrac(frac(p, q)), '0'], () => String(nonZero(rng, -5, 5))),
    };
  },

  graphCounting: rng => {
    const kind = randInt(rng, 0, 3);
    if (kind === 0) {
      const p = randInt(rng, 4, 12);
      return {
        textKey: 'graph_complete',
        params: { p },
        // Each edge counted twice, p², and p - 1 (a vertex's degree).
        ...chooseNumber(rng, (p * (p - 1)) / 2, [p * (p - 1), (p * p) / 2, p - 1], 5),
      };
    }
    if (kind === 1) {
      const k = randInt(rng, 2, 5);
      const p = 2 * randInt(rng, k, 8); // k·p even, k ≤ p - 1
      return {
        textKey: 'graph_regular',
        params: { p, k },
        ...chooseNumber(rng, (k * p) / 2, [k * p, k + p, 2 * k * p], 5),
      };
    }
    if (kind === 2) {
      const q = randInt(rng, 5, 20);
      return {
        textKey: 'graph_degree_sum',
        params: { q },
        // Forgetting the ×2 (each edge has two ends).
        ...chooseNumber(rng, 2 * q, [q, q + 2, 2 * q - 2], 5),
      };
    }
    const p = randInt(rng, 5, 9);
    const q = randInt(rng, 3, (p * (p - 1)) / 2 - 2);
    return {
      textKey: 'graph_complement',
      params: { p, q },
      ...chooseNumber(rng, (p * (p - 1)) / 2 - q, [p * (p - 1) - q, p * p - q, q], 5),
    };
  },

  slope: rng => {
    const m = nonZero(rng, -5, 5);
    const x1 = randInt(rng, -5, 5);
    const y1 = randInt(rng, -5, 5);
    const dx = randInt(rng, 1, 4);
    const x2 = x1 + dx;
    const y2 = y1 + m * dx;
    const dy = y2 - y1;
    return {
      textKey: 'slope',
      expression: `A(${x1}, ${y1}) , B(${x2}, ${y2})`,
      ...choose(
        rng,
        fmtNum(m),
        [fmtNum(-m), fmtFrac(frac(dx, dy)), fmtNum(y2 + y1), fmtNum(dy + dx)],
        () => fmtNum(m + nonZero(rng, -3, 3)),
      ),
    };
  },
};

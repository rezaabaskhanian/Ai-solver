// The math key row above/below the equation field: symbols a phone
// keyboard hides (or that students don't know how to type), inserted in
// the exact syntax the Math Engine parses (backend/math-engine/app/solver
// /normalize.py + parser.py: "^" powers, sqrt(), sin(), "pi", "d/dx(...)",
// "∫ ... dx", "lim(x→...)", log()/log_2()/ln(), sets {…} ∪ ∩ and
// vectors [x, y]).

export interface MathKey {
  id: string;
  label: string;
  insert: string;
  // Where the cursor lands, counted from the start of `insert`. Defaults
  // to the end -- e.g. "sin()" puts it between the parentheses instead.
  cursor?: number;
  // Keypad styling (Stitch "type_problem"): operators sit on a tinted
  // key, calculus keys use the success color, the rest are plain.
  tone?: 'operator' | 'calculus';
}

export const MATH_KEYS: MathKey[] = [
  { id: 'x', label: 'x', insert: 'x' },
  { id: 'square', label: 'x²', insert: '^2' },
  { id: 'power', label: 'xⁿ', insert: '^' },
  { id: 'sqrt', label: '√', insert: 'sqrt()', cursor: 5 },
  { id: 'parens', label: '( )', insert: '()', cursor: 1 },
  { id: 'equals', label: '=', insert: '=' },
  { id: 'plus', label: '+', insert: '+', tone: 'operator' },
  { id: 'minus', label: '−', insert: '-', tone: 'operator' },
  { id: 'times', label: '×', insert: '*', tone: 'operator' },
  { id: 'divide', label: '÷', insert: '/', tone: 'operator' },
  { id: 'sin', label: 'sin', insert: 'sin()', cursor: 4 },
  { id: 'cos', label: 'cos', insert: 'cos()', cursor: 4 },
  { id: 'tan', label: 'tan', insert: 'tan()', cursor: 4 },
  { id: 'pi', label: 'π', insert: 'pi' },
  // An angle in degrees, sin(30°): the engine converts it to radians.
  { id: 'degree', label: '°', insert: '°' },
  { id: 'derivative', label: 'd/dx', insert: 'd/dx()', cursor: 5, tone: 'calculus' },
  { id: 'integral', label: '∫ dx', insert: '∫ dx', cursor: 1, tone: 'calculus' },
  // f'(2) / y'' — the prime a phone keyboard buries (or turns into ’).
  { id: 'prime', label: "f′", insert: "'", tone: 'calculus' },
  // Cursor lands on the point: the student types it, then the expression
  // after the closing parenthesis.
  { id: 'limit', label: 'lim', insert: 'lim(x→)', cursor: 6, tone: 'calculus' },
  { id: 'infinity', label: '∞', insert: '∞' },
  { id: 'log', label: 'log', insert: 'log()', cursor: 4 },
  { id: 'log2', label: 'log₂', insert: 'log_2()', cursor: 6 },
  { id: 'ln', label: 'ln', insert: 'ln()', cursor: 3 },
  { id: 'setBraces', label: '{ }', insert: '{}', cursor: 1 },
  { id: 'union', label: '∪', insert: '∪', tone: 'operator' },
  { id: 'intersection', label: '∩', insert: '∩', tone: 'operator' },
  { id: 'complement', label: "A'", insert: "'" },
  { id: 'emptySet', label: '∅', insert: '∅' },
  { id: 'count', label: 'n( )', insert: 'n()', cursor: 2 },
  { id: 'vector', label: '[ , ]', insert: '[,]', cursor: 1 },
  { id: 'length', label: '| |', insert: '||', cursor: 1 },
  { id: 'comma', label: ',', insert: ', ' },
];

// The keypad's tabs (general / trig / calculus / limits & logs / sets &
// vectors) as ordered key ids.
export const MATH_KEY_TABS: {
  id: 'general' | 'trig' | 'calculus' | 'limitLog' | 'setsVectors';
  keys: string[];
}[] = [
  {
    id: 'general',
    keys: ['x', 'square', 'power', 'sqrt', 'parens', 'equals', 'plus', 'minus', 'times', 'divide', 'pi', 'derivative'],
  },
  { id: 'trig', keys: ['sin', 'cos', 'tan', 'degree', 'pi', 'x', 'square', 'parens', 'equals', 'plus', 'minus', 'times', 'divide'] },
  { id: 'calculus', keys: ['derivative', 'integral', 'prime', 'x', 'square', 'power', 'sqrt', 'parens', 'sin', 'cos', 'plus', 'minus', 'times'] },
  { id: 'limitLog', keys: ['limit', 'infinity', 'log', 'log2', 'ln', 'x', 'power', 'sqrt', 'parens', 'equals', 'plus', 'minus', 'divide'] },
  {
    id: 'setsVectors',
    keys: ['setBraces', 'union', 'intersection', 'minus', 'complement', 'emptySet', 'count', 'equals', 'comma', 'vector', 'length', 'plus', 'parens'],
  },
];

// Shown under the active tab next to its how-to-write hint
// (problemInput.tabHints.*), so students see the exact notation each
// tab's keys build before they have to guess it.
export const TAB_EXAMPLES: Record<(typeof MATH_KEY_TABS)[number]['id'], string[]> = {
  general: ['2x+5=17', 'x^2-5x+6=0', 'y=x^2-4'],
  trig: ['sin(30°)', 'sin(x)^2+cos(x)^2', 'tan(x)*cos(x)'],
  calculus: ['d/dx(x^3+2x)', "f(x)=x^3, f''(x)", "f(x)=x^3, f'(2)", '∫ 2x dx', '∫_0^1 x^2 dx'],
  limitLog: ['lim(x→2)(x^2-4)/(x-2)', 'log_2(x)+log_2(x-2)=3'],
  setsVectors: ['A={1,2,3}, B={2,3,4}, A∪B', '[2, 3] + [1, -4]'],
};

export function mathKeyById(id: string): MathKey | undefined {
  return MATH_KEYS.find(k => k.id === id);
}

export interface Selection {
  start: number;
  end: number;
}

// Replaces the current selection (or inserts at the cursor) with the
// key's text; returns the new value and where the cursor should go.
export function applyMathKey(
  value: string,
  selection: Selection,
  key: MathKey,
): { value: string; cursor: number } {
  const start = Math.max(0, Math.min(selection.start, value.length));
  const end = Math.max(start, Math.min(selection.end, value.length));
  const next = value.slice(0, start) + key.insert + value.slice(end);
  return { value: next, cursor: start + (key.cursor ?? key.insert.length) };
}

// Backspace: removes the selection, or the character before the cursor.
export function deleteBackward(value: string, selection: Selection): { value: string; cursor: number } {
  const start = Math.max(0, Math.min(selection.start, value.length));
  const end = Math.max(start, Math.min(selection.end, value.length));
  if (start !== end) {
    return { value: value.slice(0, start) + value.slice(end), cursor: start };
  }
  if (start === 0) {
    return { value, cursor: 0 };
  }
  return { value: value.slice(0, start - 1) + value.slice(start), cursor: start - 1 };
}

// Tappable starters shown while the field is empty -- one per problem type
// the engine supports, so students see the expected syntax by example.
export const EXAMPLE_PROBLEMS: string[] = [
  '2x+5=17',
  'x^2-5x+6=0',
  'x^3-6x^2+11x-6=0',
  'x^4-5x^2+4=0',
  '2x+y=5, x-y=1',
  '2(x+3)-x',
  'sin(x)^2+cos(x)^2',
  'd/dx(x^3+2x)',
  '∫ 2x dx',
  'lim(x→2)(x^2-4)/(x-2)',
  'log_2(x)+log_2(x-2)=3',
  'A={1,2,3}, B={2,3,4}, A∪B',
  '[2, 3] + [1, -4]',
  'y=x^3-3x',
];

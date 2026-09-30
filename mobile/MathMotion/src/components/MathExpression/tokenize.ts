// Splits a formatted equation/expression string into individual tokens
// (numbers, letters, operators, parens) so each one can be rendered as
// its own Text node — PRD section 28 requires this granularity for the
// future Animation Engine (move/fade/scale/highlight per token), even
// though phase 1 only needs a static render.
// Commas are kept for point/list notation, e.g. A(1, -2) in exam questions.
// A log's subscript base stays on its name (log₂), and any other symbol
// the engine prints (∫ → ∞ ⁺ ≠ ≤ ∄ ∅ …) is its own token rather than
// being silently dropped.
const TOKEN_PATTERN = /\d+(\.\d+)?|[a-zA-Z]+[₀-₉]*|\^|[+\-*/=(),]|[^\s\w]/g;

// The engine prints roots as sympy does, sqrt(7); textbooks write √7,
// and √(x + 1) for anything longer than one number or letter.
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

// For plain Text (no MathExpression), e.g. answers in the history list:
// x^2 → x², x^-1 → x⁻¹. Only numeric exponents have Unicode forms.
export function superscriptDigits(text: string): string {
  return text.replace(/\^(-?)(\d+)/g, (_, minus: string, digits: string) =>
    (minus ? '⁻' : '') + digits.replace(/\d/g, d => SUPERSCRIPT_DIGITS[Number(d)]),
  );
}

export function prettifyMath(expression: string): string {
  return expression
    .replace(/sqrt\((\d+(?:\.\d+)?|[a-zA-Z])\)/g, '√$1')
    .replace(/sqrt\(/g, '√(');
}

// "x = 2 or x = 3" → ["x₁ = 2", "x₂ = 3"]: several roots one per line,
// numbered as in textbooks. A single answer comes back unchanged.
const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
export function splitRoots(answer: string): string[] {
  // A system's answer "x = 2, y = 1": one unknown per line.
  const system = answer.split(', ');
  if (system.length > 1 && system.every(part => /^[a-zA-Z] = /.test(part))) {
    return system;
  }
  const parts = answer.split(' or ');
  if (parts.length < 2) {
    return parts;
  }
  return parts.map((part, i) =>
    part.replace(/^([a-zA-Z])\s*=/, (_, name: string) => `${name}${SUBSCRIPTS[i + 1] ?? ''} =`),
  );
}

export function tokenizeExpression(expression: string): string[] {
  return expression.match(TOKEN_PATTERN) ?? [expression];
}

export interface MathPiece {
  text: string;
  // An exponent: drawn small and raised (x²) instead of after a "^".
  sup?: boolean;
}

// Tokens → pieces, folding each "^" and its exponent into one raised
// piece: x^2 → x ², x^(n+1) → x ⁿ⁺¹ (outer parens dropped), x^-1 → x ⁻¹.
export function withExponents(tokens: string[]): MathPiece[] {
  const pieces: MathPiece[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    if (token !== '^' || next === undefined) {
      pieces.push({ text: token });
      continue;
    }
    if (next === '(') {
      let depth = 0;
      let end = i + 1;
      for (; end < tokens.length; end++) {
        depth += tokens[end] === '(' ? 1 : tokens[end] === ')' ? -1 : 0;
        if (depth === 0) {
          break;
        }
      }
      pieces.push({ text: tokens.slice(i + 2, end).join(''), sup: true });
      i = end;
    } else if (next === '-' && tokens[i + 2] !== undefined) {
      pieces.push({ text: `-${tokens[i + 2]}`, sup: true });
      i += 2;
    } else {
      pieces.push({ text: next, sup: true });
      i += 1;
    }
  }
  return pieces;
}

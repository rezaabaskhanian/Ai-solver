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
export function prettifyMath(expression: string): string {
  return expression
    .replace(/sqrt\((\d+(?:\.\d+)?|[a-zA-Z])\)/g, '√$1')
    .replace(/sqrt\(/g, '√(');
}

// "x = 2 or x = 3" → ["x₁ = 2", "x₂ = 3"]: several roots one per line,
// numbered as in textbooks. A single answer comes back unchanged.
const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
export function splitRoots(answer: string): string[] {
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

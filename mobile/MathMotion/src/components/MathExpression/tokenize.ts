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

export function tokenizeExpression(expression: string): string[] {
  return expression.match(TOKEN_PATTERN) ?? [expression];
}

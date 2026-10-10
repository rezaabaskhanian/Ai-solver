import type { KonkurQuestion } from './types';

// «حل گام‌به‌گام با موتور»: only a question's `expression` is ever sent to
// the math engine — never guessed from the prose. Most konkur expressions
// are fine (x^2, sqrt(), ×, ÷, lim(x→3), sin 30°, ∛ is not), but some are
// set algebra, probability, function definitions or lists, which the
// engine (backend/math-engine/app/solver/normalize.py) can't read.

// Everything the engine's normalizer + parser understand: digits (all
// three scripts), latin letters, + - × ÷ * / ^ ( ) = . and a few math
// symbols. Persian letters, sets (∪ ∩ '), brackets, |x|, commas, and
// inequalities are deliberately outside it.
const SUPPORTED_CHARS = /^[0-9۰-۹٠-٩A-Za-z\s+\-−×÷*/^().=·°º˚π√∞→₀-₉⁰-⁹²³¹]+$/;

// «y = …» / «f(x) = …» define a function (the question asks something
// about it); the engine solves an expression or an equation in x.
const FUNCTION_DEFINITION = /^\s*(?:[a-zA-Z]\s*(?:\([a-zA-Z]\))?)\s*=(?!=)/;

// A one-letter variable followed by a letter run that isn't a known
// function means a word or set name (A, B, P(A)...) — keep to x, y, z, n.
const KNOWN_WORDS = new Set(['sin', 'cos', 'tan', 'cot', 'log', 'ln', 'sqrt', 'lim', 'pi', 'oo', 'exp', 'abs']);
const ALLOWED_VARIABLES = new Set(['x', 'y', 'z', 'n', 't']);

function onlyEngineWords(text: string): boolean {
  const words = text.match(/[A-Za-z]+/g) ?? [];
  return words.every(word => {
    const lower = word.toLowerCase();
    if (KNOWN_WORDS.has(lower)) {
      return true;
    }
    // «3x», «xy», «2sin» -> split into single-letter variables / known
    // function prefixes is too clever; accept only variable-only runs.
    return [...lower].every(ch => ALLOWED_VARIABLES.has(ch)) && word === word.toLowerCase();
  });
}

export function engineExpressionFor(question: Pick<KonkurQuestion, 'expression'>): string | null {
  const raw = question.expression?.trim();
  if (!raw || raw.length > 120) {
    return null;
  }
  if (!SUPPORTED_CHARS.test(raw) || FUNCTION_DEFINITION.test(raw)) {
    return null;
  }
  if ((raw.match(/=/g) ?? []).length > 1 || !onlyEngineWords(raw)) {
    return null;
  }
  // Unbalanced parentheses will never parse.
  let depth = 0;
  for (const ch of raw) {
    depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
    if (depth < 0) {
      return null;
    }
  }
  return depth === 0 ? raw : null;
}

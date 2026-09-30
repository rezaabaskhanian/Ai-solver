import math
import re
from typing import Sequence

import sympy
from sympy.printing.str import StrPrinter

from .functions import LogB

_STAR_BETWEEN_COEFF_AND_SYMBOL = re.compile(r"(?<=\d)\*(?=[a-zA-Zπ(])")

# Named functions (trig/log/etc.) must keep their "*" when preceded by a
# symbol/paren: "x*cos(x)" -> "xcos(x)" would read as one identifier.
# "3*cos(x)" -> "3cos(x)" has no such ambiguity (handled by the digit
# rule above) and stays conventional textbook notation.
_FUNCTION_NAMES = (
    r"(?:a?sinh?|a?cosh?|a?tanh?|a?coth?|a?sech?|a?csch?|log[₀-₉]*|ln|exp|sqrt)"
)
_STAR_BETWEEN_SYMBOL_AND_PAREN = re.compile(
    r"(?<=[a-zA-Z)])\*(?=[a-zA-Z(])(?!" + _FUNCTION_NAMES + r"\()"
)


_SUBSCRIPT_DIGITS = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")


class _TextbookPrinter(StrPrinter):
    """sympy's str printer with textbook names for logs and infinity."""

    # sympy's log() is always the natural log (base e) — a based log is a
    # LogB — so it prints as the textbook "ln".
    def _print_log(self, expr):
        return f"ln({self._print(expr.args[0])})"

    # log(x) means base 10 in Iranian textbooks; other integer bases use a
    # subscript, e.g. log₂(x) (normalize.py reads it back as log_2(x)).
    def _print_LogB(self, expr):
        arg, base = expr.args
        if base == 10:
            return f"log({self._print(arg)})"
        if base.is_Integer and base > 1:
            return f"log{str(base).translate(_SUBSCRIPT_DIGITS)}({self._print(arg)})"
        return f"log({self._print(arg)}, {self._print(base)})"

    # 1/x^2 rather than sympy's x^(-2).
    def _print_Pow(self, expr, rational=False):
        if expr.exp.is_Integer and expr.exp < -1:
            return f"1/{self._print(sympy.Pow(expr.base, -expr.exp))}"
        return super()._print_Pow(expr, rational)

    def _print_Pi(self, expr):
        return "π"

    def _print_Infinity(self, expr):
        return "∞"

    def _print_NegativeInfinity(self, expr):
        return "-∞"


_PRINTER = _TextbookPrinter({"order": "lex"})


def format_expr(expr: sympy.Expr) -> str:
    """Render a sympy expression the way a textbook would print it.

    sympy's default str() gives '2*x + 5' and 'x**2'; the product
    format PRD examples (section 15/16) use plain '2x + 5' and
    'x^2'. This is purely cosmetic string post-processing, not a
    math operation.
    """
    s = _PRINTER.doprint(expr)
    s = s.replace("**", "^")
    s = _STAR_BETWEEN_COEFF_AND_SYMBOL.sub("", s)
    s = _STAR_BETWEEN_SYMBOL_AND_PAREN.sub("", s)
    return s


def format_root(root: sympy.Expr) -> str:
    """A root the way Iranian textbooks write it: one fraction over the
    radical, (5 + sqrt(7))/2, not sympy's 5/2 + sqrt(7)/2; a surd is
    simplified and common factors cancelled, (6 + 2sqrt(7))/4 ->
    (3 + sqrt(7))/2. Anything not of the form (p + k·sqrt(n))/d with
    integers prints as format_expr would.
    """
    # A real cube root (x^3 = 2 -> ∛2), which sympy prints as 2^(1/3).
    sign, magnitude = ("-", -root) if root.could_extract_minus_sign() else ("", root)
    if magnitude.is_Pow and magnitude.exp == sympy.Rational(1, 3) and magnitude.base.is_Integer:
        return f"{sign}∛{magnitude.base}"
    # A root of a non-integer, e.g. x^2 = 2 + sqrt(3) -> sqrt(2 + sqrt(3)).
    if magnitude.is_Pow and magnitude.exp == sympy.S.Half and not magnitude.base.is_Integer:
        return f"{sign}sqrt({format_root(magnitude.base)})"

    num, den = sympy.fraction(sympy.together(root))
    const, rest = sympy.expand(num).as_coeff_add()
    if len(rest) != 1 or not den.is_Integer or not const.is_Integer:
        return format_expr(root)
    k, radical = rest[0].as_coeff_Mul()
    if not (k.is_Integer and radical.is_Pow and radical.exp == sympy.S.Half and radical.base.is_Integer):
        return format_expr(root)

    p, k, d = int(const), int(k), int(den)
    g = math.gcd(math.gcd(p, k), d)
    p, k, d = p // g, k // g, d // g
    if d < 0:
        p, k, d = -p, -k, -d

    surd = f"sqrt({radical.base})"
    term = surd if abs(k) == 1 else f"{abs(k)}{surd}"
    if p == 0:
        numerator = f"-{term}" if k < 0 else term
        return numerator if d == 1 else f"{numerator}/{d}"
    numerator = f"{p} {'-' if k < 0 else '+'} {term}"
    return numerator if d == 1 else f"({numerator})/{d}"


def format_roots(symbol: sympy.Symbol, roots: Sequence[sympy.Expr]) -> str:
    """'x = 2 or x = 3' — the app shows 'or' as «یا» and lists the roots
    as x₁, x₂. No roots (a quadratic with Δ < 0) is the empty set."""
    return " or ".join(f"{symbol} = {format_root(r)}" for r in roots) or "∅"


def format_eq(lhs: sympy.Expr, rhs: sympy.Expr) -> str:
    return f"{format_expr(lhs)} = {format_expr(rhs)}"


def join_signed_terms(terms: Sequence[sympy.Expr]) -> str:
    """Join a list of terms the way a textbook would ('x^3 - 2x^2 + 7',
    not 'x^3 + -2x^2 + 7') -- used by derivative.py/integral.py when
    displaying a sum of per-term results.
    """
    parts = []
    for i, term in enumerate(terms):
        is_negative = term.could_extract_minus_sign()
        magnitude = format_expr(-term if is_negative else term)
        if i == 0:
            parts.append(f"-{magnitude}" if is_negative else magnitude)
        else:
            parts.append(f"{'-' if is_negative else '+'} {magnitude}")
    return " ".join(parts)

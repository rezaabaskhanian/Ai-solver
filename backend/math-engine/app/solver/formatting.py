import re
from typing import Sequence

import sympy

_STAR_BETWEEN_COEFF_AND_SYMBOL = re.compile(r"(?<=\d)\*(?=[a-zA-Z(])")

# Named functions (trig/log/etc.) must keep their "*" when preceded by a
# symbol/paren: "x*cos(x)" -> "xcos(x)" would read as one identifier.
# "3*cos(x)" -> "3cos(x)" has no such ambiguity (handled by the digit
# rule above) and stays conventional textbook notation.
_FUNCTION_NAMES = (
    r"(?:a?sinh?|a?cosh?|a?tanh?|a?coth?|a?sech?|a?csch?|log|ln|exp|sqrt)"
)
_STAR_BETWEEN_SYMBOL_AND_PAREN = re.compile(
    r"(?<=[a-zA-Z)])\*(?=[a-zA-Z(])(?!" + _FUNCTION_NAMES + r"\()"
)


def format_expr(expr: sympy.Expr) -> str:
    """Render a sympy expression the way a textbook would print it.

    sympy's default str() gives '2*x + 5' and 'x**2'; the product
    format PRD examples (section 15/16) use plain '2x + 5' and
    'x^2'. This is purely cosmetic string post-processing, not a
    math operation.
    """
    s = sympy.sstr(expr, order="lex")
    s = s.replace("**", "^")
    s = _STAR_BETWEEN_COEFF_AND_SYMBOL.sub("", s)
    s = _STAR_BETWEEN_SYMBOL_AND_PAREN.sub("", s)
    # sympy's log() is always natural log (base e) in this codebase — we
    # never construct log(x, base) — so this is an unambiguous rename to
    # the textbook-conventional "ln". Done last so the star-stripping
    # regexes above (which check for "log(") still recognize it.
    s = s.replace("log(", "ln(")
    return s


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

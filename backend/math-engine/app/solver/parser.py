import itertools
import re
from dataclasses import dataclass
from typing import Optional

import sympy
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    standard_transformations,
    parse_expr,
)

from .formatting import format_eq, format_expr
from .normalize import normalize_input

_TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

# Derivative/integral notation is matched by regex *before* the input ever
# reaches sympy's parser. This matters for more than convenience: sympy's
# parser evaluates a call to a name in its own namespace immediately
# (parse_expr("diff(x^2, x)") returns 2*x on the spot, already computed),
# which would silently skip step generation entirely. Matching first and
# only parsing the extracted inner expression avoids that.
_D_DX_PATTERN = re.compile(r"^d/d([a-zA-Z])\((.+)\)$")
_DIFF_CALL_PATTERN = re.compile(r"^(?:diff|derivative)\((.+),([a-zA-Z]\w*)\)$")
_INTEGRAL_SIGN_PATTERN = re.compile(r"^∫(.+)d([a-zA-Z])$")
_INTEGRAL_CALL_PATTERN = re.compile(r"^(?:integrate|integral)\((.+),([a-zA-Z]\w*)\)$")

_TRIG_FUNCTIONS = (
    sympy.sin, sympy.cos, sympy.tan, sympy.cot, sympy.sec, sympy.csc,
)

# Letters OCR (or a shaky handwriting scan) commonly misreads a digit as.
# Deliberately excludes letters this app's problems actually use as
# variables (x/y/z/t/n/s/...) -- these are all letters textbooks themselves
# avoid as variable names *because* they're visually ambiguous with a
# digit, so treating them as noise here is safe. See PRD section 9's
# "2x + S = 17" example.
_OCR_DIGIT_CONFUSABLES = {
    "S": "5",
    "O": "0", "o": "0",
    "I": "1", "l": "1",
    "B": "8",
    "Z": "2",
    "G": "6",
    "g": "9",
}
_SINGLE_LETTER_TOKEN = re.compile(r"(?<![A-Za-z0-9_])[A-Za-z](?![A-Za-z0-9_])")
_MAX_OCR_CORRECTION_POSITIONS = 4
_OCR_CORRECTION_CONFIDENCE = 0.6


def _match_derivative(compact: str) -> Optional[tuple[str, str]]:
    m = _D_DX_PATTERN.match(compact)
    if m:
        return m.group(2), m.group(1)
    m = _DIFF_CALL_PATTERN.match(compact)
    if m:
        return m.group(1), m.group(2)
    return None


def _match_integral(compact: str) -> Optional[tuple[str, str]]:
    m = _INTEGRAL_SIGN_PATTERN.match(compact)
    if m:
        return m.group(1), m.group(2)
    m = _INTEGRAL_CALL_PATTERN.match(compact)
    if m:
        return m.group(1), m.group(2)
    return None


class ParseError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass
class ParsedProblem:
    raw: str
    normalized: str
    display: str
    problem_type: str
    confidence: float
    symbol: Optional[sympy.Symbol]
    lhs: Optional[sympy.Expr]  # set when problem_type is an equation
    rhs: Optional[sympy.Expr]
    expr: Optional[sympy.Expr]  # set when problem_type is a bare expression


_SUPPORTED_EQUATION_TYPES = {"linear_equation", "quadratic_equation"}


def _parse_side(text: str) -> sympy.Expr:
    try:
        return parse_expr(text, transformations=_TRANSFORMATIONS)
    except Exception as exc:  # sympy raises several exception types
        raise ParseError(f"Could not parse '{text}' as a math expression") from exc


_CoreParse = tuple[str, str, Optional[sympy.Symbol], Optional[sympy.Expr],
                    Optional[sympy.Expr], Optional[sympy.Expr]]


def _parse_core(normalized: str) -> _CoreParse:
    """Parse an already-normalized string into
    (display, problem_type, symbol, lhs, rhs, expr), raising ParseError on
    failure. Kept free of raw/confidence bookkeeping so `parse_problem` can
    reuse it both for the direct parse and for OCR-correction retries.
    """
    compact = re.sub(r"\s+", "", normalized)

    derivative_match = _match_derivative(compact)
    if derivative_match:
        inner_text, var_name = derivative_match
        expr = _parse_side(inner_text)
        symbol = sympy.Symbol(var_name)
        display = f"d/d{var_name}[{format_expr(expr)}]"
        return display, "derivative", symbol, None, None, expr

    integral_match = _match_integral(compact)
    if integral_match:
        inner_text, var_name = integral_match
        expr = _parse_side(inner_text)
        symbol = sympy.Symbol(var_name)
        display = f"∫{format_expr(expr)} d{var_name}"
        return display, "integral", symbol, None, None, expr

    parts = normalized.split("=")
    if len(parts) > 2:
        raise ParseError("Only one '=' is supported per equation")

    if len(parts) == 2:
        lhs = _parse_side(parts[0])
        rhs = _parse_side(parts[1])
        free_symbols = lhs.free_symbols | rhs.free_symbols

        if len(free_symbols) == 0:
            display = format_eq(lhs, rhs)
            return display, "arithmetic_equation", None, lhs, rhs, None

        if len(free_symbols) > 1:
            raise ParseError(
                "Only single-variable equations are supported in this version"
            )

        symbol = next(iter(free_symbols))
        diff = sympy.expand(lhs - rhs)
        try:
            poly = sympy.Poly(diff, symbol)
        except sympy.polys.polyerrors.PolynomialError:
            raise ParseError(
                "Equations with trigonometric or other non-polynomial terms "
                "aren't supported yet (MVP covers linear and quadratic "
                "equations)"
            )
        degree = poly.degree()

        if degree == 1:
            problem_type = "linear_equation"
        elif degree == 2:
            problem_type = "quadratic_equation"
        else:
            raise ParseError(
                f"Equations of degree {degree} are not supported yet "
                "(MVP covers linear and quadratic equations)"
            )

        display = format_eq(lhs, rhs)
        return display, problem_type, symbol, lhs, rhs, None

    # No '=' -> plain expression to simplify/evaluate.
    expr = _parse_side(parts[0])
    free_symbols = expr.free_symbols
    if len(free_symbols) > 1:
        raise ParseError(
            "Only single-variable expressions are supported in this version"
        )
    problem_type = "arithmetic" if not free_symbols else "expression"
    if expr.has(*_TRIG_FUNCTIONS):
        problem_type = "trig_expression"
    display = format_expr(expr)
    symbol = next(iter(free_symbols)) if free_symbols else None
    return display, problem_type, symbol, None, None, expr


def _ocr_correction_candidates(text: str) -> list[str]:
    """Every way of swapping some non-empty subset of `text`'s OCR-confusable
    single-letter tokens for the digit they're likely a misread of.
    """
    positions = [
        m.start() for m in _SINGLE_LETTER_TOKEN.finditer(text)
        if text[m.start()] in _OCR_DIGIT_CONFUSABLES
    ]
    if not positions or len(positions) > _MAX_OCR_CORRECTION_POSITIONS:
        return []

    candidates = []
    for count in range(1, len(positions) + 1):
        for subset in itertools.combinations(positions, count):
            chars = list(text)
            for pos in subset:
                chars[pos] = _OCR_DIGIT_CONFUSABLES[text[pos]]
            candidates.append("".join(chars))
    return candidates


def _try_ocr_correction(normalized: str) -> Optional[tuple[str, _CoreParse]]:
    """Fallback used once a straight parse of `normalized` has already
    failed: try reading OCR-confusable letters (S/O/I/l/B/Z/G/g) as the
    digit they're commonly misread from, per PRD section 9's
    "2x + S = 17" example.

    A genuine single-variable equation that happens to use one of these
    letters as its variable already parses on the first try in
    `parse_problem` and never reaches here, so it's never rewritten.

    Returns None if nothing parses, or if more than one *distinct* result
    parses -- an ambiguous guess is worse than surfacing the original error.
    """
    results: dict[str, _CoreParse] = {}
    for candidate in _ocr_correction_candidates(normalized):
        try:
            results[candidate] = _parse_core(candidate)
        except ParseError:
            continue
        if len(results) > 1:
            return None
    if len(results) != 1:
        return None
    (candidate_text, parsed), = results.items()
    return candidate_text, parsed


def parse_problem(raw_input: str) -> ParsedProblem:
    if not raw_input or not raw_input.strip():
        raise ParseError("Input is empty")

    normalized = normalize_input(raw_input)

    try:
        display, problem_type, symbol, lhs, rhs, expr = _parse_core(normalized)
    except ParseError as original_error:
        correction = _try_ocr_correction(normalized)
        if correction is None:
            raise original_error
        normalized, (display, problem_type, symbol, lhs, rhs, expr) = correction
        return ParsedProblem(raw_input, normalized, display, problem_type,
                              _OCR_CORRECTION_CONFIDENCE, symbol, lhs, rhs, expr)

    confidence = 0.99 if normalized == raw_input.strip() else 0.85
    return ParsedProblem(raw_input, normalized, display, problem_type,
                          confidence, symbol, lhs, rhs, expr)


def is_supported_equation(problem_type: str) -> bool:
    return problem_type in _SUPPORTED_EQUATION_TYPES

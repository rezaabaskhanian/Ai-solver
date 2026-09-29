import itertools
import re
from dataclasses import dataclass
from typing import Any, Optional

import sympy
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    standard_transformations,
    parse_expr,
)

from .formatting import format_eq, format_expr
from .functions import LogB, symbolic_logs, to_real_logs
from .geometry import GeometryError, looks_like_geometry, parse_geometry_problem
from .graphs import GraphError, looks_like_graph, parse_graph_problem
from .normalize import normalize_input
from .sets import SetsError, looks_like_sets, parse_set_problem
from .vectors import VectorError, looks_like_vectors, parse_vector_problem

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
# lim(x->2)(...), lim_(x->0+)..., lim_{x->oo}... and limit(expr, x, 2).
# Matched before parsing for the same reason as d/dx: sympy would
# evaluate limit(...) on the spot.
_LIM_PATTERN = re.compile(r"^lim_?[({]([a-zA-Z])->([^(){}]+)[)}](.+)$")
_LIMIT_CALL_PATTERN = re.compile(r"^limit\((.+),([a-zA-Z]),([^,()]+)\)$")
_INFINITY_NAMES = {"oo", "inf", "infinity"}

# log(...) in any of the ways students type it: log(x) (base 10, the
# Iranian textbook convention), log_2(x) / log2(x) / log2x, log(x, 2),
# log x, log100. Rewritten to logb(arg, base) before sympy sees it, since
# sympy's own log means ln. See functions.LogB.
_LOG_START = re.compile(r"(?<![A-Za-z])log(_?)(\d*)\s*")
_LOCAL_DICT = {"logb": LogB}

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


def _match_limit(compact: str) -> Optional[tuple[str, str, str]]:
    """(inner expression, variable, point text) for limit notation."""
    m = _LIM_PATTERN.match(compact)
    if m:
        return m.group(3), m.group(1), m.group(2)
    m = _LIMIT_CALL_PATTERN.match(compact)
    if m:
        return m.group(1), m.group(2), m.group(3)
    return None


def _parse_limit_point(text: str) -> tuple[sympy.Expr, str]:
    """"2" -> (2, "+-"), "0+" / "0^+" -> (0, "+"), "-oo" -> (-oo, "+-")."""
    direction = "+-"
    m = re.match(r"^(.+?)\^?([+-])$", text)
    if m and m.group(1) not in ("", "-"):
        text, direction = m.group(1), m.group(2)
    sign, name = (-1, text[1:]) if text.startswith("-") else (1, text.lstrip("+"))
    if name.lower() in _INFINITY_NAMES:
        return sign * sympy.oo, "+-"
    point = _parse_side(text)
    if point.free_symbols or not point.is_real:
        raise ParseError(f"'{text}' is not a number a limit can approach")
    return point, direction


def _matching_paren(text: str, open_index: int) -> int:
    depth = 0
    for i in range(open_index, len(text)):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return i
    raise ParseError("Unbalanced parentheses")


def _split_top_level_commas(text: str) -> list[str]:
    parts, depth, start = [], 0, 0
    for i, ch in enumerate(text):
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == "," and depth == 0:
            parts.append(text[start:i])
            start = i + 1
    parts.append(text[start:])
    return parts


def _rewrite_logs(text: str) -> str:
    """Rewrite every log form (see _LOG_START) to logb(arg, base)."""
    out, i = [], 0
    while True:
        m = _LOG_START.search(text, i)
        if not m:
            out.append(text[i:])
            return "".join(out)
        out.append(text[i:m.start()])
        underscore, digits, rest_at = m.group(1), m.group(2), m.end()

        if rest_at < len(text) and text[rest_at] == "(":
            close = _matching_paren(text, rest_at)
            args = _split_top_level_commas(_rewrite_logs(text[rest_at + 1:close]))
            if digits and len(args) == 1:
                arg, base = args[0], digits
            elif not digits and len(args) == 2:
                arg, base = args
            elif not digits and len(args) == 1:
                arg, base = args[0], "10"
            else:
                raise ParseError("Could not read the logarithm's base")
            i = close + 1
        else:
            letter = re.match(r"[a-zA-Z](?![a-zA-Z(])", text[rest_at:])
            if letter:
                # log2x / log_2 x -> base 2 of x; log x -> base 10 of x.
                arg, base = letter.group(0), digits or "10"
                i = rest_at + 1
            elif digits and not underscore:
                # log100 -> log(100), base 10.
                arg, base = digits, "10"
                i = rest_at
            else:
                raise ParseError("Could not read the logarithm's argument")
        out.append(f"logb({arg},{base})")


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
    # Set when problem_type is "limit": the point x approaches and the
    # side ("+-" two-sided, "+" from the right, "-" from the left).
    limit_point: Optional[sympy.Expr] = None
    limit_dir: Optional[str] = None
    # Set for "set_operation" (sets.SetProblem) and "vector"
    # (vectors.VectorProblem): these aren't sympy expressions.
    structure: Optional[Any] = None


_SUPPORTED_EQUATION_TYPES = {"linear_equation", "quadratic_equation"}


def _parse_side(text: str) -> sympy.Expr:
    text = _rewrite_logs(text)
    try:
        return parse_expr(text, local_dict=_LOCAL_DICT, transformations=_TRANSFORMATIONS)
    except Exception as exc:  # sympy raises several exception types
        raise ParseError(f"Could not parse '{text}' as a math expression") from exc


# (display, problem_type, symbol, lhs, rhs, expr, extra ParsedProblem fields)
_CoreParse = tuple[str, str, Optional[sympy.Symbol], Optional[sympy.Expr],
                    Optional[sympy.Expr], Optional[sympy.Expr], dict[str, Any]]


def _has_symbolic_exponent(expr: sympy.Expr, symbol: sympy.Symbol) -> bool:
    return any(
        p.exp.has(symbol) and p.base.is_number
        for p in expr.atoms(sympy.Pow)
    )


def _parse_core(normalized: str) -> _CoreParse:
    """Parse an already-normalized string into
    (display, problem_type, symbol, lhs, rhs, expr), raising ParseError on
    failure. Kept free of raw/confidence bookkeeping so `parse_problem` can
    reuse it both for the direct parse and for OCR-correction retries.
    """
    compact = re.sub(r"\s+", "", normalized)

    # The geometry calculator's area(circle, r=3) style questions.
    if looks_like_geometry(compact):
        try:
            problem = parse_geometry_problem(compact)
        except GeometryError as exc:
            raise ParseError(exc.message) from exc
        return problem.display, "geometry", None, None, None, None, {"structure": problem}

    # Graph counting questions: complete_graph(p=6), graph(ab, bc) ...
    if looks_like_graph(compact):
        try:
            problem = parse_graph_problem(compact)
        except GraphError as exc:
            raise ParseError(exc.message) from exc
        return problem.display, "graph", None, None, None, None, {"structure": problem}

    # Logs keep their textbook base (LogB) only where a solver reasons
    # about them — the display, and log equations. Everything else gets
    # sympy's real log (to_real_logs) so diff/integrate/limit just work.
    derivative_match = _match_derivative(compact)
    if derivative_match:
        inner_text, var_name = derivative_match
        expr = _parse_side(inner_text)
        symbol = sympy.Symbol(var_name)
        display = f"d/d{var_name}[{format_expr(expr)}]"
        return display, "derivative", symbol, None, None, to_real_logs(expr), {}

    integral_match = _match_integral(compact)
    if integral_match:
        inner_text, var_name = integral_match
        expr = _parse_side(inner_text)
        symbol = sympy.Symbol(var_name)
        display = f"∫{format_expr(expr)} d{var_name}"
        return display, "integral", symbol, None, None, to_real_logs(expr), {}

    limit_match = _match_limit(compact)
    if limit_match:
        inner_text, var_name, point_text = limit_match
        expr = _parse_side(inner_text)
        symbol = sympy.Symbol(var_name)
        if expr.free_symbols - {symbol}:
            raise ParseError("Only single-variable limits are supported in this version")
        point, direction = _parse_limit_point(point_text)
        side = {"+": "⁺", "-": "⁻"}.get(direction, "")
        display = f"lim({var_name}→{format_expr(point)}{side}) {format_expr(expr)}"
        extra = {"limit_point": point, "limit_dir": direction}
        return display, "limit", symbol, None, None, to_real_logs(expr), extra

    # Sets and vectors have their own small grammars ({...}, [...]) —
    # checked after lim_{x->a}, whose braces aren't a set.
    if looks_like_sets(compact):
        try:
            problem = parse_set_problem(compact)
        except SetsError as exc:
            raise ParseError(exc.message) from exc
        return problem.display, "set_operation", None, None, None, None, {"structure": problem}

    if looks_like_vectors(compact):
        try:
            problem = parse_vector_problem(compact)
        except VectorError as exc:
            raise ParseError(exc.message) from exc
        return problem.display, "vector", None, None, None, None, {"structure": problem}

    parts = normalized.split("=")
    if len(parts) > 2:
        raise ParseError("Only one '=' is supported per equation")

    if len(parts) == 2:
        lhs = _parse_side(parts[0])
        rhs = _parse_side(parts[1])
        free_symbols = lhs.free_symbols | rhs.free_symbols

        display = format_eq(lhs, rhs)

        if len(free_symbols) == 0:
            return (display, "arithmetic_equation", None,
                    to_real_logs(lhs), to_real_logs(rhs), None, {})

        if len(free_symbols) > 1:
            raise ParseError(
                "Only single-variable equations are supported in this version"
            )

        symbol = next(iter(free_symbols))
        if symbolic_logs(lhs, symbol) or symbolic_logs(rhs, symbol):
            return display, "log_equation", symbol, lhs, rhs, None, {}

        lhs, rhs = to_real_logs(lhs), to_real_logs(rhs)
        if _has_symbolic_exponent(lhs, symbol) or _has_symbolic_exponent(rhs, symbol):
            return display, "exponential_equation", symbol, lhs, rhs, None, {}

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

        return display, problem_type, symbol, lhs, rhs, None, {}

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
    # Kept with LogB so expression.py can show "log₂(8)" before its value.
    return display, problem_type, symbol, None, None, expr, {}


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
        display, problem_type, symbol, lhs, rhs, expr, extra = _parse_core(normalized)
    except ParseError as original_error:
        correction = _try_ocr_correction(normalized)
        if correction is None:
            raise original_error
        normalized, (display, problem_type, symbol, lhs, rhs, expr, extra) = correction
        return ParsedProblem(raw_input, normalized, display, problem_type,
                              _OCR_CORRECTION_CONFIDENCE, symbol, lhs, rhs, expr, **extra)

    confidence = 0.99 if normalized == raw_input.strip() else 0.85
    return ParsedProblem(raw_input, normalized, display, problem_type,
                          confidence, symbol, lhs, rhs, expr, **extra)


def is_supported_equation(problem_type: str) -> bool:
    return problem_type in _SUPPORTED_EQUATION_TYPES

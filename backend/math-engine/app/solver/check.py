from dataclasses import dataclass
from typing import Optional

import sympy
from sympy.parsing.sympy_parser import parse_expr

from .expression import solve_expression
from .formatting import format_expr
from .linear import solve_linear
from .normalize import normalize_input
from .parser import _TRANSFORMATIONS, ParseError
from .quadratic import _is_linear_factor, solve_quadratic
from .schemas_internal import StepData

_EQUATION_TYPES = ("linear_equation", "quadratic_equation")
_EXPRESSION_TYPES = ("expression", "arithmetic", "trig_expression")


class UnsupportedForCheck(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass
class CheckOutcome:
    status: str  # "correct_and_solved" | "correct_so_far" | "incorrect"
    step_statuses: list[str]
    first_error_index: Optional[int]
    next_step_hint: Optional[StepData]
    correct_answer: str


def _parse_line(normalized_line: str, is_equation: bool):
    """Parse one student line the same way parse_problem parses a side/
    expression, reusing the exact same sympy transformations so a
    student's line is held to the same parsing rules as the original
    problem. Raises ParseError if the line can't be parsed or doesn't
    match the expected shape (equation vs bare expression).
    """
    parts = normalized_line.split("=")
    if is_equation:
        if len(parts) != 2:
            raise ParseError(f"Expected an equation with one '=' sign: '{normalized_line}'")
        sides = parts
    else:
        if len(parts) != 1:
            raise ParseError(f"Expected an expression without '=': '{normalized_line}'")
        sides = parts

    try:
        parsed = [parse_expr(s, transformations=_TRANSFORMATIONS) for s in sides]
    except Exception as exc:
        raise ParseError(f"Could not parse '{normalized_line}'") from exc

    if is_equation:
        return parsed[0], parsed[1]
    return parsed[0], None


def _equations_equivalent(lhs1, rhs1, lhs2, rhs2, symbol) -> bool:
    try:
        return sympy.solveset(sympy.Eq(lhs1, rhs1), symbol) == sympy.solveset(
            sympy.Eq(lhs2, rhs2), symbol
        )
    except Exception:
        return False


def _expressions_equivalent(expr1: sympy.Expr, expr2: sympy.Expr) -> bool:
    try:
        return bool(sympy.simplify(expr1 - expr2) == 0)
    except Exception:
        return False


def _is_fully_solved_equation(problem_type: str, lhs, rhs, symbol) -> bool:
    if problem_type == "linear_equation":
        return lhs == symbol and rhs.is_number

    # Quadratic: our per-line (lhs, rhs) model can't represent the final
    # disjunctive answer ("x = 2 or x = 3") as a single equation, so
    # "solved" is defined as reaching the factored zero-product form —
    # the last state a textbook line can actually express. The
    # irrational-root (quadratic formula) path never reaches a
    # representable "solved" line either, for the same reason — it stays
    # "correct_so_far" with the formula step as its hint. A known,
    # documented scope limit, not a bug.
    if problem_type == "quadratic_equation":
        if rhs != 0:
            return False
        # "Solved" for a quadratic means lhs is already written as a
        # product of linear factors (e.g. the student's own line was
        # "(x-2)(x-3) = 0") — checked structurally on what they actually
        # wrote, not by re-deriving and comparing a separately factored
        # form (which would almost never match structurally).
        return lhs.is_Mul and all(_is_linear_factor(f, symbol) for f in lhs.args)
    return False


def _hint_for_equation(problem_type: str, lhs, rhs, symbol) -> Optional[StepData]:
    if problem_type == "linear_equation":
        steps, _ = solve_linear(lhs, rhs, symbol)
    else:
        steps, _ = solve_quadratic(lhs, rhs, symbol)
    return steps[0] if steps else None


def check_student_work(
    problem_type: str,
    lhs: Optional[sympy.Expr],
    rhs: Optional[sympy.Expr],
    expr: Optional[sympy.Expr],
    symbol: Optional[sympy.Symbol],
    student_steps: list[str],
) -> CheckOutcome:
    is_equation = problem_type in _EQUATION_TYPES
    if not is_equation and problem_type not in _EXPRESSION_TYPES:
        raise UnsupportedForCheck(f"'{problem_type}' is not supported for step checking yet.")

    if is_equation:
        if problem_type == "linear_equation":
            _, final_value = solve_linear(lhs, rhs, symbol)
            correct_answer = f"{symbol} = {format_expr(final_value)}"
        else:
            _, roots = solve_quadratic(lhs, rhs, symbol)
            correct_answer = " or ".join(f"{symbol} = {format_expr(r)}" for r in roots)
        last_lhs, last_rhs = lhs, rhs
    else:
        _, simplified = solve_expression(expr)
        correct_answer = format_expr(simplified)
        last_expr = expr

    step_statuses: list[str] = []
    first_error_index: Optional[int] = None

    for i, raw_line in enumerate(student_steps):
        normalized = normalize_input(raw_line)
        try:
            parsed_a, parsed_b = _parse_line(normalized, is_equation)
        except ParseError:
            step_statuses.append("incorrect")
            first_error_index = i
            break

        if is_equation:
            ok = _equations_equivalent(last_lhs, last_rhs, parsed_a, parsed_b, symbol)
        else:
            ok = _expressions_equivalent(last_expr, parsed_a)

        if not ok:
            step_statuses.append("incorrect")
            first_error_index = i
            break

        step_statuses.append("correct")
        if is_equation:
            last_lhs, last_rhs = parsed_a, parsed_b
        else:
            last_expr = parsed_a

    if first_error_index is not None:
        status = "incorrect"
        hint = (
            _hint_for_equation(problem_type, last_lhs, last_rhs, symbol)
            if is_equation
            else _expression_hint(last_expr)
        )
    elif is_equation and _is_fully_solved_equation(problem_type, last_lhs, last_rhs, symbol):
        status, hint = "correct_and_solved", None
    elif not is_equation and _expressions_equivalent(last_expr, simplified):
        status, hint = "correct_and_solved", None
    else:
        status = "correct_so_far"
        hint = (
            _hint_for_equation(problem_type, last_lhs, last_rhs, symbol)
            if is_equation
            else _expression_hint(last_expr)
        )

    return CheckOutcome(
        status=status,
        step_statuses=step_statuses,
        first_error_index=first_error_index,
        next_step_hint=hint,
        correct_answer=correct_answer,
    )


def _expression_hint(expr: sympy.Expr) -> Optional[StepData]:
    steps, _ = solve_expression(expr)
    return steps[0] if steps else None

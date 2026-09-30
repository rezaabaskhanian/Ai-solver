from dataclasses import replace
from typing import Optional

import sympy

from .formatting import format_expr, join_signed_terms
from .messages import explained
from .schemas_internal import StepData

_TRIG_FUNCTIONS = (sympy.sin, sympy.cos, sympy.tan)


class DerivativeUnsupported(Exception):
    """f'(a) where f or its derivative isn't defined at a (1/x at 0,
    sqrt(x) at 0...) — caught in main.py and surfaced as a clean 422."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def solve_derivative_problem(expr: sympy.Expr, symbol: sympy.Symbol, order: int = 1,
                             at: Optional[sympy.Expr] = None) -> tuple[list[StepData], sympy.Expr]:
    """y', y'' and f'(a) the way حسابان works them: find y' term by term
    (solve_derivative); for y'' differentiate that result once more with
    the same steps; for f'(a) substitute the point into the final
    derivative. Returns the steps and the derivative (or its value at
    `at`)."""
    steps, result = solve_derivative(expr, symbol)

    if order == 2:
        first = format_expr(result)
        steps.append(StepData(
            id=0, before=f"y' = {first}", after=f"y'' = d/d{symbol}[{first}]",
            operation="differentiate_again", value=None, target="expression",
            **explained("derivative_second"),
        ))
        again, result = solve_derivative(result, symbol)
        steps += again

    if at is not None:
        value = sympy.simplify(result.subs(symbol, at))
        defined = sympy.simplify(expr.subs(symbol, at))
        if not all(v.is_real and v.is_finite for v in (value, defined)):
            raise DerivativeUnsupported(
                f"The derivative of '{format_expr(expr)}' isn't defined at {symbol} = {format_expr(at)}."
            )
        steps.append(StepData(
            id=0, before=format_expr(result), after=format_expr(value),
            operation="substitute_point", value=format_expr(at), target="expression",
            **explained("derivative_at_point", symbol=symbol, point=format_expr(at)),
        ))
        result = value

    return [replace(step, id=i) for i, step in enumerate(steps, start=1)], result


def solve_derivative(expr: sympy.Expr, symbol: sympy.Symbol) -> tuple[list[StepData], sympy.Expr]:
    """Generate textbook-style differentiation steps: split into additive
    terms (sum rule), name the rule applied to each term (constant/power/
    trig), then combine. Terms that don't match a named rule (products,
    compositions like sin(2x), exp, log, ...) fall back to a generic
    "apply differentiation rules" step -- sympy.diff is always the source
    of truth for the actual value, the steps are for narration only, same
    philosophy as linear.py's hand-walked algorithm.
    """
    steps: list[StepData] = []
    step_id = 1

    expanded = sympy.expand(expr)
    terms = expanded.as_ordered_terms()

    if len(terms) > 1:
        steps.append(StepData(
            id=step_id, before=format_expr(expanded),
            after=join_signed_terms(terms),
            operation="sum_rule", value=None, target="expression",
            **explained("derivative_sum_rule"),
        ))
        step_id += 1

    term_derivatives = []
    for term in terms:
        derivative, step = _differentiate_term(term, symbol, step_id)
        steps.append(step)
        term_derivatives.append(derivative)
        step_id += 1

    result = sympy.diff(expr, symbol)

    if len(terms) > 1:
        steps.append(StepData(
            id=step_id,
            before=join_signed_terms(term_derivatives),
            after=format_expr(result),
            operation="combine", value=None, target="expression",
            **explained("derivative_combine"),
        ))
        step_id += 1

    return steps, result


def _differentiate_term(term: sympy.Expr, symbol: sympy.Symbol, step_id: int) -> tuple[sympy.Expr, StepData]:
    derivative = sympy.diff(term, symbol)
    before, after = format_expr(term), format_expr(derivative)

    if not term.has(symbol):
        return derivative, StepData(
            id=step_id, before=before, after=after,
            operation="constant_rule", value=None, target="term",
            **explained("derivative_constant_rule"),
        )

    _, base = term.as_independent(symbol, as_Add=False)

    if base == symbol or (base.is_Pow and base.base == symbol and base.exp.is_number):
        operation = "power_rule"
        message = explained("derivative_power_rule")
    elif base.func in _TRIG_FUNCTIONS and base.args[0] == symbol:
        operation = "trig_rule"
        message = explained("derivative_trig_rule", func=format_expr(base))
    else:
        operation = "apply_derivative_rules"
        message = explained("derivative_apply_rules")

    return derivative, StepData(
        id=step_id, before=before, after=after,
        operation=operation, value=None, target="term",
        **message,
    )

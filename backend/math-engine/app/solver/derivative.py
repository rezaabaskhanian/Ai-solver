import sympy

from .formatting import format_expr, join_signed_terms
from .messages import explained
from .schemas_internal import StepData

_TRIG_FUNCTIONS = (sympy.sin, sympy.cos, sympy.tan)


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

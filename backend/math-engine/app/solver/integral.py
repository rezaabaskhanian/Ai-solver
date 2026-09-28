import sympy

from .formatting import format_expr, join_signed_terms
from .schemas_internal import StepData

_TRIG_FUNCTIONS = (sympy.sin, sympy.cos)


class IntegrationUnsupported(Exception):
    """Raised when sympy can't find an elementary antiderivative (returns
    an unevaluated Integral) -- caught in main.py and surfaced as a clean
    422, same pattern as ParseError for unsupported equation degrees.
    """

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def solve_integral(expr: sympy.Expr, symbol: sympy.Symbol) -> tuple[list[StepData], sympy.Expr]:
    """Generate textbook-style integration steps: split into additive
    terms (sum rule), name the rule applied to each term (constant/
    reverse-power/log/trig), combine, then add the constant of
    integration. Same "sympy is the source of truth, steps are for
    narration" philosophy as derivative.py.
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
            explanation="Integrate each term separately (sum rule).",
        ))
        step_id += 1

    term_integrals = []
    for term in terms:
        integral, step = _integrate_term(term, symbol, step_id)
        steps.append(step)
        term_integrals.append(integral)
        step_id += 1

    result = sympy.integrate(expr, symbol)
    if result.has(sympy.Integral):
        raise IntegrationUnsupported(
            f"Could not find an elementary antiderivative for '{format_expr(expr)}'."
        )

    if len(terms) > 1:
        steps.append(StepData(
            id=step_id,
            before=join_signed_terms(term_integrals),
            after=format_expr(result),
            operation="combine", value=None, target="expression",
            explanation="Combine the integrated terms.",
        ))
        step_id += 1

    steps.append(StepData(
        id=step_id, before=format_expr(result), after=f"{format_expr(result)} + C",
        operation="add_constant", value=None, target="expression",
        explanation="Add the constant of integration, C, since the derivative of any constant is 0.",
    ))

    return steps, result


def _integrate_term(term: sympy.Expr, symbol: sympy.Symbol, step_id: int) -> tuple[sympy.Expr, StepData]:
    integral = sympy.integrate(term, symbol)
    before, after = format_expr(term), format_expr(integral)

    if integral.has(sympy.Integral):
        raise IntegrationUnsupported(
            f"Could not find an elementary antiderivative for '{before}'."
        )

    if not term.has(symbol):
        return integral, StepData(
            id=step_id, before=before, after=after,
            operation="constant_rule", value=None, target="term",
            explanation=f"The integral of a constant c is c·{symbol}.",
        )

    _, base = term.as_independent(symbol, as_Add=False)

    if base.is_Pow and base.base == symbol and base.exp == -1:
        operation = "log_rule"
        explanation = f"Integral of 1/{symbol} is ln|{symbol}|."
    elif base == symbol or (base.is_Pow and base.base == symbol and base.exp.is_number):
        operation = "power_rule"
        explanation = "Reverse power rule: raise the exponent by one and divide by the new exponent."
    elif base.func in _TRIG_FUNCTIONS and base.args[0] == symbol:
        operation = "trig_rule"
        explanation = f"Antiderivative of {format_expr(base)}."
    else:
        operation = "apply_integration_rules"
        explanation = "Apply integration rules."

    return integral, StepData(
        id=step_id, before=before, after=after,
        operation=operation, value=None, target="term",
        explanation=explanation,
    )

import sympy

from .formatting import format_expr, join_signed_terms
from .messages import explained
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


def solve_integral(expr: sympy.Expr, symbol: sympy.Symbol,
                   add_constant: bool = True) -> tuple[list[StepData], sympy.Expr]:
    """Generate textbook-style integration steps: split into additive
    terms (sum rule), name the rule applied to each term (constant/
    reverse-power/log/trig), combine, then add the constant of
    integration (skipped for a definite integral, where it cancels).
    Same "sympy is the source of truth, steps are for narration"
    philosophy as derivative.py.
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
            **explained("integral_sum_rule"),
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
            **explained("integral_combine"),
        ))
        step_id += 1

    if add_constant:
        steps.append(StepData(
            id=step_id, before=format_expr(result), after=f"{format_expr(result)} + C",
            operation="add_constant", value=None, target="expression",
            **explained("integral_add_constant"),
        ))

    return steps, result


def solve_definite_integral(expr: sympy.Expr, symbol: sympy.Symbol, lower: sympy.Expr,
                            upper: sympy.Expr) -> tuple[list[StepData], sympy.Expr]:
    """∫_a^b f dx the textbook way: find an antiderivative F with the
    same steps as solve_integral, then F(b) - F(a). sympy's own definite
    integral is the source of truth; when it disagrees with F(b) - F(a)
    (f isn't continuous on [a, b], e.g. 1/x from -1 to 1) the
    Newton–Leibniz steps would be wrong, so that's rejected too."""
    steps, antiderivative = solve_integral(expr, symbol, add_constant=False)

    exact = sympy.integrate(expr, (symbol, lower, upper))
    if exact.has(sympy.Integral) or not (exact.is_real and exact.is_finite):
        raise IntegrationUnsupported(
            f"The integral of '{format_expr(expr)}' from {format_expr(lower)} to "
            f"{format_expr(upper)} doesn't have a finite value."
        )
    at_upper = _at_bound(antiderivative, symbol, upper, "-")
    at_lower = _at_bound(antiderivative, symbol, lower, "+")
    if at_upper is None or at_lower is None or sympy.simplify(at_upper - at_lower - exact) != 0:
        raise IntegrationUnsupported(
            f"'{format_expr(expr)}' isn't continuous between {format_expr(lower)} and "
            f"{format_expr(upper)}, so F(b) - F(a) can't be used."
        )

    difference = f"({format_expr(at_upper)}) - ({format_expr(at_lower)})"
    step_id = len(steps) + 1
    steps.append(StepData(
        id=step_id,
        before=f"[{format_expr(antiderivative)}]_{_bound_text(lower)}^{_bound_text(upper)}",
        after=difference, operation="evaluate_bounds", value=None, target="expression",
        **explained("definite_evaluate_bounds", lower=format_expr(lower), upper=format_expr(upper)),
    ))
    steps.append(StepData(
        id=step_id + 1, before=difference, after=format_expr(exact),
        operation="simplify", value=None, target="expression",
        **explained("definite_result"),
    ))
    return steps, exact


def _at_bound(antiderivative: sympy.Expr, symbol: sympy.Symbol, bound: sympy.Expr,
              side: str) -> sympy.Expr | None:
    """F at a bound — approached from inside the interval when F isn't
    defined right at it (x·ln(x) at 0, anything at ±∞). None if that
    isn't a finite number."""
    value = None
    if bound.is_finite:
        value = sympy.simplify(antiderivative.subs(symbol, bound))
    if value is None or not (value.is_real and value.is_finite):
        try:
            # At ±∞ there's only one way to approach (same as limit.py).
            value = (sympy.limit(antiderivative, symbol, bound, side) if bound.is_finite
                     else sympy.limit(antiderivative, symbol, bound))
        except Exception:
            return None
    return value if value.is_real and value.is_finite else None


def _bound_text(bound: sympy.Expr) -> str:
    text = format_expr(bound)
    return text if len(text) == 1 else f"{{{text}}}"


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
            **explained("integral_constant_rule", symbol=symbol),
        )

    coeff, base = term.as_independent(symbol, as_Add=False)

    if base.is_Pow and base.base == symbol and base.exp == -1:
        operation = "log_rule"
        message = explained("integral_log_rule", symbol=symbol)
    elif base == symbol or (base.is_Pow and base.base == symbol and base.exp.is_number):
        operation = "power_rule"
        message = explained("integral_power_rule", calc=_power_rule_calc(coeff, base, symbol, after))
    elif base.func in _TRIG_FUNCTIONS and base.args[0] == symbol:
        operation = "trig_rule"
        message = explained("integral_trig_rule", func=format_expr(base),
                            rule=f"∫{format_expr(base)} d{symbol} = {format_expr(sympy.integrate(base, symbol))}")
    elif base == sympy.exp(symbol):
        operation = "apply_integration_rules"
        message = explained("integral_exp_rule", symbol=symbol, rule=f"∫e^{symbol} d{symbol} = e^{symbol}")
    else:
        operation = "apply_integration_rules"
        message = explained("integral_apply_rules")

    return integral, StepData(
        id=step_id, before=before, after=after,
        operation=operation, value=None, target="term",
        **message,
    )


def _power_rule_calc(coeff: sympy.Expr, base: sympy.Expr, symbol: sympy.Symbol, result: str) -> str:
    """'3·x^(2 + 1)/(2 + 1) = x^3': one more on the exponent, divided by it."""
    n = format_expr(base.exp if base.is_Pow else sympy.Integer(1))
    text = format_expr(coeff)
    front = "" if coeff == 1 else (f"({text})·" if coeff.could_extract_minus_sign() or not coeff.is_Atom else f"{text}·")
    return f"{front}{symbol}^({n} + 1)/({n} + 1) = {result}"

import sympy

from .formatting import format_expr, format_root, format_roots, join_signed_terms
from .messages import explained
from .schemas_internal import StepData


def solve_quadratic(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol) -> tuple[list[StepData], list[sympy.Expr]]:
    """Generate step-by-step operations for a quadratic equation.

    Tries factoring first (cleaner for textbook-style MVP examples like
    x^2 - 5x + 6 = 0); falls back to the quadratic formula when the
    roots aren't rational. A negative discriminant ends with «ریشه‌ی
    حقیقی ندارد» and no roots, as school textbooks do (no complex roots).
    """
    steps: list[StepData] = []
    step_id = 1

    standard = sympy.expand(lhs - rhs)
    poly = sympy.Poly(standard, symbol)
    a, b, c = (poly.coeff_monomial(symbol**2), poly.coeff_monomial(symbol), poly.coeff_monomial(1))

    if rhs != 0:
        before = f"{format_expr(lhs)} = {format_expr(rhs)}"
        after = f"{format_expr(standard)} = 0"
        steps.append(StepData(
            id=step_id, before=before, after=after,
            operation="move_term", value=None, target="both_sides",
            **explained("standard_form"),
        ))
        step_id += 1

    factored = sympy.factor(standard)
    roots: list[sympy.Expr]

    if factored.is_Mul and all(_is_linear_factor(f, symbol) for f in factored.args):
        before = f"{format_expr(standard)} = 0"
        after = f"{format_expr(factored)} = 0"
        steps.append(StepData(
            id=step_id, before=before, after=after,
            operation="factor", value=None, target="both_sides",
            **_explain_factoring(a, b, c, symbol, factored),
        ))
        step_id += 1

        roots = sorted(sympy.solve(sympy.Eq(standard, 0), symbol), key=str)
        steps.append(StepData(
            id=step_id, before=f"{format_expr(factored)} = 0", after=format_roots(symbol, roots),
            operation="zero_product_property", value=None, target="each_factor",
            **_explain_zero_product(factored, symbol),
        ))
        step_id += 1
    else:
        steps.append(StepData(
            id=step_id, before=f"a={format_expr(a)}, b={format_expr(b)}, c={format_expr(c)}",
            after=f"{symbol} = (-b ± √(b² - 4ac)) / 2a",
            operation="apply_quadratic_formula", value=None, target="equation",
            **explained("apply_quadratic_formula",
                        coeffs=f"a = {format_expr(a)}, b = {format_expr(b)}, c = {format_expr(c)}"),
        ))
        step_id += 1

        discriminant = sympy.expand(b**2 - 4 * a * c)
        steps.append(StepData(
            id=step_id, before="Δ = b² - 4ac", after=f"Δ = {format_expr(discriminant)}",
            operation="compute_discriminant", value=format_expr(discriminant), target="equation",
            **explained("compute_discriminant",
                        calc=f"Δ = {_paren(b)}² - 4 × {_paren(a)} × {_paren(c)} = {format_expr(discriminant)}"),
        ))
        step_id += 1

        if discriminant.is_negative:
            steps.append(StepData(
                id=step_id, before=f"Δ = {format_expr(discriminant)}", after="Δ < 0 ⇒ ∅",
                operation="no_real_roots", value=None, target="equation",
                **explained("no_real_roots", value=format_expr(discriminant)),
            ))
            return steps, []

        roots = sorted(sympy.solve(sympy.Eq(standard, 0), symbol), key=str)
        steps.append(StepData(
            id=step_id, before=f"{symbol} = (-b ± √Δ) / 2a", after=format_roots(symbol, roots),
            operation="compute_roots", value=None, target="equation",
            **_explain_formula_roots(a, b, discriminant, symbol, roots),
        ))
        step_id += 1

    return steps, roots


def _explain_factoring(a, b, c, symbol: sympy.Symbol, factored: sympy.Expr) -> dict:
    """Show the student how the factoring was found, the way a textbook
    does: a common factor when c = 0, the two numbers with product c and
    sum b when a = 1, or the a·c split of the middle term otherwise.
    Non-integer coefficients keep the short generic sentence."""
    if not all(k.is_Integer for k in (a, b, c)):
        return explained("factor")
    shown = format_expr(factored)

    if c == 0:
        g = sympy.gcd(a, b) * (-1 if a < 0 else 1)
        return explained("factor_common", factor=format_expr(g * symbol), factored=shown)

    # p + q = b and p·q = a·c: they're -a·r for the two roots r, always
    # integers here since they solve t^2 + bt + ac = 0 with rational roots.
    r1, r2 = sympy.Poly(a * symbol**2 + b * symbol + c, symbol).all_roots()
    p, q = sorted((-a * r1, -a * r2), key=lambda v: (abs(v), v))
    prod = f"{_paren(p)} × {_paren(q)} = {format_expr(a * c)}"
    total = f"{_paren(p)} + {_paren(q)} = {format_expr(b)}"
    common = {"b": format_expr(b), "p": format_expr(p), "q": format_expr(q),
              "prod": prod, "sum": total, "factored": shown, "symbol": symbol}

    if a == 1:
        return explained("factor_sum_product", c=format_expr(c), **common)
    return explained(
        "factor_ac", a=format_expr(a), ac=format_expr(a * c),
        ac_eq=f"{_paren(a)} × {_paren(c)} = {format_expr(a * c)}",
        split=join_signed_terms([a * symbol**2, p * symbol, q * symbol, c]) + " = 0",
        **common,
    )


def _explain_zero_product(factored: sympy.Expr, symbol: sympy.Symbol) -> dict:
    factors = [f for f in factored.args if not f.is_number]
    if len(factors) != 2:
        return explained("zero_product")
    eq1, eq2 = (f"{format_expr(f)} = 0" for f in factors)
    return explained("zero_product_each", eq1=eq1, eq2=eq2)


def _explain_formula_roots(a, b, discriminant, symbol: sympy.Symbol, roots) -> dict:
    """The formula with this equation's numbers: x = (5 ± √1) / 2."""
    minus_b = format_expr(-b)
    two_a = format_expr(2 * a)
    if discriminant == 0:
        return explained("compute_double_root",
                         calc=f"{symbol} = {minus_b} / {two_a} = {format_root(roots[0])}")
    return explained("compute_roots",
                     calc=f"{symbol} = ({minus_b} ± √{_paren(discriminant)}) / {two_a}")


def _paren(n: sympy.Expr) -> str:
    return f"({format_expr(n)})" if n < 0 else format_expr(n)


def _is_linear_factor(factor: sympy.Expr, symbol: sympy.Symbol) -> bool:
    if factor.is_number:
        return True
    try:
        return sympy.Poly(factor, symbol).degree() == 1
    except sympy.PolynomialError:
        return False

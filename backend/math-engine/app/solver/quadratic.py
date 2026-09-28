import sympy

from .formatting import format_expr
from .schemas_internal import StepData


def solve_quadratic(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol) -> tuple[list[StepData], list[sympy.Expr]]:
    """Generate step-by-step operations for a quadratic equation.

    Tries factoring first (cleaner for textbook-style MVP examples like
    x^2 - 5x + 6 = 0); falls back to the quadratic formula when the
    roots aren't rational.
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
            explanation="Rewrite the equation in standard form (ax^2 + bx + c = 0).",
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
            explanation="Factor the left-hand side.",
        ))
        step_id += 1

        roots = sorted(sympy.solve(sympy.Eq(standard, 0), symbol), key=str)
        roots_str = " or ".join(f"{symbol} = {format_expr(r)}" for r in roots)
        steps.append(StepData(
            id=step_id, before=f"{format_expr(factored)} = 0", after=roots_str,
            operation="zero_product_property", value=None, target="each_factor",
            explanation="If a product is zero, at least one factor must be zero.",
        ))
        step_id += 1
    else:
        steps.append(StepData(
            id=step_id, before=f"a={format_expr(a)}, b={format_expr(b)}, c={format_expr(c)}",
            after=f"{symbol} = (-b ± √(b² - 4ac)) / 2a",
            operation="apply_quadratic_formula", value=None, target="equation",
            explanation="Identify a, b, c and apply the quadratic formula.",
        ))
        step_id += 1

        discriminant = sympy.expand(b**2 - 4 * a * c)
        steps.append(StepData(
            id=step_id, before="b² - 4ac", after=format_expr(discriminant),
            operation="compute_discriminant", value=format_expr(discriminant), target="equation",
            explanation="Compute the discriminant.",
        ))
        step_id += 1

        roots = sorted(sympy.solve(sympy.Eq(standard, 0), symbol), key=str)
        roots_str = " or ".join(f"{symbol} = {format_expr(r)}" for r in roots)
        steps.append(StepData(
            id=step_id, before=f"{symbol} = (-b ± √(b² - 4ac)) / 2a", after=roots_str,
            operation="compute_roots", value=None, target="equation",
            explanation="Substitute a, b, c and the discriminant to compute the roots.",
        ))
        step_id += 1

    return steps, roots


def _is_linear_factor(factor: sympy.Expr, symbol: sympy.Symbol) -> bool:
    if factor.is_number:
        return True
    try:
        return sympy.Poly(factor, symbol).degree() == 1
    except sympy.PolynomialError:
        return False

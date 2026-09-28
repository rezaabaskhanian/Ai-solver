import sympy

from .formatting import format_eq, format_expr
from .messages import explained
from .schemas_internal import StepData


def solve_linear(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol) -> tuple[list[StepData], sympy.Expr]:
    """Generate human-style, textbook step-by-step operations for a
    linear equation, per PRD section 15 (subtract / divide / multiply
    / move_term animations) — not sympy's opaque `solve()`.

    Returns (steps, final_value_for_symbol).
    """
    steps: list[StepData] = []
    step_id = 1

    # Step 1: expand parentheses, e.g. 3(x + 2) = 15 -> 3x + 6 = 15
    expanded_lhs = sympy.expand(lhs)
    expanded_rhs = sympy.expand(rhs)
    if expanded_lhs != lhs or expanded_rhs != rhs:
        before = format_eq(lhs, rhs)
        lhs, rhs = expanded_lhs, expanded_rhs
        after = format_eq(lhs, rhs)
        steps.append(StepData(
            id=step_id, before=before, after=after,
            operation="expand", value=None, target="both_sides",
            **explained("expand"),
        ))
        step_id += 1

    # Step 2: move variable terms from the right side to the left.
    rhs_var_coeff = rhs.coeff(symbol, 1)
    if rhs_var_coeff != 0:
        term = rhs_var_coeff * symbol
        before = format_eq(lhs, rhs)
        new_lhs = sympy.expand(lhs - term)
        new_rhs = sympy.expand(rhs - term)
        after = format_eq(new_lhs, new_rhs)
        subtracting = rhs_var_coeff > 0
        op = "subtract" if subtracting else "add"
        term_str = format_expr(abs(rhs_var_coeff) * symbol)
        steps.append(StepData(
            id=step_id, before=before, after=after,
            operation=op, value=term_str, target="both_sides",
            **explained(f"{op}_both_sides", value=term_str),
        ))
        lhs, rhs = new_lhs, new_rhs
        step_id += 1

    # Step 3: move the constant term on the left to the right.
    lhs_poly = sympy.Poly(lhs, symbol)
    const_term = lhs_poly.coeff_monomial(1)
    if const_term != 0:
        before = format_eq(lhs, rhs)
        new_lhs = sympy.expand(lhs - const_term)
        new_rhs = sympy.expand(rhs - const_term)
        after = format_eq(new_lhs, new_rhs)
        subtracting = const_term > 0
        op = "subtract" if subtracting else "add"
        value_str = format_expr(sympy.Abs(const_term))
        steps.append(StepData(
            id=step_id, before=before, after=after,
            operation=op, value=value_str, target="both_sides",
            **explained(f"{op}_both_sides", value=value_str),
        ))
        lhs, rhs = new_lhs, new_rhs
        step_id += 1

    # Step 4: isolate the variable by dividing/multiplying by its coefficient.
    lhs_poly = sympy.Poly(lhs, symbol)
    coeff = lhs_poly.coeff_monomial(symbol)
    if coeff != 1:
        before = format_eq(lhs, rhs)
        new_lhs = sympy.simplify(lhs / coeff)
        new_rhs = sympy.simplify(rhs / coeff)
        after = format_eq(new_lhs, new_rhs)

        coeff_rational = sympy.Rational(coeff)
        if coeff_rational.q == 1:
            op = "divide"
            value_str = format_expr(coeff)
            message = explained("divide_both_sides", value=value_str)
        else:
            op = "multiply"
            reciprocal = 1 / coeff
            value_str = format_expr(reciprocal)
            message = explained("multiply_both_sides", value=value_str)

        steps.append(StepData(
            id=step_id, before=before, after=after,
            operation=op, value=value_str, target="both_sides",
            **message,
        ))
        lhs, rhs = new_lhs, new_rhs
        step_id += 1

    final_value = sympy.simplify(rhs)
    return steps, final_value

import dataclasses
from typing import Optional

import sympy

from .biquadratic import is_biquadratic, solve_biquadratic
from .cubic import CubicUnsupported, solve_cubic
from .formatting import format_eq, format_expr, format_root
from .linear import solve_linear
from .messages import explained
from .quadratic import solve_quadratic
from .schemas_internal import StepData


class RationalUnsupported(Exception):
    """A rational equation whose numerator isn't one of the polynomial
    shapes the other solvers handle — surfaced as a clean 422 by main.py."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def is_rational_equation(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol) -> bool:
    """x appears in a denominator and both the combined numerator and
    denominator are polynomials in x (so not sin(x)/x or 1/sqrt(x))."""
    num, den = sympy.fraction(sympy.together(lhs - rhs))
    if not den.has(symbol):
        return False
    return num.is_polynomial(symbol) and den.is_polynomial(symbol)


def solve_rational_equation(lhs: sympy.Expr, rhs: sympy.Expr,
                            symbol: sympy.Symbol) -> tuple[list[StepData], list[sympy.Expr]]:
    """Rational (fractional) equations the way the textbook solves them:

    1. write the domain (no denominator may be zero),
    2. move everything to one side over the common denominator; a
       fraction is zero only when its numerator is, so numerator = 0,
    3. solve that polynomial with the regular solvers (their steps read
       exactly like everywhere else),
    4. reject any root that makes a denominator zero.

    Returns (steps, accepted roots) — possibly no roots at all.
    """
    steps: list[StepData] = []
    x = format_expr(symbol)
    display = format_eq(lhs, rhs)

    def add(before: str, after: str, operation: str, key: str,
            value: Optional[str] = None, **params) -> None:
        if value is not None:
            params["value"] = value
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=value, target="both_sides", **explained(key, **params),
        ))

    excluded = _excluded_values(lhs, rhs, symbol)
    if excluded:
        add(display, ", ".join(f"{x} ≠ {format_root(v)}" for v in excluded), "domain", "rat_domain")

    num, den = sympy.fraction(sympy.together(lhs - rhs))
    num = sympy.expand(num)
    add(display, f"{format_expr(num)} = 0", "common_denominator", "rat_common_denominator",
        value=format_expr(sympy.factor(den)))

    if not num.has(symbol):
        if num == 0:
            raise RationalUnsupported("This equation holds for every allowed value of x.")
        add(f"{format_expr(num)} = 0", "∅", "no_root", "rat_no_root")
        return steps, []

    candidates = _solve_polynomial(num, symbol, steps)

    accepted = []
    for root in candidates:
        if any(sympy.simplify(root - v) == 0 for v in excluded):
            add(f"{x} = {format_root(root)}", f"{x} ≠ {format_root(root)}",
                "reject_root", "rat_reject_root", root=f"{x} = {format_root(root)}")
        else:
            accepted.append(root)
    if accepted and excluded:
        add(" or ".join(f"{x} = {format_root(r)}" for r in accepted),
            ", ".join(f"{x} ≠ {format_root(v)}" for v in excluded),
            "check_domain", "rat_check_domain")
    return steps, accepted


def _excluded_values(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol) -> list[sympy.Expr]:
    """Real x that make any denominator in the ORIGINAL equation zero —
    including the inner ones of a nested fraction ((1 + 1/x)/(1 - 1/x)
    excludes both x = 0 and x = 1)."""
    bases = set()
    for side in (lhs, rhs):
        for node in sympy.preorder_traversal(side):
            if node.is_Pow and node.exp.is_negative and node.base.has(symbol):
                bases.add(node.base)
    values = set()
    for base in bases:
        top, _ = sympy.fraction(sympy.together(base))
        for root in sympy.solve(top, symbol):
            if root.is_real:
                values.add(root)
    return sorted(values, key=lambda v: float(v))


def _solve_polynomial(num: sympy.Expr, symbol: sympy.Symbol,
                      steps: list[StepData]) -> list[sympy.Expr]:
    """num = 0 with the linear/quadratic/cubic/biquadratic solvers,
    appending their steps (renumbered) — real roots only."""
    zero = sympy.Integer(0)
    poly = sympy.Poly(num, symbol)
    degree = poly.degree()
    if degree == 1:
        sub_steps, root = solve_linear(num, zero, symbol)
        roots = [root]
    elif degree == 2:
        sub_steps, roots = solve_quadratic(num, zero, symbol)
    elif degree == 3:
        try:
            sub_steps, roots = solve_cubic(num, zero, symbol)
        except CubicUnsupported as exc:
            raise RationalUnsupported(exc.message) from exc
    elif degree == 4 and is_biquadratic(poly, symbol):
        sub_steps, roots = solve_biquadratic(num, zero, symbol)
    else:
        raise RationalUnsupported(
            f"After clearing the denominators the equation has degree {degree}, "
            "which isn't supported yet."
        )
    for step in sub_steps:
        steps.append(dataclasses.replace(step, id=len(steps) + 1))
    return [r for r in roots if r.is_real]

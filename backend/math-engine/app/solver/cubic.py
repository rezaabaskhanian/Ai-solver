"""Cubic equations (ax^3 + bx^2 + cx + d = 0) the way Iranian school
textbooks solve them — no Cardano formula:

1. only x^3 and a constant -> cube root: x^3 = 2 -> x = ∛2;
2. no constant term -> factor out x (or x^2): x(x^2 - 4) = 0;
3. otherwise find a rational root by trying the divisors of d over the
   divisors of a (P(1) = 0?), then divide by (x - r): (x - 1)(x^2 + x + 1) = 0;
4. solve what's left (a linear or quadratic factor — quadratic.py's steps,
   so Δ < 0 still reads «ریشه‌ی حقیقی ندارد»).

A cubic with no rational root is out of school scope -> CubicUnsupported.
"""
import dataclasses

import sympy

from .formatting import format_expr, format_root, format_roots
from .messages import explained
from .quadratic import solve_quadratic
from .schemas_internal import StepData


class CubicUnsupported(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def solve_cubic(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol) -> tuple[list[StepData], list[sympy.Expr]]:
    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, message: dict) -> None:
        steps.append(StepData(id=len(steps) + 1, before=before, after=after, operation=operation,
                              value=None, target="equation", **message))

    standard = sympy.expand(lhs - rhs)
    if rhs != 0:
        add(f"{format_expr(lhs)} = {format_expr(rhs)}", f"{format_expr(standard)} = 0",
            "move_term", explained("cubic_standard_form"))

    poly = sympy.Poly(standard, symbol)
    roots: list[sympy.Expr] = []

    a, b, c, d = (poly.coeff_monomial(symbol**n) for n in (3, 2, 1, 0))
    if b == 0 and c == 0 and d != 0:
        # Straight from the problem as written — no detour through "... = 0".
        steps.clear()
        value = -d / a
        original = f"{format_expr(lhs)} = {format_expr(rhs)}"
        isolated = f"{format_expr(symbol**3)} = {format_expr(value)}"
        if original != isolated:
            add(original, isolated, "isolate_cube", explained("cubic_isolate_cube"))
        root = sympy.real_root(value, 3)
        add(f"{format_expr(symbol**3)} = {format_expr(value)}", f"{symbol} = {format_root(root)}",
            "cube_root", explained("cubic_cube_root"))
        return steps, [root]

    if poly.coeff_monomial(1) == 0:
        # Lowest power present, e.g. x^3 - x^2 -> x^2(x - 1).
        power = min(monom[0] for monom in poly.monoms())
        common = symbol**power
        rest = sympy.expand(standard / common)
        add(f"{format_expr(standard)} = 0", f"{format_expr(common)}({format_expr(rest)}) = 0",
            "common_factor", explained("cubic_common_factor", factor=format_expr(common)))
        roots.append(sympy.Integer(0))
    else:
        root = _rational_root(poly)
        if root is None:
            raise CubicUnsupported(
                "This cubic has no rational root, so it can't be factored the "
                "textbook way (the general cubic formula is beyond school math)."
            )
        add(f"P({format_expr(root)})", "0", "rational_root",
            explained("cubic_rational_root", symbol=symbol, root=format_expr(root)))
        # A fractional root p/q divides out as (qx - p), as textbooks write it.
        linear = root.q * symbol - root.p
        rest = sympy.quo(standard, linear, symbol)
        add(f"{format_expr(standard)} = 0", f"({format_expr(linear)})({format_expr(rest)}) = 0",
            "polynomial_division", explained("cubic_divide", factor=format_expr(linear)))
        roots.append(root)

    rest_degree = sympy.degree(rest, symbol)
    if rest_degree == 1:
        (linear_root,) = sympy.solve(sympy.Eq(rest, 0), symbol)
        add(f"{format_expr(rest)} = 0", f"{symbol} = {format_root(linear_root)}",
            "solve_linear_factor", explained("cubic_linear_factor"))
        roots.append(linear_root)
    elif rest_degree == 2:
        quad_steps, quad_roots = solve_quadratic(rest, sympy.Integer(0), symbol)
        for step in quad_steps:
            steps.append(dataclasses.replace(step, id=len(steps) + 1))
        roots.extend(quad_roots)

    roots = sorted(set(roots), key=lambda r: float(r))
    add(f"{format_expr(standard)} = 0", format_roots(symbol, roots),
        "collect_roots", explained("cubic_collect_roots"))
    return steps, roots


def _rational_root(poly: sympy.Poly):
    """A rational root ±p/q (p | constant, q | leading coefficient), smallest first."""
    _, integral = poly.clear_denoms()
    coeffs = integral.all_coeffs()
    if not all(c.is_Integer for c in coeffs):
        return None
    lead, const = int(coeffs[0]), int(coeffs[-1])
    candidates = sorted(
        {sympy.Rational(sign * p, q)
         for p in sympy.divisors(abs(const))
         for q in sympy.divisors(abs(lead))
         for sign in (1, -1)},
        key=lambda r: (abs(r), bool(r.is_negative)),
    )
    for candidate in candidates:
        if integral.eval(candidate) == 0:
            return candidate
    return None

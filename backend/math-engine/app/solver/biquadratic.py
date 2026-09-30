"""Biquadratic equations (ax^4 + bx^2 + c = 0), solved the textbook way:
substitute t = x^2, solve the quadratic in t (quadratic.py's steps), then
go back to x: x^2 = t gives x = ±√t for t > 0, x = 0 for t = 0 and no
real x for t < 0.
"""
import dataclasses

import sympy

from .formatting import format_expr, format_root, format_roots
from .messages import explained
from .quadratic import solve_quadratic
from .schemas_internal import StepData

_T = sympy.Symbol("t")


def is_biquadratic(poly: sympy.Poly, symbol: sympy.Symbol) -> bool:
    """Degree 4 with only even powers of the unknown."""
    return (poly.degree() == 4
            and poly.coeff_monomial(symbol**3) == 0
            and poly.coeff_monomial(symbol) == 0)


def solve_biquadratic(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol) -> tuple[list[StepData], list[sympy.Expr]]:
    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, message: dict) -> None:
        steps.append(StepData(id=len(steps) + 1, before=before, after=after, operation=operation,
                              value=None, target="equation", **message))

    standard = sympy.expand(lhs - rhs)
    if rhs != 0:
        add(f"{format_expr(lhs)} = {format_expr(rhs)}", f"{format_expr(standard)} = 0",
            "move_term", explained("biquadratic_standard_form"))

    poly = sympy.Poly(standard, symbol)
    a, b, c = (poly.coeff_monomial(symbol**n) for n in (4, 2, 0))
    in_t = a * _T**2 + b * _T + c
    add(f"{format_expr(standard)} = 0", f"{format_expr(in_t)} = 0",
        "substitute_t", explained("biquadratic_substitute", symbol=symbol))

    quad_steps, t_roots = solve_quadratic(in_t, sympy.Integer(0), _T)
    for step in quad_steps:
        steps.append(dataclasses.replace(step, id=len(steps) + 1))

    roots: list[sympy.Expr] = []
    for t_root in t_roots:
        square = f"{format_expr(symbol**2)} = {format_root(t_root)}"
        if t_root.is_negative:
            add(square, "∅", "negative_square", explained("biquadratic_negative_square"))
        elif t_root == 0:
            add(square, f"{symbol} = 0", "back_substitute", explained("biquadratic_back", symbol=symbol))
            roots.append(sympy.Integer(0))
        else:
            pair = [-sympy.sqrt(t_root), sympy.sqrt(t_root)]
            add(square, format_roots(symbol, pair), "back_substitute",
                explained("biquadratic_back", symbol=symbol))
            roots.extend(pair)

    roots = sorted(set(roots), key=lambda r: float(r))
    add(f"{format_expr(standard)} = 0", format_roots(symbol, roots),
        "collect_roots", explained("cubic_collect_roots"))
    return steps, roots

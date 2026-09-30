"""A linear system of two equations in two unknowns, solved both ways
Iranian textbooks teach — one after the other in the same step list:

1. elimination (روش حذفی): multiply the equations so one unknown's
   coefficients match, add/subtract to drop it, solve, substitute back;
2. substitution (روش جایگزینی): isolate one unknown in one equation, put
   it into the other, solve, substitute back.

Parallel lines (0 = c) have no solution (∅); the same line (0 = 0) has
infinitely many, reported as the relation between the unknowns.
"""
import re
from dataclasses import dataclass
from typing import Optional

import sympy

from .formatting import format_expr
from .messages import explained
from .schemas_internal import StepData


class SystemError_(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass
class LinearSystem:
    equations: list[tuple[sympy.Expr, sympy.Expr]]  # two (lhs, rhs)
    symbols: tuple[sympy.Symbol, sympy.Symbol]
    display: str


def parse_linear_system(sides: list[tuple[sympy.Expr, sympy.Expr]]) -> LinearSystem:
    symbols = sorted(set().union(*(l.free_symbols | r.free_symbols for l, r in sides)), key=str)
    if len(symbols) != 2:
        raise SystemError_("A system needs exactly two unknowns (e.g. x and y)")
    for lhs, rhs in sides:
        try:
            poly = sympy.Poly(sympy.expand(lhs - rhs), *symbols)
        except sympy.PolynomialError:
            raise SystemError_("Only linear systems (ax + by = c) are supported")
        if poly.total_degree() > 1:
            raise SystemError_("Only linear systems (ax + by = c) are supported")
    display = ", ".join(f"{format_expr(l)} = {format_expr(r)}" for l, r in sides)
    return LinearSystem(sides, (symbols[0], symbols[1]), display)


class _Line:
    """a·x + b·y = c"""

    def __init__(self, lhs: sympy.Expr, rhs: sympy.Expr, x: sympy.Symbol, y: sympy.Symbol):
        expr = sympy.expand(lhs - rhs)
        self.a, self.b = expr.coeff(x), expr.coeff(y)
        self.c = -expr.subs({x: 0, y: 0})
        self.x, self.y = x, y

    def left(self) -> sympy.Expr:
        return self.a * self.x + self.b * self.y

    def coeff(self, v: sympy.Symbol) -> sympy.Expr:
        return self.a if v == self.x else self.b

    def text(self, factor: sympy.Expr = sympy.Integer(1)) -> str:
        return f"{format_expr(sympy.expand(factor * self.left()))} = {format_expr(factor * self.c)}"


def solve_linear_system(system: LinearSystem) -> tuple[list[StepData], str, Optional[dict]]:
    """Steps (elimination, then substitution), the answer, and the solution
    {x: value, y: value} — None when there's no unique solution."""
    x, y = system.symbols
    (l1, r1), (l2, r2) = system.equations
    e1, e2 = _Line(l1, r1, x, y), _Line(l2, r2, x, y)
    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, message: dict) -> None:
        steps.append(StepData(id=len(steps) + 1, before=before, after=after, operation=operation,
                              value=None, target="equation", **message))

    original = system.display
    standard = f"{e1.text()}, {e2.text()}"
    if standard != original:
        add(original, standard, "system_standard_form", explained("system_standard_form"))

    # Dependent / inconsistent: the left sides are proportional.
    if sympy.simplify(e1.a * e2.b - e2.a * e1.b) == 0:
        return _degenerate(steps, add, e1, e2, standard)

    solution = _elimination(add, e1, e2, standard)
    _substitution(add, e1, e2, standard, solution)

    answer = f"{x} = {format_expr(solution[x])}, {y} = {format_expr(solution[y])}"
    add(standard, answer, "system_answer", explained("system_answer"))
    return steps, answer, solution


def _elimination(add, e1: _Line, e2: _Line, standard: str) -> dict:
    x, y = e1.x, e1.y
    add(standard, standard, "method_elimination", explained("method_elimination"))

    # Drop the unknown needing the smallest multipliers (y on a tie).
    def cost(v):
        p, q = abs(e1.coeff(v)), abs(e2.coeff(v))
        return (float(sympy.lcm(p, q)) if p.is_Integer and q.is_Integer else float(p * q)) if p and q else float("inf")

    drop = y if cost(y) <= cost(x) else x
    keep = x if drop == y else y
    p, q = e1.coeff(drop), e2.coeff(drop)
    g = sympy.igcd(int(abs(p)), int(abs(q))) if p.is_Integer and q.is_Integer else 1
    m1, m2 = abs(q) / g, abs(p) / g
    subtract = (p > 0) == (q > 0)

    if m1 != 1 and m2 != 1:
        add(standard, f"{e1.text(m1)}, {e2.text(m2)}", "elim_multiply",
            explained("elim_multiply", m1=format_expr(m1), m2=format_expr(m2), var=drop))
    elif m1 != 1 or m2 != 1:
        which, factor = (1, m1) if m1 != 1 else (2, m2)
        add(standard, f"{e1.text(m1)}, {e2.text(m2)}", "elim_multiply",
            explained("elim_multiply_one", which=which, m=format_expr(factor), var=drop))

    sign = -1 if subtract else 1
    combined_left = sympy.expand(m1 * e1.left() + sign * m2 * e2.left())
    combined_right = m1 * e1.c + sign * m2 * e2.c
    add(f"{e1.text(m1)}, {e2.text(m2)}", f"{format_expr(combined_left)} = {format_expr(combined_right)}",
        "elim_subtract" if subtract else "elim_add",
        explained("elim_subtract" if subtract else "elim_add", var=drop))

    value = sympy.simplify(combined_right / combined_left.coeff(keep))
    add(f"{format_expr(combined_left)} = {format_expr(combined_right)}", f"{keep} = {format_expr(value)}",
        "solve_one_variable", explained("solve_one_variable"))

    other = sympy.solve(sympy.Eq(e1.left().subs(keep, value), e1.c), drop)[0]
    substituted = f"{format_expr(e1.left().subs(keep, sympy.Symbol(f'({format_expr(value)})')))} = {format_expr(e1.c)}"
    add(substituted, f"{drop} = {format_expr(other)}", "back_substitute_value",
        explained("back_substitute_value", known=keep, value=format_expr(value), var=drop))
    return {keep: value, drop: other}


def _substitution(add, e1: _Line, e2: _Line, standard: str, solution: dict) -> None:
    x, y = e1.x, e1.y
    add(standard, standard, "method_substitution", explained("method_substitution"))

    # Isolate the unknown with coefficient ±1 if there is one (easiest), else
    # the one with the smallest coefficient.
    options = [(abs(line.coeff(v)) != 1, abs(line.coeff(v)), index, v)
               for index, line in enumerate((e1, e2), start=1) for v in (y, x) if line.coeff(v) != 0]
    _, _, which, var = min(options, key=lambda o: (o[0], o[1], o[2]))
    source, target = (e1, e2) if which == 1 else (e2, e1)
    other = x if var == y else y

    isolated = sympy.solve(sympy.Eq(source.left(), source.c), var)[0]
    add(source.text(), f"{var} = {format_expr(isolated)}", "subst_isolate",
        explained("subst_isolate", which=which, var=var, other=other))

    # Written into the equation as the student sees it: x - y = 1 -> x - (5 - 2x) = 1.
    replaced = re.sub(rf"(?<![A-Za-z]){var}(?![A-Za-z])", f"({format_expr(isolated)})", target.text())
    add(target.text(), replaced, "subst_replace", explained("subst_replace", var=var))

    simplified = sympy.expand(target.left().subs(var, isolated))
    add(replaced, f"{format_expr(simplified)} = {format_expr(target.c)}", "subst_simplify",
        explained("subst_simplify"))

    add(f"{format_expr(simplified)} = {format_expr(target.c)}", f"{other} = {format_expr(solution[other])}",
        "solve_one_variable", explained("solve_one_variable"))

    back = isolated.subs(other, sympy.Symbol(f"({format_expr(solution[other])})"))
    add(f"{var} = {format_expr(back)}", f"{var} = {format_expr(solution[var])}", "back_substitute_value",
        explained("back_substitute_value", known=other, value=format_expr(solution[other]), var=var))


def _degenerate(steps, add, e1: _Line, e2: _Line, standard: str):
    x, y = e1.x, e1.y
    # Scale equation 2 onto equation 1 and subtract: 0 = something.
    k = e1.a / e2.a if e2.a != 0 else e1.b / e2.b
    rest = sympy.simplify(e1.c - k * e2.c)
    add(standard, f"0 = {format_expr(rest)}", "elim_subtract",
        explained("elim_subtract", var=f"{x}, {y}"))
    if rest != 0:
        add(f"0 = {format_expr(rest)}", "∅", "system_no_solution", explained("system_no_solution"))
        return steps, "∅", None
    var = y if e1.b != 0 else x
    relation = sympy.solve(sympy.Eq(e1.left(), e1.c), var)[0]
    answer = f"{var} = {format_expr(relation)}"
    add("0 = 0", answer, "system_infinite", explained("system_infinite"))
    return steps, answer, None


def verify_linear_system(system: LinearSystem, solution: Optional[dict]) -> bool:
    if solution is None:
        return True  # ∅ / infinitely many are exact conclusions from the steps
    return all(sympy.simplify((lhs - rhs).subs(solution)) == 0 for lhs, rhs in system.equations)

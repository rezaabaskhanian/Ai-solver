"""Step-by-step evaluation of trig functions of a number: sin(30°),
cos(pi/3), 2sin(30°) + cos(0°).

sympy resolves sin(pi/6) to 1/2 as soon as it parses it, so the parser
hands over the expression as written (ParsedProblem.trig_raw, parsed with
evaluate=False) and the steps are rebuilt here:

  1. degrees -> radians     sin(30°)  ->  sin(π/6)       (only if ° was used)
  2. exact values           sin(π/6)  ->  1/2
  3. remaining arithmetic   2·(1/2) + 1  ->  2           (only if any is left)

normalize.py rewrites "30°" as "(30*pi/180)"; an unevaluated parse keeps
that product, which format_expr prints as "30π/180" — shown to the user
as "30°" again.
"""
import re

import sympy

from .formatting import format_expr
from .functions import to_real_logs
from .messages import explained
from .schemas_internal import StepData

_TRIG_FUNCTIONS = (sympy.sin, sympy.cos, sympy.tan, sympy.cot, sympy.sec, sympy.csc)

_DEGREES_SHOWN = re.compile(r"([0-9]+(?:\.[0-9]+)?)π/180")


def _numeric_trig_calls(expr: sympy.Expr) -> list[sympy.Expr]:
    calls = [a for a in expr.atoms(sympy.Function)
             if isinstance(a, _TRIG_FUNCTIONS) and not a.args[0].free_symbols]
    return sorted(calls, key=sympy.default_sort_key)


def has_numeric_trig(unevaluated: sympy.Expr) -> bool:
    return bool(_numeric_trig_calls(unevaluated))


def format_with_degrees(unevaluated: sympy.Expr) -> str:
    """format_expr, with an angle normalize turned into 30*pi/180 shown as 30°."""
    return _DEGREES_SHOWN.sub(r"\1°", format_expr(unevaluated))


def _is_degrees(arg: sympy.Expr) -> bool:
    return bool(_DEGREES_SHOWN.fullmatch(format_expr(arg)))


def solve_trig_values(unevaluated: sympy.Expr, evaluated: sympy.Expr) -> tuple[list[StepData], sympy.Expr]:
    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, key: str, **params: str) -> None:
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=None, target="expression", **explained(key, **params),
        ))

    current = unevaluated
    shown = format_with_degrees(current)

    # 1. Degrees -> radians: sin(30*pi/180) -> sin(pi/6).
    degree_calls = [c for c in _numeric_trig_calls(current) if _is_degrees(c.args[0])]
    if degree_calls:
        conversions, replacements = [], {}
        for call in degree_calls:
            # nsimplify: 22.5° parses as a float, and 0.125π should read π/8.
            radians = sympy.nsimplify(sympy.simplify(call.args[0]), rational=True)
            conversions.append(f"{format_with_degrees(call.args[0])} = {format_expr(radians)}")
            with sympy.evaluate(False):
                replacements[call] = call.func(radians)
        with sympy.evaluate(False):
            current = current.xreplace(replacements)
        after = format_expr(current)
        add(shown, after, "degrees_to_radians", "trig_degrees_to_radians",
            conversions=", ".join(dict.fromkeys(conversions)))
        shown = after

    # 2. Exact values: sin(pi/6) -> 1/2. A value sympy can't give exactly
    # (sin(1)) stays as it is.
    values, replacements = [], {}
    for call in _numeric_trig_calls(current):
        value = call.func(sympy.simplify(call.args[0]))
        if not value.has(*_TRIG_FUNCTIONS):
            values.append(f"{format_expr(call)} = {format_expr(value)}")
            replacements[call] = value
    if replacements:
        with sympy.evaluate(False):
            current = current.xreplace(replacements)
        after = format_expr(current)
        add(shown, after, "exact_values", "trig_exact_values", values=", ".join(dict.fromkeys(values)))
        shown = after

    # 3. Whatever arithmetic is left: 2·(1/2) + 1 -> 2. Computed from the
    # evaluated expression, exactly as expression.py would.
    result = sympy.nsimplify(sympy.simplify(to_real_logs(evaluated)), rational=True)
    final = format_expr(result)
    if final != shown:
        add(shown, final, "simplify", "trig_evaluate")

    return steps, result

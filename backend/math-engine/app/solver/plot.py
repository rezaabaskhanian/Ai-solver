"""رسم نمودار تابع — y = f(x) the way حسابان sketches it: where the curve
meets the axes, where the slope is zero (max/min), the asymptotes, then
the curve through those points.

  plot(x^2 - 4)            plot(1/x, x, -5, 5)
  y = x^3 - 3x             f(x) = sin(x)

sympy finds the exact points where it can (a FiniteSet from solveset);
otherwise they're found numerically on the sampled curve. The app draws
`payload["points"]` — None marks a break (an asymptote, a jump, or where
f isn't defined) so the line isn't joined across it.
"""
import math
from dataclasses import dataclass
from typing import Callable, Optional

import sympy

from .formatting import format_expr
from .messages import explained
from .schemas_internal import StepData

_SAMPLES = 240
_MAX_HALF_WIDTH = 50
_MAX_EXACT_POINTS = 12


class PlotError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass
class PlotProblem:
    expr: sympy.Expr
    symbol: sympy.Symbol
    x_range: Optional[tuple[sympy.Expr, sympy.Expr]] = None

    @property
    def display(self) -> str:
        text = f"y = {format_expr(self.expr)}"
        if self.x_range:
            low, high = self.x_range
            text += f" , {format_expr(low)} ≤ {self.symbol} ≤ {format_expr(high)}"
        return text


@dataclass
class _Point:
    kind: str  # "root" | "y_intercept" | "max" | "min"
    x: float
    y: float
    x_label: str
    y_label: str

    @property
    def label(self) -> str:
        return f"({self.x_label}, {self.y_label})"


def solve_plot(problem: PlotProblem) -> tuple[list[StepData], str, dict]:
    expr, x = problem.expr, problem.symbol
    f = _numeric(expr, x)
    derivative = sympy.diff(expr, x)
    fp = _numeric(derivative, x)

    exact_roots = _exact_real_solutions(expr, x)
    exact_critical = _exact_real_solutions(derivative, x) if expr.has(x) else []
    vertical = _vertical_asymptotes(expr, x)

    if problem.x_range:
        x_min, x_max = (float(v) for v in problem.x_range)
        if not x_min < x_max:
            raise PlotError("The start of the range must be less than its end.")
    else:
        x_min, x_max = _window(expr, [*(exact_roots or []), *(exact_critical or []), *vertical])

    xs = [x_min + (x_max - x_min) * i / _SAMPLES for i in range(_SAMPLES + 1)]
    ys = [f(v) for v in xs]
    if sum(y is not None for y in ys) < 2:
        raise PlotError(f"'{format_expr(expr)}' isn't defined on this range, so there's nothing to draw.")

    steps: list[StepData] = []
    points: list[_Point] = []

    def add(before: str, after: str, operation: str, key: str, **params) -> None:
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=None, target="expression", **explained(key, **params),
        ))

    # 1. The y-axis.
    if x_min <= 0 <= x_max:
        y0 = _exact_value(expr, x, 0)
        if y0 is not None:
            add(f"{x} = 0", f"y = {format_expr(y0)}", "y_intercept", "plot_y_intercept", symbol=x)
            points.append(_Point("y_intercept", 0.0, float(y0), "0", format_expr(y0)))
        else:
            add(f"{x} = 0", "∄", "y_intercept", "plot_no_y_intercept", symbol=x)

    # 2. The x-axis (a constant function is a horizontal line: no roots to find).
    if expr.has(x):
        if exact_roots is not None:
            roots = [(float(r), format_expr(r)) for r in exact_roots if x_min <= float(r) <= x_max]
        else:
            roots = [(r, _approx(r)) for r in _numeric_zeros(f, xs, ys)]
        if roots:
            add(f"{format_expr(expr)} = 0", ", ".join(f"{x} = {label}" for _, label in roots),
                "roots", "plot_roots")
            points += [_Point("root", r, 0.0, label, "0") for r, label in roots]
        else:
            add(f"{format_expr(expr)} = 0", "∅", "roots", "plot_no_roots")

    # 3. Where the slope is zero: local max / min.
    if expr.has(x):
        if exact_critical is not None:
            critical = [(float(c), c) for c in exact_critical if x_min <= float(c) <= x_max]
        else:
            dys = [fp(v) for v in xs]
            critical = [(c, None) for c in _numeric_zeros(fp, xs, dys)]
        extrema = []
        for c, exact in critical:
            kind = _extremum_kind(fp, c, (x_max - x_min) * 1e-4)
            if kind is None:
                continue
            value = _exact_value(expr, x, exact) if exact is not None else None
            y = float(value) if value is not None else f(c)
            if y is None:
                continue
            c_label = format_expr(exact) if exact is not None else _approx(c)
            y_label = format_expr(value) if value is not None else _approx(y)
            extrema.append(_Point(kind, c, y, c_label, y_label))
        if extrema:
            add(f"y' = {format_expr(derivative)}",
                ", ".join(f"{x} = {p.x_label}" for p in extrema),
                "critical_points", "plot_critical")
            for p in extrema:
                add(f"{x} = {p.x_label}", p.label, p.kind,
                    "plot_max" if p.kind == "max" else "plot_min")
            points += extrema
        else:
            add(f"y' = {format_expr(derivative)}", "∅", "critical_points", "plot_no_critical")

    # 4. Asymptotes.
    shown_vertical = [v for v in vertical if x_min < float(v) < x_max]
    for v in shown_vertical:
        add(f"{x} → {format_expr(v)}", f"{x} = {format_expr(v)}", "vertical_asymptote",
            "plot_vertical_asymptote", symbol=x, value=format_expr(v))
    horizontal = _horizontal_asymptotes(expr, x)
    for h in horizontal:
        add(f"{x} → ±∞", f"y = {format_expr(h)}", "horizontal_asymptote",
            "plot_horizontal_asymptote", symbol=x, value=format_expr(h))

    # 5. The curve.
    y_min, y_max = _y_window(ys, points, bool(shown_vertical))
    curve = _curve(xs, ys, y_min, y_max, [float(v) for v in shown_vertical])
    answer = f"y = {format_expr(expr)}"
    add(answer, answer, "draw", "plot_draw")

    payload = {
        "x_min": _round(x_min), "x_max": _round(x_max),
        "y_min": _round(y_min), "y_max": _round(y_max),
        "points": curve,
        "features": [{"kind": p.kind, "x": _round(p.x), "y": _round(p.y), "label": p.label}
                     for p in points],
        "vertical_asymptotes": [_round(float(v)) for v in shown_vertical],
        "horizontal_asymptotes": [_round(float(h)) for h in horizontal],
    }
    return steps, answer, payload


def verify_plot(problem: PlotProblem, payload: dict) -> bool:
    """Every marked point is re-checked numerically: roots have f = 0,
    max/min have f' = 0 and every labelled y is f(x)."""
    f = _numeric(problem.expr, problem.symbol)
    fp = _numeric(sympy.diff(problem.expr, problem.symbol), problem.symbol)
    for p in payload["features"]:
        y = f(p["x"])
        if y is None or abs(y - p["y"]) > 1e-3 * (1 + abs(y)):
            return False
        if p["kind"] in ("max", "min"):
            slope = fp(p["x"])
            if slope is None or abs(slope) > 1e-3 * (1 + abs(y)):
                return False
    return True


# ---------- helpers ----------

def _numeric(expr: sympy.Expr, x: sympy.Symbol) -> Callable[[float], Optional[float]]:
    compiled = sympy.lambdify(x, expr, modules=["math"])

    def f(v: float) -> Optional[float]:
        try:
            y = float(compiled(v))
        except (ArithmeticError, ValueError, TypeError):
            return None
        return y if math.isfinite(y) else None

    return f


def _exact_real_solutions(expr: sympy.Expr, x: sympy.Symbol) -> Optional[list[sympy.Expr]]:
    """Exact real solutions of expr = 0, or None when sympy can't list
    them (infinitely many, like sin(x) = 0, or no closed form)."""
    try:
        solutions = sympy.solveset(expr, x, sympy.S.Reals)
    except Exception:
        return None
    if not isinstance(solutions, sympy.FiniteSet) or len(solutions) > _MAX_EXACT_POINTS:
        return None
    values = [s for s in solutions if s.is_real]
    return sorted(values, key=float)


def _exact_value(expr: sympy.Expr, x: sympy.Symbol, at) -> Optional[sympy.Expr]:
    try:
        value = sympy.simplify(expr.subs(x, at))
    except Exception:
        return None
    return value if value.is_real and value.is_finite else None


def _vertical_asymptotes(expr: sympy.Expr, x: sympy.Symbol) -> list[sympy.Expr]:
    denominator = sympy.together(expr).as_numer_denom()[1]
    if not denominator.has(x):
        return []
    found = []
    for v in _exact_real_solutions(denominator, x) or []:
        try:
            sides = [sympy.limit(expr, x, v, d) for d in ("+", "-")]
        except Exception:
            continue
        if any(s.is_infinite for s in sides):
            found.append(v)
    return found


def _horizontal_asymptotes(expr: sympy.Expr, x: sympy.Symbol) -> list[sympy.Expr]:
    if not expr.has(x):
        return []
    found = []
    for end in (sympy.oo, -sympy.oo):
        try:
            value = sympy.limit(expr, x, end)
        except Exception:
            continue
        # sin(x) at ∞ oscillates: sympy answers with AccumBounds, not a number.
        if isinstance(value, sympy.AccumBounds):
            continue
        if value.is_real and value.is_finite and value not in found:
            found.append(value)
    return found


def _window(expr: sympy.Expr, key_points: list[sympy.Expr]) -> tuple[float, float]:
    """Symmetric x-range showing every exact key point with room around
    it; trig functions default to one period either side."""
    if expr.has(sympy.sin, sympy.cos, sympy.tan) and not key_points:
        return -2 * math.pi, 2 * math.pi
    half = 5.0
    for p in key_points:
        half = max(half, 1.5 * abs(float(p)) + 1)
    half = min(math.ceil(half), _MAX_HALF_WIDTH)
    return -half, half


def _numeric_zeros(f, xs: list[float], ys: list[Optional[float]]) -> list[float]:
    """Sign changes between samples, refined by bisection. A sign change
    across a pole (1/x at 0) isn't a zero: |f| there stays large."""
    found: list[float] = []
    for (a, fa), (b, fb) in zip(zip(xs, ys), zip(xs[1:], ys[1:])):
        if fa is None or fb is None:
            continue
        if fa == 0:
            candidate = a
        elif fa * fb < 0:
            lo, hi, flo = a, b, fa
            for _ in range(60):
                mid = (lo + hi) / 2
                fm = f(mid)
                if fm is None:
                    break
                if flo * fm <= 0:
                    hi = mid
                else:
                    lo, flo = mid, fm
            candidate = (lo + hi) / 2
            value = f(candidate)
            if value is None or abs(value) > 1e-6 * (1 + abs(fa) + abs(fb)):
                continue
        else:
            continue
        if not found or abs(candidate - found[-1]) > 1e-6:
            found.append(candidate)
    return found


def _extremum_kind(fp, c: float, delta: float) -> Optional[str]:
    left, right = fp(c - delta), fp(c + delta)
    if left is None or right is None:
        return None
    if left > 0 > right:
        return "max"
    if left < 0 < right:
        return "min"
    return None


def _y_window(ys: list[Optional[float]], points: list[_Point],
              has_pole: bool) -> tuple[float, float]:
    finite = sorted(y for y in ys if y is not None)
    if has_pole:
        # Near a pole the curve shoots off; frame the body of the curve.
        low, high = finite[len(finite) // 10], finite[-(len(finite) // 10) - 1]
    else:
        low, high = finite[0], finite[-1]
    for p in points:
        low, high = min(low, p.y), max(high, p.y)
    low, high = min(low, 0.0), max(high, 0.0)  # keep the x-axis in view
    if high - low < 1e-9:
        low, high = low - 1, high + 1
    pad = (high - low) * 0.1
    return low - pad, high + pad


def _curve(xs: list[float], ys: list[Optional[float]], y_min: float, y_max: float,
           poles: list[float]) -> list[list[Optional[float]]]:
    """[x, y] pairs; y is None where the line must break."""
    span = y_max - y_min
    out: list[list[Optional[float]]] = []
    previous: Optional[tuple[float, float]] = None
    for v, y in zip(xs, ys):
        if y is not None and not (y_min - span <= y <= y_max + span):
            y = None
        if y is not None and previous is not None:
            px, py = previous
            crosses_pole = any(px < p < v for p in poles)
            if crosses_pole or abs(y - py) > span:
                out.append([_round((px + v) / 2), None])
        out.append([_round(v), None if y is None else _round(y)])
        previous = (v, y) if y is not None else None
    return out


def _approx(v: float) -> str:
    return f"≈{round(v, 3):g}"


def _round(v: float) -> float:
    return round(v, 4)

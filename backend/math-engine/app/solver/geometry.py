"""Geometry calculator (ریاضی هفتم تا نهم: مساحت و محیط، حجم، فیثاغورس،
چندضلعی‌ها، دایره، حجم و مساحت کره و مخروط و هرم).

The app's geometry screen sends one line per question:

  area(circle, r=3)             perimeter(rectangle, a=5, b=3)
  volume(cone, r=3, h=4)        surface(cube, a=2)
  pythagoras(a=3, b=4)          (any two of a, b and the hypotenuse c)
  angle_sum(polygon, n=6)       interior_angle / exterior_angle too

Steps: the textbook formula, the values substituted, the exact result
(π kept exact), then a decimal approximation when it isn't a whole
number. Every value is re-checked a second, independent way in
`verify_geometry`: 2D shapes with sympy.geometry, solids by integrating
their cross-sections, Pythagoras by substitution.
"""
import re
from dataclasses import dataclass
from typing import Callable, Optional

import sympy
from sympy.geometry import Circle, Point, Polygon, RegularPolygon

from .formatting import format_expr
from .messages import explained
from .schemas_internal import StepData

_CALL = re.compile(r"^([a-z_]+)\((.*)\)$")
_ASSIGNMENT = re.compile(r"^([a-z][a-z0-9]*)=(\d+(?:\.\d+)?(?:/\d+)?)$")
_QUANTITIES = ("area", "perimeter", "volume", "surface",
               "pythagoras", "angle_sum", "interior_angle", "exterior_angle")

pi = sympy.pi
z = sympy.Symbol("z")  # integration variable for the volume checks


class GeometryError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass(frozen=True)
class Formula:
    params: tuple[str, ...]
    symbol: str      # what the result is called: S (area), P, V ...
    template: str    # the textbook formula, written with the param names
    compute: Callable[..., sympy.Expr]
    check: Callable[..., sympy.Expr]  # independent recomputation


def _poly_area(*points) -> sympy.Expr:
    return abs(Polygon(*[Point(*p) for p in points]).area)


def _poly_perimeter(*points) -> sympy.Expr:
    return Polygon(*[Point(*p) for p in points]).perimeter


def _solid(cross_section: sympy.Expr, low, high) -> sympy.Expr:
    """Volume = ∫ (cross-section area) dz — Cavalieri's principle."""
    return sympy.integrate(cross_section, (z, low, high))


FORMULAS: dict[tuple[str, str], Formula] = {
    ("area", "square"): Formula(
        ("a",), "S", "a × a", lambda a: a * a,
        lambda a: _poly_area((0, 0), (a, 0), (a, a), (0, a))),
    ("perimeter", "square"): Formula(
        ("a",), "P", "4 × a", lambda a: 4 * a,
        lambda a: _poly_perimeter((0, 0), (a, 0), (a, a), (0, a))),
    ("area", "rectangle"): Formula(
        ("a", "b"), "S", "a × b", lambda a, b: a * b,
        lambda a, b: _poly_area((0, 0), (a, 0), (a, b), (0, b))),
    ("perimeter", "rectangle"): Formula(
        ("a", "b"), "P", "2 × (a + b)", lambda a, b: 2 * (a + b),
        lambda a, b: _poly_perimeter((0, 0), (a, 0), (a, b), (0, b))),
    ("area", "triangle"): Formula(
        ("b", "h"), "S", "(b × h) / 2", lambda b, h: b * h / 2,
        lambda b, h: _poly_area((0, 0), (b, 0), (1, h))),
    ("perimeter", "triangle"): Formula(
        ("a", "b", "c"), "P", "a + b + c", lambda a, b, c: a + b + c,
        lambda a, b, c: _triangle_by_sides(a, b, c).perimeter),
    ("area", "parallelogram"): Formula(
        ("b", "h"), "S", "b × h", lambda b, h: b * h,
        lambda b, h: _poly_area((0, 0), (b, 0), (b + 1, h), (1, h))),
    ("area", "trapezoid"): Formula(
        ("a", "b", "h"), "S", "((a + b) × h) / 2", lambda a, b, h: (a + b) * h / 2,
        lambda a, b, h: _poly_area((0, 0), (a, 0), (b + 1, h), (1, h))),
    ("area", "rhombus"): Formula(
        ("d1", "d2"), "S", "(d1 × d2) / 2", lambda d1, d2: d1 * d2 / 2,
        lambda d1, d2: _poly_area((d1 / 2, 0), (0, d2 / 2), (-d1 / 2, 0), (0, -d2 / 2))),
    ("perimeter", "rhombus"): Formula(
        ("a",), "P", "4 × a", lambda a: 4 * a,
        lambda a: _poly_perimeter((0, 0), (a, 0), (a + a / 2, a * sympy.sqrt(3) / 2),
                                  (a / 2, a * sympy.sqrt(3) / 2))),
    ("area", "circle"): Formula(
        ("r",), "S", "π × r^2", lambda r: pi * r**2,
        lambda r: Circle(Point(0, 0), r).area),
    ("perimeter", "circle"): Formula(
        ("r",), "P", "2 × π × r", lambda r: 2 * pi * r,
        lambda r: Circle(Point(0, 0), r).circumference),
    ("volume", "cube"): Formula(
        ("a",), "V", "a^3", lambda a: a**3,
        lambda a: _solid(a * a, 0, a)),
    ("surface", "cube"): Formula(
        ("a",), "S", "6 × a^2", lambda a: 6 * a**2,
        lambda a: 6 * _poly_area((0, 0), (a, 0), (a, a), (0, a))),
    ("volume", "cuboid"): Formula(
        ("a", "b", "c"), "V", "a × b × c", lambda a, b, c: a * b * c,
        lambda a, b, c: _solid(a * b, 0, c)),
    ("surface", "cuboid"): Formula(
        ("a", "b", "c"), "S", "2 × (a × b + b × c + a × c)",
        lambda a, b, c: 2 * (a * b + b * c + a * c),
        lambda a, b, c: 2 * (_poly_area((0, 0), (a, 0), (a, b), (0, b))
                             + _poly_area((0, 0), (b, 0), (b, c), (0, c))
                             + _poly_area((0, 0), (a, 0), (a, c), (0, c)))),
    ("volume", "cylinder"): Formula(
        ("r", "h"), "V", "π × r^2 × h", lambda r, h: pi * r**2 * h,
        lambda r, h: _solid(Circle(Point(0, 0), r).area, 0, h)),
    ("surface", "cylinder"): Formula(
        ("r", "h"), "S", "2 × π × r^2 + 2 × π × r × h",
        lambda r, h: 2 * pi * r**2 + 2 * pi * r * h,
        lambda r, h: 2 * Circle(Point(0, 0), r).area + Circle(Point(0, 0), r).circumference * h),
    ("volume", "cone"): Formula(
        ("r", "h"), "V", "(π × r^2 × h) / 3", lambda r, h: pi * r**2 * h / 3,
        lambda r, h: _solid(pi * (r * z / h) ** 2, 0, h)),
    ("volume", "sphere"): Formula(
        ("r",), "V", "(4 × π × r^3) / 3", lambda r: 4 * pi * r**3 / 3,
        lambda r: _solid(pi * (r**2 - z**2), -r, r)),
    ("surface", "sphere"): Formula(
        ("r",), "S", "4 × π × r^2", lambda r: 4 * pi * r**2,
        # The surface is the rate the volume grows with the radius.
        lambda r: sympy.diff(4 * pi * z**3 / 3, z).subs(z, r)),
    ("volume", "pyramid"): Formula(
        ("a", "h"), "V", "(a^2 × h) / 3", lambda a, h: a**2 * h / 3,
        lambda a, h: _solid((a * z / h) ** 2, 0, h)),
    ("angle_sum", "polygon"): Formula(
        ("n",), "∑", "(n - 2) × 180", lambda n: (n - 2) * 180,
        lambda n: n * _degrees(RegularPolygon(Point(0, 0), 1, int(n)).interior_angle)),
    ("interior_angle", "polygon"): Formula(
        ("n",), "α", "((n - 2) × 180) / n", lambda n: (n - 2) * 180 / n,
        lambda n: _degrees(RegularPolygon(Point(0, 0), 1, int(n)).interior_angle)),
    ("exterior_angle", "polygon"): Formula(
        ("n",), "β", "360 / n", lambda n: sympy.Integer(360) / n,
        lambda n: _degrees(RegularPolygon(Point(0, 0), 1, int(n)).exterior_angle)),
}


def _degrees(radians: sympy.Expr) -> sympy.Expr:
    return sympy.simplify(radians * 180 / pi)


def _triangle_by_sides(a, b, c):
    """A triangle with these side lengths, placed on the x-axis."""
    a, b, c = (sympy.nsimplify(v) for v in (a, b, c))  # exact, never float division
    x = (a**2 + c**2 - b**2) / (2 * a)
    return Polygon(Point(0, 0), Point(a, 0), Point(x, sympy.sqrt(c**2 - x**2)))


@dataclass
class GeometryProblem:
    quantity: str
    shape: Optional[str]     # None for pythagoras
    values: dict[str, sympy.Rational]

    @property
    def display(self) -> str:
        values = ", ".join(f"{k} = {format_expr(v)}" for k, v in self.values.items())
        head = f"{self.shape}, " if self.shape else ""
        return f"{self.quantity}({head}{values})"


def looks_like_geometry(compact: str) -> bool:
    m = _CALL.match(compact)
    return bool(m and m.group(1) in _QUANTITIES)


def parse_geometry_problem(compact: str) -> GeometryProblem:
    m = _CALL.match(compact)
    if not m:
        raise GeometryError("Write it like area(circle, r=3)")
    quantity, parts = m.group(1), [p for p in m.group(2).split(",") if p]
    shape = None
    if quantity != "pythagoras":
        if not parts or "=" in parts[0]:
            raise GeometryError(f"Name the shape first, e.g. {quantity}(circle, r=3)")
        shape, parts = parts[0], parts[1:]
    values: dict[str, sympy.Rational] = {}
    for part in parts:
        a = _ASSIGNMENT.match(part)
        if not a:
            raise GeometryError(f"'{part}' should be a measurement like r=3")
        value = sympy.Rational(a.group(2))
        if value <= 0:
            raise GeometryError("Lengths must be positive")
        values[a.group(1)] = value

    if quantity == "pythagoras":
        if len(values) != 2 or not set(values) <= {"a", "b", "c"}:
            raise GeometryError("Give exactly two of a, b (the legs) and c (the hypotenuse)")
        return GeometryProblem(quantity, None, values)

    formula = FORMULAS.get((quantity, shape))
    if formula is None:
        raise GeometryError(f"{quantity} of a {shape} isn't supported yet")
    missing = [p for p in formula.params if p not in values]
    extra = [p for p in values if p not in formula.params]
    if missing or extra:
        raise GeometryError(f"{quantity}({shape}) needs exactly: {', '.join(formula.params)}")
    if shape == "polygon":
        n = values["n"]
        if not n.is_integer or n < 3:
            raise GeometryError("A polygon has a whole number of sides, at least 3")
    if (quantity, shape) == ("perimeter", "triangle"):
        a, b, c = (values[k] for k in "abc")
        if not (a + b > c and a + c > b and b + c > a):
            raise GeometryError("These three lengths can't make a triangle (triangle inequality)")
    return GeometryProblem(quantity, shape, values)


# ---------- solving ----------

def _fill(template: str, values: dict[str, sympy.Expr]) -> str:
    def value(m: "re.Match[str]") -> str:
        s = format_expr(values[m.group(0)])
        return f"({s})" if "/" in s else s
    names = sorted(values, key=len, reverse=True)
    return re.sub("|".join(rf"\b{re.escape(n)}\b" for n in names), value, template)


def _approx(value: sympy.Expr) -> str:
    return f"{float(value):.2f}".rstrip("0").rstrip(".")


def solve_geometry(problem: GeometryProblem) -> tuple[list[StepData], str, sympy.Expr]:
    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, key: str, **params) -> None:
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=None, target="expression", **explained(key, **params),
        ))

    if problem.quantity == "pythagoras":
        result, name = _pythagoras(problem.values, add)
    else:
        formula = FORMULAS[(problem.quantity, problem.shape)]
        name = formula.symbol
        filled = _fill(formula.template, problem.values)
        add(f"{name} = {formula.template}", f"{name} = {filled}", "formula", "geo_formula",
            quantity=problem.quantity, shape=problem.shape)
        result = sympy.nsimplify(formula.compute(**problem.values))
        add(filled, format_expr(result), "compute", "geo_compute")

    unit = "°" if problem.quantity in ("angle_sum", "interior_angle", "exterior_angle") else ""
    if result.is_Integer:
        return steps, f"{format_expr(result)}{unit}", result
    approx = _approx(result)
    add(format_expr(result), f"≈ {approx}{unit}", "approximate",
        "geo_approximate_pi" if result.has(pi) else "geo_approximate")
    return steps, f"{format_expr(result)} ≈ {approx}{unit}", result


def _pythagoras(values: dict, add) -> tuple[sympy.Expr, str]:
    if "c" in values:
        c = values["c"]
        name = "a" if "a" in values else "b"
        leg, missing = values[name], "b" if name == "a" else "a"
        if leg >= c:
            raise GeometryError("The hypotenuse c must be longer than each leg")
        work = f"{format_expr(c)}^2 - {format_expr(leg)}^2"
        add(f"{missing}^2 = c^2 - {name}^2", f"{missing}^2 = {work}", "formula", "pyth_leg")
        square = c**2 - leg**2
    else:
        a, b = values["a"], values["b"]
        missing = "c"
        work = f"{format_expr(a)}^2 + {format_expr(b)}^2"
        add("c^2 = a^2 + b^2", f"c^2 = {work}", "formula", "pyth_formula")
        square = a**2 + b**2
    add(work, format_expr(square), "compute", "geo_compute")
    result = sympy.sqrt(square)
    after = f"{missing} = √{format_expr(square)}"
    if result.is_Rational:
        after += f" = {format_expr(result)}"
    add(f"{missing}^2 = {format_expr(square)}", after, "square_root", "pyth_root")
    return result, missing


def verify_geometry(problem: GeometryProblem, result: sympy.Expr) -> bool:
    try:
        if problem.quantity == "pythagoras":
            full = dict(problem.values)
            full[({"a", "b", "c"} - set(full)).pop()] = result
            return sympy.simplify(full["a"] ** 2 + full["b"] ** 2 - full["c"] ** 2) == 0
        formula = FORMULAS[(problem.quantity, problem.shape)]
        return sympy.simplify(formula.check(**problem.values) - result) == 0
    except Exception:
        return False

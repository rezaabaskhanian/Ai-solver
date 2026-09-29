from typing import Optional

import sympy

from .formatting import format_expr
from .messages import explained
from .schemas_internal import StepData

# The answer when the two one-sided limits differ.
DOES_NOT_EXIST = "∄"


class LimitUnsupported(Exception):
    """sympy couldn't settle the limit to a number or ±∞ (e.g.
    sin(1/x) at 0 oscillates) — caught in main.py and surfaced as a clean
    422, same pattern as IntegrationUnsupported."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def format_limit_value(value: Optional[sympy.Expr]) -> str:
    return DOES_NOT_EXIST if value is None else format_expr(value)


def one_sided_limits(expr: sympy.Expr, symbol: sympy.Symbol, point: sympy.Expr,
                     direction: str) -> dict[str, sympy.Expr]:
    """The limit from each side that `direction` asks about: {"+": ...,
    "-": ...} for a two-sided limit at a finite point, one side otherwise
    (at ±∞ there's only one way to approach). Raises LimitUnsupported
    unless every value is a real number or ±∞."""
    if point.is_infinite:
        sides = {"+": point}
    elif direction == "+-":
        sides = {"+": "+", "-": "-"}
    else:
        sides = {direction: direction}

    values = {}
    for side, sympy_dir in sides.items():
        try:
            value = (sympy.limit(expr, symbol, point) if point.is_infinite
                     else sympy.limit(expr, symbol, point, sympy_dir))
        except Exception as exc:
            raise LimitUnsupported(f"Could not compute the limit of '{format_expr(expr)}'.") from exc
        if isinstance(value, sympy.AccumBounds) or not (
            value in (sympy.oo, -sympy.oo) or (value.is_real and value.is_finite)
        ):
            raise LimitUnsupported(f"The limit of '{format_expr(expr)}' is not a number or ±∞.")
        values[side] = value
    return values


def solve_limit(expr: sympy.Expr, symbol: sympy.Symbol, point: sympy.Expr,
                direction: str) -> tuple[list[StepData], Optional[sympy.Expr], dict[str, sympy.Expr]]:
    """Textbook-style limit steps (حسابان ۱ و ۲): substitute; on 0/0
    factor and cancel; on nonzero/0 look at each side; at ±∞ keep the
    highest-power terms. Anything else gets one generic "apply limit
    rules" step. sympy.limit is always the source of truth for the
    value (the steps only narrate), and verify.verify_limit checks it
    numerically.

    Returns (steps, value or None when the limit doesn't exist, the
    one-sided values the answer rests on).
    """
    sides = one_sided_limits(expr, symbol, point, direction)
    values = set(sides.values())
    value = values.pop() if len(values) == 1 else None

    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, key: str, **params) -> None:
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after,
            operation=operation, value=None, target="expression",
            **explained(key, **params),
        ))

    x, a = format_expr(symbol), format_expr(point)

    def finish_generic(current: sympy.Expr) -> None:
        if value is None:
            finish_by_sides()
        else:
            add(format_expr(current), format_limit_value(value), "apply_limit_rules",
                "limit_apply_rules")

    def finish_by_sides() -> None:
        for side, side_value in sides.items():
            add(f"{x}→{a}{'⁺' if side == '+' else '⁻'}", format_expr(side_value),
                "one_sided_limit", "limit_one_sided_" + ("right" if side == "+" else "left"),
                symbol=x, point=a)
        if value is None:
            add(" ≠ ".join(format_expr(v) for v in sides.values()), DOES_NOT_EXIST,
                "limit_does_not_exist", "limit_does_not_exist")

    num, den = sympy.fraction(sympy.together(expr))
    is_rational = num.is_polynomial(symbol) and den.is_polynomial(symbol)

    if point.is_infinite:
        if is_rational and den.has(symbol):
            lead_num, lead_den = _leading_term(num, symbol), _leading_term(den, symbol)
            leading = _format_fraction(lead_num, lead_den)
            add(format_expr(expr), leading, "keep_leading_terms", "limit_leading_terms")
            add(leading, format_limit_value(value), "evaluate_limit",
                "limit_evaluate", symbol=x, point=a)
        else:
            finish_generic(expr)
        return steps, value, sides

    num_at, den_at = _at(num, symbol, point), _at(den, symbol, point)

    if den_at is not None and den_at != 0 and num_at is not None:
        direct = sympy.simplify(num_at / den_at)
        if value is not None and sympy.simplify(direct - value) == 0:
            add(format_expr(expr), format_expr(direct), "substitute",
                "limit_substitute", symbol=x, point=a)
            return steps, value, sides

    if num_at == 0 and den_at == 0:
        add(format_expr(expr), "0/0", "indeterminate_form",
            "limit_zero_over_zero", symbol=x, point=a)
        if is_rational:
            shown = _format_fraction(sympy.factor(num), sympy.factor(den))
            add(format_expr(expr), shown, "factor", "limit_factor")
            reduced = sympy.cancel(sympy.together(expr))
        else:
            conjugate = _conjugate_rewrite(num, den, symbol)
            if conjugate is None:
                finish_generic(expr)
                return steps, value, sides
            new_num, new_den = conjugate
            shown = _format_fraction(new_num, new_den)
            add(format_expr(expr), shown, "multiply_conjugate", "limit_conjugate")
            # Dividing the factored sides cancels the common factor, e.g.
            # (x - 4)/((sqrt(x) + 2)(x - 4)) -> 1/(sqrt(x) + 2).
            reduced = sympy.factor(new_num) / sympy.factor(new_den)
        add(shown, format_expr(reduced), "cancel", "limit_cancel", symbol=x, point=a)
        expr = reduced
        num, den = sympy.fraction(reduced)
        num_at, den_at = _at(num, symbol, point), _at(den, symbol, point)
        if den_at is not None and den_at != 0 and num_at is not None and value is not None:
            add(format_expr(expr), format_limit_value(value), "substitute",
                "limit_substitute", symbol=x, point=a)
            return steps, value, sides

    if den_at == 0 and num_at not in (None, 0):
        add(format_expr(expr), f"{format_expr(num_at)}/0", "nonzero_over_zero",
            "limit_nonzero_over_zero", symbol=x, point=a)
        finish_by_sides()
        return steps, value, sides

    finish_generic(expr)
    return steps, value, sides


def _conjugate_rewrite(num: sympy.Expr, den: sympy.Expr,
                       symbol: sympy.Symbol) -> Optional[tuple[sympy.Expr, sympy.Expr]]:
    """For a 0/0 with a square root, the textbook trick: multiply the
    radical side (a two-term sum like sqrt(x) - 2) and the other side by
    its conjugate (sqrt(x) + 2). Returns the new (numerator,
    denominator), radical side multiplied out, or None when neither side
    has that shape."""
    for side in ("num", "den"):
        target = num if side == "num" else den
        terms = sympy.Add.make_args(target)
        radical = [t for t in terms if _has_sqrt(t, symbol)]
        if len(terms) != 2 or len(radical) != 1:
            continue
        other = next(t for t in terms if t is not radical[0])
        conjugate = radical[0] - other
        if side == "num":
            return sympy.expand(num * conjugate), sympy.Mul(den, conjugate, evaluate=False)
        return sympy.Mul(num, conjugate, evaluate=False), sympy.expand(den * conjugate)
    return None


def _has_sqrt(term: sympy.Expr, symbol: sympy.Symbol) -> bool:
    return any(p.exp == sympy.Rational(1, 2) and p.base.has(symbol)
               for p in term.atoms(sympy.Pow))


def _leading_term(poly_expr: sympy.Expr, symbol: sympy.Symbol) -> sympy.Expr:
    if not poly_expr.has(symbol):
        return poly_expr
    poly = sympy.Poly(poly_expr, symbol)
    return poly.LC() * symbol ** poly.degree()


def _at(expr: sympy.Expr, symbol: sympy.Symbol, point: sympy.Expr) -> Optional[sympy.Expr]:
    """expr at x = point, or None when it isn't a finite real number
    there (e.g. ln(0), sqrt of a negative)."""
    try:
        value = sympy.simplify(expr.subs(symbol, point))
    except Exception:
        return None
    return value if value.is_real and value.is_finite else None


def _format_fraction(num: sympy.Expr, den: sympy.Expr) -> str:
    # Built by hand: sympy would cancel the common factor the moment the
    # fraction is formed, and showing that factor is the point of the step.
    def wrap(e: sympy.Expr, allow_product: bool) -> str:
        s = format_expr(e)
        bare = e.is_Atom or e.is_Pow or (allow_product and e.is_Mul and not e.could_extract_minus_sign())
        return s if bare else f"({s})"
    return f"{wrap(num, True)}/{wrap(den, False)}"

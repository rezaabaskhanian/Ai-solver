from functools import reduce
from typing import Optional

import sympy

from .formatting import format_eq, format_expr
from .functions import LogB, symbolic_logs, to_real_logs
from .linear import solve_linear
from .messages import explained
from .quadratic import solve_quadratic
from .schemas_internal import StepData


class LogEquationUnsupported(Exception):
    """A log/exponential equation outside the textbook shapes handled
    here (mixed bases, x both inside and outside a log, degree > 2 after
    removing the logs...) — surfaced as a clean 422 by main.py."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def solve_log_equation(lhs: sympy.Expr, rhs: sympy.Expr,
                       symbol: sympy.Symbol) -> tuple[list[StepData], list[sympy.Expr]]:
    """Logarithm equations the way حسابان ۱ solves them:

    1. write the domain (every log's argument > 0),
    2. combine the logs with the log rules into one log (or, for
       log(A) = log(B), drop the logs: A = B),
    3. rewrite log_b(P) = c as P = b^c,
    4. solve the resulting linear/quadratic equation (linear.py /
       quadratic.py, so those steps read exactly like everywhere else),
    5. keep only the roots inside the domain.

    Returns (steps, accepted roots) — possibly no roots at all.
    """
    steps: list[StepData] = []
    x = format_expr(symbol)
    display = format_eq(lhs, rhs)
    logs = symbolic_logs(lhs, symbol) + symbolic_logs(rhs, symbol)
    # In the order they appear in the problem, for the domain step.
    arguments = sorted(dict.fromkeys(log.args[0] for log in logs),
                       key=lambda a: display.find(format_expr(a)))
    bases = {log.args[1] for log in logs}
    if len(bases) != 1:
        raise LogEquationUnsupported("Logarithms with different bases aren't supported yet.")
    base = bases.pop()

    def add(before: str, after: str, operation: str, key: str,
            value: Optional[str] = None, **params) -> None:
        if value is not None:
            params["value"] = value
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=value, target="both_sides", **explained(key, **params),
        ))

    add(display, ", ".join(f"{format_expr(a)} > 0" for a in arguments), "domain", "log_domain")

    # Everything moved to one side: a sum of k·log_b(A) plus a constant.
    # A same-base log of a number (log(9) next to 2log(x)) stays a log
    # term so it can be combined; any other constant is just a number.
    log_terms: list[tuple[sympy.Expr, sympy.Expr]] = []
    constant = sympy.Integer(0)
    for term in sympy.Add.make_args(lhs - rhs):
        coeff, rest = term.as_coeff_Mul()
        if isinstance(rest, LogB) and rest.args[1] == base and coeff.is_Integer:
            log_terms.append((coeff, rest.args[0]))
        elif isinstance(rest, LogB) and rest.args[0].has(symbol):
            raise LogEquationUnsupported("Only whole-number coefficients of a log are supported.")
        elif not term.has(symbol):
            constant += to_real_logs(term)
        else:
            raise LogEquationUnsupported(
                f"'{format_expr(term)}' mixes {x} inside and outside a logarithm."
            )
    value = sympy.nsimplify(-constant)

    def product(terms: list[tuple[sympy.Expr, sympy.Expr]]) -> sympy.Expr:
        return reduce(lambda acc, t: acc * t[1] ** abs(t[0]), terms, sympy.Integer(1))

    positive = [t for t in log_terms if t[0] > 0]
    negative = [t for t in log_terms if t[0] < 0]
    if value == 0 and positive and negative:
        # log_b(A) = log_b(B)  ->  A = B
        left, right = product(positive), product(negative)
        one_log_each = len(positive) == len(negative) == 1 and positive[0][0] == 1 == -negative[0][0]
        if not one_log_each:
            add(display, format_eq(LogB(left, base), LogB(right, base)), "combine_logs", "log_combine")
        add(format_eq(LogB(left, base), LogB(right, base)), format_eq(left, right),
            "drop_logs", "log_equal_args")
        poly_lhs, poly_rhs = left, right
    else:
        combined = product(positive) / product(negative)
        if display != format_eq(LogB(combined, base), value):
            add(display, format_eq(LogB(combined, base), value), "combine_logs", "log_combine")
        power = sympy.Pow(base, value)
        add(format_eq(LogB(combined, base), value), format_eq(combined, power),
            "to_exponential", "log_to_exponential", base=format_expr(base))
        poly_lhs, poly_rhs = combined, power
        num, den = sympy.fraction(sympy.together(combined))
        if den != 1:
            add(format_eq(combined, power), format_eq(num, power * den),
                "multiply", "multiply_both_sides", value=format_expr(den))
            poly_lhs, poly_rhs = num, power * den

    candidates = _solve_polynomial(poly_lhs, poly_rhs, symbol, steps)

    accepted = []
    for root in candidates:
        bad = next((a for a in arguments if not _is_positive(a.subs(symbol, root))), None)
        if bad is None:
            accepted.append(root)
        else:
            add(f"{x} = {format_expr(root)}",
                f"{format_expr(bad)} = {format_expr(sympy.simplify(bad.subs(symbol, root)))} ≤ 0",
                "reject_root", "log_reject_root", root=f"{x} = {format_expr(root)}")
    if accepted:
        add(" or ".join(f"{x} = {format_expr(r)}" for r in accepted),
            ", ".join(f"{format_expr(a)} > 0" for a in arguments),
            "check_domain", "log_check_domain")
    return steps, accepted


def solve_exponential_equation(lhs: sympy.Expr, rhs: sympy.Expr,
                               symbol: sympy.Symbol) -> tuple[list[StepData], list[sympy.Expr]]:
    """Exponential equations: a·b^E = c·d^F with numeric bases.

    Divides out a numeric coefficient, then either rewrites both sides
    over a common base and equates exponents (2^(x+1) = 8 -> 2^(x+1) =
    2^3 -> x + 1 = 3), or, when the other side is a plain number that
    isn't a power of the base, takes log_b of both sides (2^x = 5 ->
    x = log₂(5)).
    """
    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, key: str,
            value: Optional[str] = None, **params) -> None:
        if value is not None:
            params["value"] = value
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=value, target="both_sides", **explained(key, **params),
        ))

    # The side holding x goes on the left.
    if not lhs.has(symbol):
        lhs, rhs = rhs, lhs
    coeff, power = lhs.as_coeff_Mul()
    if coeff != 1 and coeff != 0:
        new_rhs = sympy.nsimplify(rhs / coeff)
        add(format_eq(lhs, rhs), format_eq(power, new_rhs), "divide",
            "divide_both_sides", value=format_expr(coeff))
        lhs, rhs = power, new_rhs

    left = _as_power(lhs, symbol)
    right = _as_power(rhs, symbol)
    if left is None or right is None:
        raise LogEquationUnsupported("Only equations of the form a^(...) = b^(...) are supported yet.")

    common = _common_base([left[0], right[0]])
    if common is not None:
        base, (k1, k2) = common
        new_left = sympy.expand(k1 * left[1])
        new_right = sympy.expand(k2 * right[1])
        rewritten = format_eq(sympy.Pow(base, new_left, evaluate=False),
                              sympy.Pow(base, new_right, evaluate=False))
        if rewritten != format_eq(lhs, rhs):
            add(format_eq(lhs, rhs), rewritten, "same_base", "exp_same_base",
                base=format_expr(base))
        add(rewritten, format_eq(new_left, new_right), "equate_exponents", "exp_equate_exponents")
        roots = _solve_polynomial(new_left, new_right, symbol, steps)
        return steps, roots

    if not rhs.has(symbol) and rhs.is_positive:
        base, exponent = left
        log_value = LogB(rhs, base)
        add(format_eq(lhs, rhs), format_eq(exponent, log_value), "take_log",
            "exp_take_log", base=format_expr(base))
        roots = _solve_polynomial(exponent, log_value, symbol, steps)
        return steps, roots

    raise LogEquationUnsupported("These bases can't be written as powers of one base.")


def verify_roots(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol,
                 roots: list[sympy.Expr]) -> bool:
    """Each root, substituted back into the ORIGINAL equation (real
    logs), makes both sides equal — checked exactly, then numerically for
    log identities simplify() doesn't close (log(4)/log(2) - 2)."""
    real_lhs, real_rhs = to_real_logs(lhs), to_real_logs(rhs)
    for root in roots:
        real_root = to_real_logs(root)
        try:
            diff = (real_lhs - real_rhs).subs(symbol, real_root)
            if sympy.simplify(diff) == 0:
                continue
            if abs(complex(sympy.N(diff, 30))) < 1e-20:
                continue
        except Exception:
            pass
        return False
    return True


def _solve_polynomial(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol,
                      steps: list[StepData]) -> list[sympy.Expr]:
    """Solve with the regular linear/quadratic solvers, appending their
    steps (renumbered) — real roots only."""
    diff = sympy.expand(lhs - rhs)
    if not diff.has(symbol):
        return []
    try:
        degree = sympy.Poly(diff, symbol).degree()
    except sympy.PolynomialError:
        raise LogEquationUnsupported("After removing the logs/powers the equation isn't polynomial.")
    if degree == 1:
        sub_steps, root = solve_linear(lhs, rhs, symbol)
        roots = [root]
    elif degree == 2:
        sub_steps, roots = solve_quadratic(lhs, rhs, symbol)
    else:
        raise LogEquationUnsupported(f"Degree {degree} equations aren't supported yet.")
    for step in sub_steps:
        step.id = len(steps) + 1
        steps.append(step)
    return [r for r in roots if to_real_logs(r).is_real]


def _is_positive(value: sympy.Expr) -> bool:
    value = sympy.simplify(value)
    if value.is_positive is not None:
        return bool(value.is_positive)
    try:
        return float(sympy.N(value)) > 0
    except TypeError:
        return False


def _as_power(expr: sympy.Expr, symbol: sympy.Symbol) -> Optional[tuple[sympy.Expr, sympy.Expr]]:
    """(base, exponent) for b^E with a positive numeric base, or a
    positive number as (n, 1)."""
    if expr.is_Pow and expr.base.is_number and expr.base.is_positive and expr.base != 1:
        return expr.base, expr.exp
    if not expr.has(symbol) and expr.is_Rational and expr.is_positive:
        return expr, sympy.Integer(1)
    return None


def _root_power(q: sympy.Rational) -> Optional[tuple[int, int]]:
    """q = r^k with the smallest integer r > 1; 1 -> (0, 0), any base."""
    if q == 1:
        return 0, 0
    p, d = int(q.p), int(q.q)
    if d == 1:
        n, sign = p, 1
    elif p == 1:
        n, sign = d, -1
    else:
        return None
    found = sympy.perfect_power(n)
    r, k = found if found else (n, 1)
    # perfect_power(64) gives (2, 6) — already the smallest base.
    return r, sign * k


def _common_base(bases: list[sympy.Expr]) -> Optional[tuple[sympy.Integer, tuple[int, ...]]]:
    """If every base is a power of one integer r, (r, exponents)."""
    if not all(b.is_Rational for b in bases):
        return None
    powers = [_root_power(sympy.Rational(b)) for b in bases]
    if any(p is None for p in powers):
        return None
    roots = {r for r, k in powers if k != 0}
    if len(roots) != 1:
        return None
    r = roots.pop()
    return sympy.Integer(r), tuple(k for _, k in powers)

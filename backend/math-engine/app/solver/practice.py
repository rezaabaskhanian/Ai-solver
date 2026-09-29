import random

import sympy

from .formatting import format_eq, format_expr
from .functions import LogB
from .limit import LimitUnsupported, solve_limit
from .logarithm import (
    LogEquationUnsupported,
    solve_exponential_equation,
    solve_log_equation,
    verify_roots,
)
from .parser import ParseError, parse_problem
from .sets import SetsError, solve_sets, verify_sets
from .verify import verify_limit
from .vectors import VectorError, solve_vector, verify_vector

_SUPPORTED_PRACTICE_TYPES = (
    "linear_equation", "quadratic_equation", "expression", "arithmetic",
    "limit", "log_equation", "exponential_equation", "set_operation", "vector",
)
_MAX_ATTEMPTS = 20


class UnsupportedPracticeType(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def generate_practice_problem(problem_type: str) -> str:
    """Generate a fresh problem of the given type. Validated by round-
    tripping through the real parser (the same one that classifies every
    other problem) and confirming it still comes back as the requested
    type — catches degenerate draws (e.g. a linear coefficient landing
    on 0) without a second, hand-rolled validation path.
    """
    if problem_type not in _SUPPORTED_PRACTICE_TYPES:
        raise UnsupportedPracticeType(f"'{problem_type}' practice problems aren't supported yet.")

    generator = {
        "linear_equation": _generate_linear,
        "quadratic_equation": _generate_quadratic,
        "expression": _generate_expression,
        "arithmetic": _generate_arithmetic,
        "limit": _generate_limit,
        "log_equation": _generate_log_equation,
        "exponential_equation": _generate_exponential,
        "set_operation": _generate_sets,
        "vector": _generate_vector,
    }[problem_type]

    for _ in range(_MAX_ATTEMPTS):
        text = generator()
        try:
            parsed = parse_problem(text)
        except ParseError:
            continue
        if parsed.problem_type == problem_type and _solves_cleanly(parsed):
            return text

    raise UnsupportedPracticeType(f"Could not generate a valid '{problem_type}' practice problem.")


def _generate_linear() -> str:
    x = sympy.Symbol("x")
    a = random.randint(2, 9)
    x_target = random.choice([n for n in range(-10, 11) if n != 0])
    b = random.randint(-15, 15)
    c = a * x_target + b
    return format_eq(a * x + b, sympy.Integer(c))


def _generate_quadratic() -> str:
    x = sympy.Symbol("x")
    r1 = random.randint(-6, 6)
    r2 = random.choice([n for n in range(-6, 7) if n != r1])
    expanded = sympy.expand((x - r1) * (x - r2))
    return format_eq(expanded, sympy.Integer(0))


def _generate_expression() -> str:
    x = sympy.Symbol("x")
    a = random.randint(2, 6)
    b = random.randint(-9, 9)
    c = random.randint(2, 6)
    # a*(x+b) stays an unevaluated Mul(a, Add(x, b)) — sympy only
    # auto-combines top-level Add terms, not ones nested inside an
    # unexpanded product (the same reason "3(x+2)=15" needs an explicit
    # expand() step in linear.py) — so there's genuine simplification
    # work left for solve_expression to do.
    expr = a * (x + b) + c * x
    return format_expr(expr)


def _generate_arithmetic() -> str:
    a = random.randint(2, 9)
    b = random.randint(2, 9)
    c = random.randint(1, 5)
    return format_expr(sympy.Integer(a) * (sympy.Integer(b) + sympy.Integer(c)))


# ---------- newer topics ----------
#
# These solvers can refuse a problem (a limit that doesn't settle, a log
# equation with no root in its domain...), so a draw is only kept if the
# engine actually solves AND verifies it with a real answer — the student
# never gets a practice problem the app itself can't do.

def _solves_cleanly(parsed) -> bool:
    try:
        t = parsed.problem_type
        if t == "limit":
            _, value, sides = solve_limit(parsed.expr, parsed.symbol, parsed.limit_point, parsed.limit_dir)
            return value is not None and verify_limit(parsed.expr, parsed.symbol, parsed.limit_point, sides)
        if t in ("log_equation", "exponential_equation"):
            solver = solve_log_equation if t == "log_equation" else solve_exponential_equation
            _, roots = solver(parsed.lhs, parsed.rhs, parsed.symbol)
            return bool(roots) and verify_roots(parsed.lhs, parsed.rhs, parsed.symbol, roots)
        if t == "set_operation":
            _, _, value = solve_sets(parsed.structure)
            return verify_sets(parsed.structure, value)
        if t == "vector":
            _, _, value = solve_vector(parsed.structure)
            return verify_vector(parsed.structure, value)
        return True
    except (LimitUnsupported, LogEquationUnsupported, SetsError, VectorError):
        return False


def _nonzero(low: int, high: int) -> int:
    return random.choice([n for n in range(low, high + 1) if n != 0])


def _generate_limit() -> str:
    x = sympy.Symbol("x")
    kind = random.choice(["factor", "factor", "conjugate", "infinity", "substitute"])
    if kind == "factor":
        # (x - a)(x + b) / (x - a): 0/0 at x = a, then cancel.
        a = random.randint(-5, 5)
        b = random.choice([n for n in range(-6, 7) if n != -a])
        num = sympy.expand((x - a) * (x + b))
        return f"lim(x→{a}) ({format_expr(num)})/({format_expr(x - a)})"
    if kind == "conjugate":
        k = random.randint(1, 5)
        return f"lim(x→{k * k}) (sqrt(x) - {k})/(x - {k * k})"
    if kind == "infinity":
        a, c = _nonzero(-6, 6), _nonzero(1, 6)
        num = a * x**2 + random.randint(-9, 9) * x + random.randint(-9, 9)
        den = c * x**2 + random.randint(-9, 9)
        return f"lim(x→∞) ({format_expr(num)})/({format_expr(den)})"
    a = random.randint(-4, 4)
    poly = x**2 + random.randint(-6, 6) * x + random.randint(-9, 9)
    return f"lim(x→{a}) {format_expr(poly)}"


def _log(base: int, arg) -> str:
    return format_expr(LogB(arg, sympy.Integer(base)))


def _generate_log_equation() -> str:
    x = sympy.Symbol("x")
    base = random.choice([2, 3])
    kind = random.choice(["single", "sum", "equal"])
    if kind == "single":
        # log_b(a·x + c) = n with a whole-number root.
        n, a = random.randint(1, 3), random.randint(1, 3)
        root = random.randint(1, 9)
        c = base**n - a * root
        return f"{_log(base, a * x + c)} = {n}"
    if kind == "sum":
        # log_b(x) + log_b(x + k) = n: roots b^i and -(b^(n-i)) ... one of
        # them lands outside the domain, as in the textbook exercises.
        n = random.randint(2, 4)
        i = random.choice([j for j in range(n + 1) if 2 * j != n])
        k = base ** (n - i) - base**i
        return f"{_log(base, x)} + {_log(base, x + k)} = {n}"
    # log_b(x + p) = log_b(q·x + s), equal at a whole-number root.
    root, q = random.randint(1, 8), random.randint(2, 4)
    p = random.randint(1, 6)
    s_ = root + p - q * root
    return f"{_log(base, x + p)} = {_log(base, q * x + s_)}"


def _generate_exponential() -> str:
    x = sympy.Symbol("x")
    base = random.choice([2, 3, 5])
    p, q = random.sample([1, 2, 3], 2)
    if random.random() < 0.5:
        # (base^p)^(x + k) = base^m, with p | m and the number kept small
        # enough to recognise as a power (at most 1000).
        k = random.randint(-3, 3)
        m = p * random.choice([j for j in range(1, 5) if base ** (p * j) <= 1000] or [1])
        return f"{base**p}^{_exponent(x + k)} = {base**m}"
    # (base^p)^x = (base^q)^(x + k): p·x = q·(x + k) — pick k so x is whole.
    k = (p - q) * random.randint(1, 3)
    return f"{base**p}^x = {base**q}^{_exponent(x + k)}"


def _exponent(expr) -> str:
    text = format_expr(expr)
    return text if expr.is_Symbol else f"({text})"


def _format_set(items) -> str:
    return "{" + ",".join(str(n) for n in sorted(items)) + "}"


def _generate_sets() -> str:
    if random.random() < 0.25:
        # The counting formula.
        a, b = random.randint(4, 12), random.randint(4, 12)
        c = random.randint(1, min(a, b) - 1)
        if random.random() < 0.5:
            return f"n(A)={a}, n(B)={b}, n(A∩B)={c}, n(A∪B)"
        return f"n(A)={a}, n(B)={b}, n(A∪B)={a + b - c}, n(A∩B)"
    pool = list(range(1, 10))
    random.shuffle(pool)
    shared = pool[:random.randint(1, 2)]
    a = shared + pool[3:3 + random.randint(1, 3)]
    b = shared + pool[6:6 + random.randint(1, 3)]
    question = random.choice(["A∪B", "A∩B", "A-B", "B-A", "(A∪B)-(A∩B)", "A'"])
    head = f"A={_format_set(a)}, B={_format_set(b)}"
    if question == "A'":
        return f"U={_format_set(range(1, 10))}, {head}, A'"
    return f"{head}, {question}"


def _vec(a: int, b: int) -> str:
    return f"[{a}, {b}]"


def _generate_vector() -> str:
    kind = random.choice(["combine", "points", "length"])
    if kind == "combine":
        k = random.randint(2, 4)
        u = _vec(random.randint(-6, 6), random.randint(-6, 6))
        v = _vec(random.randint(-6, 6), random.randint(-6, 6))
        return f"{k}{u} {random.choice(['+', '-'])} {v}"
    x1, y1 = random.randint(-5, 5), random.randint(-5, 5)
    if kind == "points":
        x2, y2 = random.randint(-5, 5), random.randint(-5, 5)
        return f"A({x1}, {y1}), B({x2}, {y2}), AB"
    # A whole-number length: a Pythagorean triple, in some direction.
    dx, dy = random.choice([(3, 4), (4, 3), (6, 8), (5, 12), (8, 6)])
    dx, dy = dx * random.choice([1, -1]), dy * random.choice([1, -1])
    return f"A({x1}, {y1}), B({x1 + dx}, {y1 + dy}), |AB|"

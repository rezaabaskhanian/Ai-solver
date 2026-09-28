import random

import sympy

from .formatting import format_eq, format_expr
from .parser import ParseError, parse_problem

_SUPPORTED_PRACTICE_TYPES = ("linear_equation", "quadratic_equation", "expression", "arithmetic")
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
    }[problem_type]

    for _ in range(_MAX_ATTEMPTS):
        text = generator()
        try:
            parsed = parse_problem(text)
        except ParseError:
            continue
        if parsed.problem_type == problem_type:
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

from app.solver.expression import solve_expression
from app.solver.formatting import format_expr
from app.solver.parser import parse_problem


def _solve(raw):
    parsed = parse_problem(raw)
    steps, result = solve_expression(parsed.expr)
    return steps, result


def test_arithmetic_expression_is_evaluated():
    _, result = _solve("2*(3 + 4)")
    assert format_expr(result) == "14"


def test_fraction_simplifies_to_rational():
    _, result = _solve("1/2 + 1/3")
    assert format_expr(result) == "5/6"


def test_already_simplified_expression_has_no_steps():
    steps, result = _solve("7")
    assert steps == []
    assert format_expr(result) == "7"


def test_algebraic_simplification_combines_like_terms():
    _, result = _solve("2x + 3x")
    assert format_expr(result) == "5x"


def test_power_expression():
    _, result = _solve("2^3")
    assert format_expr(result) == "8"

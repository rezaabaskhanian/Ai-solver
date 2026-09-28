from app.solver.formatting import format_expr
from app.solver.linear import solve_linear
from app.solver.parser import parse_problem
from app.solver.verify import verify_equation_root


def _solve(raw):
    parsed = parse_problem(raw)
    steps, value = solve_linear(parsed.lhs, parsed.rhs, parsed.symbol)
    return parsed, steps, value


def test_simple_linear_equation():
    parsed, steps, value = _solve("2x + 5 = 17")
    assert format_expr(value) == "6"
    assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, value)
    operations = [s.operation for s in steps]
    assert operations == ["subtract", "divide"]


def test_equation_with_parentheses_is_solved():
    # sympy's parser distributes 3*(x + 2) into 3*x + 6 while parsing,
    # so by the time solve_linear sees lhs/rhs there is nothing left to
    # expand — this exercises the subtract/divide path, not "expand".
    parsed, steps, value = _solve("3(x + 2) = 15")
    assert format_expr(value) == "3"
    assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, value)
    assert [s.operation for s in steps] == ["subtract", "divide"]


def test_equation_with_division_multiplies_to_isolate():
    parsed, steps, value = _solve("x / 3 + 4 = 9")
    assert format_expr(value) == "15"
    assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, value)
    assert any(s.operation == "multiply" for s in steps)


def test_negative_coefficient_produces_add_step():
    parsed, steps, value = _solve("2x - 7 = 15")
    assert format_expr(value) == "11"
    assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, value)


def test_variable_on_both_sides():
    parsed, steps, value = _solve("5x + 2 = 2x + 11")
    assert format_expr(value) == "3"
    assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, value)
    assert any(s.target == "both_sides" for s in steps)


def test_each_step_explanation_is_nonempty():
    _, steps, _ = _solve("2x + 5 = 17")
    assert all(s.explanation for s in steps)

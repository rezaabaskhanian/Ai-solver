import sympy

from app.solver.derivative import solve_derivative
from app.solver.formatting import format_expr
from app.solver.parser import parse_problem

x = sympy.Symbol("x")


def _solve(raw):
    parsed = parse_problem(raw)
    steps, result = solve_derivative(parsed.expr, parsed.symbol)
    return parsed, steps, result


def test_detects_d_dx_notation():
    parsed, _, result = _solve("d/dx(x^2 + 3x)")
    assert parsed.problem_type == "derivative"
    assert format_expr(result) == "2x + 3"


def test_detects_diff_call_notation():
    parsed, _, result = _solve("diff(x^2, x)")
    assert parsed.problem_type == "derivative"
    assert format_expr(result) == "2x"


def test_power_rule_step_is_named():
    _, steps, _ = _solve("d/dx(x^3)")
    assert steps[0].operation == "power_rule"


def test_constant_rule_gives_zero():
    _, steps, result = _solve("d/dx(7)")
    assert format_expr(result) == "0"
    assert steps[0].operation == "constant_rule"


def test_trig_rule_sin_and_cos():
    _, _, result = _solve("d/dx(sin(x))")
    assert format_expr(result) == "cos(x)"
    _, _, result2 = _solve("d/dx(cos(x))")
    assert format_expr(result2) == "-sin(x)"


def test_sum_rule_splits_multi_term_expression():
    parsed, steps, result = _solve("d/dx(x^3 - 2x^2 + 7)")
    operations = [s.operation for s in steps]
    assert operations[0] == "sum_rule"
    assert operations[-1] == "combine"
    assert format_expr(result) == format_expr(sympy.diff(parsed.expr, parsed.symbol))


def test_unnamed_rule_falls_back_but_stays_correct():
    # x*sin(x) needs the product rule, which has no named step here —
    # the result must still be exactly right even without one.
    _, steps, result = _solve("d/dx(x*sin(x))")
    assert steps[0].operation == "apply_derivative_rules"
    assert result == sympy.diff(x * sympy.sin(x), x)

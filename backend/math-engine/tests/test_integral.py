import pytest
import sympy

from app.solver.formatting import format_expr
from app.solver.integral import IntegrationUnsupported, solve_integral
from app.solver.parser import parse_problem
from app.solver.verify import verify_integral

x = sympy.Symbol("x")


def _solve(raw):
    parsed = parse_problem(raw)
    steps, result = solve_integral(parsed.expr, parsed.symbol)
    return parsed, steps, result


def test_detects_integral_sign_notation():
    parsed, _, result = _solve("∫x^2 dx")
    assert parsed.problem_type == "integral"
    assert format_expr(result) == "x^3/3"


def test_detects_integrate_call_notation():
    parsed, _, result = _solve("integrate(x^2, x)")
    assert parsed.problem_type == "integral"
    assert format_expr(result) == "x^3/3"


def test_power_rule_step_is_named():
    _, steps, _ = _solve("∫x^2 dx")
    assert steps[0].operation == "power_rule"


def test_log_rule_for_reciprocal():
    _, steps, result = _solve("∫1/x dx")
    assert format_expr(result) == "ln(x)"
    assert steps[0].operation == "log_rule"


def test_trig_antiderivatives():
    _, _, result = _solve("∫sin(x) dx")
    assert format_expr(result) == "-cos(x)"
    _, _, result2 = _solve("∫cos(x) dx")
    assert format_expr(result2) == "sin(x)"


def test_constant_of_integration_is_appended_as_final_step():
    _, steps, result = _solve("∫x^2 dx")
    assert steps[-1].operation == "add_constant"
    assert steps[-1].after == f"{format_expr(result)} + C"


def test_result_verifies_by_differentiating_back():
    parsed, _, result = _solve("∫x^3 - 2x^2 + 7 dx")
    assert verify_integral(parsed.expr, parsed.symbol, result)


def test_sum_rule_splits_multi_term_expression():
    _, steps, _ = _solve("∫x^3 - 2x^2 + 7 dx")
    operations = [s.operation for s in steps]
    assert operations[0] == "sum_rule"
    assert "combine" in operations


def test_unsupported_integral_raises_cleanly():
    # sympy can't find an elementary antiderivative for sin(sin(x)) —
    # must raise rather than silently returning an unevaluated Integral
    # as if it were a real answer.
    with pytest.raises(IntegrationUnsupported):
        solve_integral(sympy.sin(sympy.sin(x)), x)

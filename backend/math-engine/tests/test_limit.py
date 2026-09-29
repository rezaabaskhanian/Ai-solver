import pytest
import sympy
from fastapi.testclient import TestClient

from app.main import app
from app.solver.limit import LimitUnsupported, format_limit_value, solve_limit
from app.solver.parser import parse_problem
from app.solver.verify import verify_limit

client = TestClient(app)


def _solve(raw):
    parsed = parse_problem(raw)
    steps, value, sides = solve_limit(parsed.expr, parsed.symbol, parsed.limit_point, parsed.limit_dir)
    return parsed, steps, value, sides


@pytest.mark.parametrize("raw,point,direction", [
    ("lim(x->2) (x^2-4)/(x-2)", 2, "+-"),
    ("lim(x→2)(x^2-4)/(x-2)", 2, "+-"),
    ("lim_{x->0+} 1/x", 0, "+"),
    ("lim(x->0^-) 1/x", 0, "-"),
    ("lim(x->-3) x^2", -3, "+-"),
    ("lim(x→∞) 1/x", sympy.oo, "+-"),
    ("lim(x->-oo) 1/x", -sympy.oo, "+-"),
    ("limit(sin(x)/x, x, 0)", 0, "+-"),
])
def test_limit_notations_are_detected(raw, point, direction):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "limit"
    assert parsed.limit_point == point
    assert parsed.limit_dir == direction


def test_display_uses_arrow_and_side_marker():
    assert parse_problem("lim(x->0+) 1/x").display == "lim(x→0⁺) 1/x"
    assert parse_problem("lim(x->oo) 1/x").display == "lim(x→∞) 1/x"


def test_continuous_function_is_direct_substitution():
    _, steps, value, _ = _solve("lim(x->3) 2x+1")
    assert value == 7
    assert [s.operation for s in steps] == ["substitute"]


def test_zero_over_zero_factors_and_cancels():
    _, steps, value, _ = _solve("lim(x->2) (x^2-4)/(x-2)")
    assert value == 4
    assert [s.operation for s in steps] == ["indeterminate_form", "factor", "cancel", "substitute"]
    assert steps[1].after == "(x - 2)(x + 2)/(x - 2)"
    assert steps[2].after == "x + 2"


def test_radical_zero_over_zero_uses_the_conjugate():
    _, steps, value, _ = _solve("lim(x->4) (sqrt(x)-2)/(x-4)")
    assert value == sympy.Rational(1, 4)
    assert [s.operation for s in steps] == [
        "indeterminate_form", "multiply_conjugate", "cancel", "substitute",
    ]
    assert steps[2].after == "1/(sqrt(x) + 2)"


def test_limit_at_infinity_keeps_leading_terms():
    _, steps, value, _ = _solve("lim(x->oo) (2x^2+1)/(x^2-3)")
    assert value == 2
    assert steps[0].operation == "keep_leading_terms"
    assert steps[0].after == "2x^2/x^2"


def test_different_one_sided_limits_do_not_exist():
    _, steps, value, sides = _solve("lim(x->1) 1/(x-1)")
    assert value is None
    assert format_limit_value(value) == "∄"
    assert sides == {"+": sympy.oo, "-": -sympy.oo}
    assert steps[-1].operation == "limit_does_not_exist"


def test_one_sided_infinite_limit():
    _, _, value, _ = _solve("lim(x->0+) 1/x")
    assert value == sympy.oo
    assert format_limit_value(value) == "∞"


def test_special_limit_falls_back_but_stays_correct():
    _, steps, value, _ = _solve("lim(x->0) sin(x)/x")
    assert value == 1
    assert steps[-1].operation == "apply_limit_rules"


def test_oscillating_limit_is_unsupported():
    with pytest.raises(LimitUnsupported):
        _solve("lim(x->0) sin(1/x)")


@pytest.mark.parametrize("raw", [
    "lim(x->4) (sqrt(x)-2)/(x-4)",
    "lim(x->0) abs(x)/x",
    "lim(x->0+) ln(x)",
    "lim(x->oo) sqrt(x^2+x)-x",
    "lim(x->-oo) x^3",
])
def test_numeric_verification_accepts_correct_limits(raw):
    parsed, _, _, sides = _solve(raw)
    assert verify_limit(parsed.expr, parsed.symbol, parsed.limit_point, sides)


def test_numeric_verification_rejects_a_wrong_value():
    parsed = parse_problem("lim(x->2) (x^2-4)/(x-2)")
    assert not verify_limit(parsed.expr, parsed.symbol, parsed.limit_point, {"+": sympy.Integer(5)})


def test_api_solves_a_limit_in_persian():
    resp = client.post("/solve", json={"problem": "lim(x→2) (x^2-4)/(x-2)", "lang": "fa"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "limit"
    assert body["answer"] == "4"
    assert body["verified"] is True
    assert "0/0" in body["steps"][0]["explanation"]


def test_api_unsupported_limit_is_422():
    resp = client.post("/solve", json={"problem": "lim(x->0) sin(1/x)"})
    assert resp.status_code == 422
    assert resp.json()["error"] == "unsupported_problem_type"

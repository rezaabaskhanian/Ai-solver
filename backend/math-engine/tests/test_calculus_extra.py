import pytest
import sympy
from fastapi.testclient import TestClient

from app.main import app
from app.solver.parser import ParseError, parse_problem

client = TestClient(app)
x = sympy.Symbol("x")


def _solve(problem: str, lang: str = "en"):
    resp = client.post("/solve", json={"problem": problem, "lang": lang})
    return resp.status_code, resp.json()


# ---------- second derivative ----------

@pytest.mark.parametrize("problem", [
    "d^2/dx^2(x^3)", "d²/dx²(x^3)", "d2/dx2(x^3)", "d/dx(d/dx(x^3))",
    "diff(x^3, x, 2)", "y = x^3, y''", "f(x) = x^3, f''(x)", "y = x³ , y″",
])
def test_second_derivative_notations(problem):
    parsed = parse_problem(problem)
    assert parsed.problem_type == "derivative"
    assert parsed.derivative_order == 2
    assert parsed.derivative_at is None
    status, body = _solve(problem)
    assert status == 200, body
    assert body["answer"] == "6x"


def test_second_derivative_steps_differentiate_twice():
    _, body = _solve("y = x^3 + x^2, y''")
    operations = [s["operation"] for s in body["steps"]]
    assert "differentiate_again" in operations
    again = operations.index("differentiate_again")
    assert body["steps"][again]["before"] == "y' = 3x^2 + 2x"
    assert body["answer"] == "6x + 2"
    assert [s["id"] for s in body["steps"]] == list(range(1, len(body["steps"]) + 1))


def test_first_derivative_unchanged():
    parsed = parse_problem("d/dx(x^3)")
    assert parsed.derivative_order == 1
    _, body = _solve("d/dx(x^3)")
    assert body["answer"] == "3x^2"


def test_y_prime_uses_the_expressions_own_variable():
    parsed = parse_problem("y = t^2, y'")
    assert parsed.symbol == sympy.Symbol("t")


# ---------- derivative at a point ----------

@pytest.mark.parametrize("problem,order,value", [
    ("f(x) = x^3, f'(2)", 1, "12"),
    ("f(x)=x^3,f’(2)", 1, "12"),
    ("d/dx(x^3)|x=2", 1, "12"),
    ("d/dx(x^3) |_{x=2}", 1, "12"),
    ("y = x^3, y'(2)", 1, "12"),
    ("f(x) = x^3, f''(2)", 2, "12"),
    ("d^2/dx^2(x^3)|x=-1", 2, "-6"),
    ("f(x) = sin(x), f'(pi)", 1, "-1"),
])
def test_derivative_at_a_point(problem, order, value):
    parsed = parse_problem(problem)
    assert parsed.problem_type == "derivative"
    assert parsed.derivative_order == order
    status, body = _solve(problem)
    assert status == 200, body
    assert body["answer"] == value
    assert body["verified"] is True
    assert body["steps"][-1]["operation"] == "substitute_point"


def test_derivative_at_a_point_where_undefined_is_rejected():
    status, body = _solve("f(x) = 1/x, f'(0)")
    assert status == 422
    assert body["error"] == "unsupported_problem_type"


def test_derivative_at_infinity_is_a_parse_error():
    with pytest.raises(ParseError):
        parse_problem("d/dx(x^3)|x=oo")


def test_set_complement_is_not_a_derivative():
    parsed = parse_problem("A={1,2}, U={1,2,3}, A'")
    assert parsed.problem_type == "set_operation"


# ---------- definite integral ----------

@pytest.mark.parametrize("problem,value", [
    ("integrate(x^2, x, 0, 1)", "1/3"),
    ("∫_0^1 x^2 dx", "1/3"),
    ("∫_{0}^{1} x^2 dx", "1/3"),
    ("∫_0^2 3x dx", "6"),
    ("∫_{0}^{pi} sin(x) dx", "2"),
    ("∫_{-1}^{1} x dx", "0"),
    ("integrate(1/x^2, x, 1, oo)", "1"),
])
def test_definite_integral(problem, value):
    parsed = parse_problem(problem)
    assert parsed.problem_type == "integral"
    assert parsed.integral_bounds is not None
    status, body = _solve(problem)
    assert status == 200, body
    assert body["answer"] == value
    assert "C" not in body["answer"]
    assert body["verified"] is True
    assert [s["operation"] for s in body["steps"]][-2:] == ["evaluate_bounds", "simplify"]


def test_definite_integral_has_no_constant_step():
    _, body = _solve("integrate(x^2, x, 0, 1)")
    assert "add_constant" not in [s["operation"] for s in body["steps"]]


def test_indefinite_integral_unchanged():
    parsed = parse_problem("∫ 2x dx")
    assert parsed.integral_bounds is None
    _, body = _solve("∫ 2x dx")
    assert body["answer"] == "x^2 + C"


@pytest.mark.parametrize("problem", [
    "integrate(1/x, x, -1, 1)",   # not continuous on the interval
    "integrate(1/x, x, 1, oo)",   # diverges
])
def test_definite_integral_without_a_finite_value_is_rejected(problem):
    status, body = _solve(problem)
    assert status == 422
    assert body["error"] == "unsupported_problem_type"


def test_new_steps_are_persian():
    for problem in ["y = x^3, y''", "f(x) = x^3, f'(2)", "integrate(x^2, x, 0, 1)"]:
        status, body = _solve(problem, "fa")
        assert status == 200, body
        for step in body["steps"]:
            assert "the " not in step["explanation"], step

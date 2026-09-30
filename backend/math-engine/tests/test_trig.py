from fastapi.testclient import TestClient

from app.main import app
from app.solver.parser import parse_problem
from app.solver.trig import solve_trig_values

client = TestClient(app)


def _solve(problem: str):
    parsed = parse_problem(problem)
    return solve_trig_values(parsed.trig_raw, parsed.expr)


def test_degrees_then_exact_value():
    steps, result = _solve("sin(30°)")
    assert [(s.before, s.after, s.operation) for s in steps] == [
        ("sin(30°)", "sin(π/6)", "degrees_to_radians"),
        ("sin(π/6)", "1/2", "exact_values"),
    ]
    assert str(result) == "1/2"


def test_radians_skip_the_conversion_step():
    steps, _ = _solve("sin(pi/6)")
    assert [s.operation for s in steps] == ["exact_values"]


def test_leftover_arithmetic_gets_its_own_step():
    steps, result = _solve("2sin(30°) + cos(0°)")
    assert [s.operation for s in steps] == ["degrees_to_radians", "exact_values", "simplify"]
    assert steps[1].after == "2(1/2) + 1"
    assert result == 2


def test_decimal_degrees_become_an_exact_fraction_of_pi():
    steps, _ = _solve("sin(22.5°)")
    assert steps[0].after == "sin(π/8)"


def test_value_without_an_exact_form_is_left_alone():
    steps, _ = _solve("sin(1) + cos(0)")
    assert [s.operation for s in steps] == ["exact_values"]
    assert steps[0].after == "sin(1) + 1"


def test_solve_endpoint_shows_the_steps_in_persian():
    resp = client.post("/solve", json={"problem": "cos(60°)", "lang": "fa"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["problem"] == "cos(60°)"
    assert body["answer"] == "1/2"
    assert body["type"] == "trig_expression"
    assert len(body["steps"]) == 2
    assert "رادیان" in body["steps"][0]["explanation"]

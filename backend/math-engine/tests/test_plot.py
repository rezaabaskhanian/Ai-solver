import math

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.solver.parser import ParseError, parse_problem

client = TestClient(app)


def _solve(problem: str, lang: str = "en"):
    resp = client.post("/solve", json={"problem": problem, "lang": lang})
    return resp.status_code, resp.json()


def _features(body, kind):
    return [(f["x"], f["y"]) for f in body["plot"]["features"] if f["kind"] == kind]


@pytest.mark.parametrize("problem", [
    "plot(x^2 - 4)", "y = x^2 - 4", "f(x) = x^2 - 4", "plot(x^2-4, x, -5, 5)",
])
def test_plot_notations(problem):
    parsed = parse_problem(problem)
    assert parsed.problem_type == "function_plot"
    status, body = _solve(problem)
    assert status == 200, body
    assert body["type"] == "function_plot"
    assert body["verified"] is True
    assert body["answer"] == "y = x^2 - 4"


def test_parabola_features():
    _, body = _solve("y = x^2 - 4")
    assert sorted(_features(body, "root")) == [(-2, 0), (2, 0)]
    assert _features(body, "y_intercept") == [(0, -4)]
    assert _features(body, "min") == [(0, -4)]
    assert _features(body, "max") == []
    plot = body["plot"]
    assert plot["x_min"] < -2 and plot["x_max"] > 2
    assert plot["y_min"] <= -4 <= plot["y_max"]
    assert len(plot["points"]) > 100


def test_cubic_has_max_and_min():
    _, body = _solve("y = x^3 - 3x")
    assert _features(body, "max") == [(-1, 2)]
    assert _features(body, "min") == [(1, -2)]


def test_hyperbola_asymptotes_break_the_curve():
    status, body = _solve("y = 1/x")
    assert status == 200, body
    plot = body["plot"]
    assert plot["vertical_asymptotes"] == [0]
    assert plot["horizontal_asymptotes"] == [0]
    assert _features(body, "y_intercept") == []
    # The two branches must not be joined across x = 0.
    xs_with_break = [x for x, y in plot["points"] if y is None]
    assert any(-0.1 < x < 0.1 for x in xs_with_break)


def test_trig_uses_numeric_roots():
    status, body = _solve("y = sin(x)")
    assert status == 200, body
    roots = {round(x, 3) for x, _ in _features(body, "root")}
    assert {round(k * math.pi, 3) for k in (-1, 0, 1)} <= roots
    assert body["plot"]["horizontal_asymptotes"] == []


def test_constant_function_is_a_line():
    status, body = _solve("plot(3)")
    assert status == 200, body
    assert _features(body, "root") == []


def test_y_equals_number_is_still_an_equation():
    assert parse_problem("y = 5").problem_type == "linear_equation"


def test_function_with_two_variables_is_rejected():
    with pytest.raises(ParseError):
        parse_problem("plot(x + t)")


def test_plot_steps_are_persian():
    status, body = _solve("y = x^3 - 3x", "fa")
    assert status == 200, body
    for step in body["steps"]:
        assert "the " not in step["explanation"], step


def test_other_problem_types_have_no_plot():
    _, body = _solve("2x + 5 = 17")
    assert body.get("plot") is None


def test_sqrt_only_drawn_where_defined():
    status, body = _solve("y = sqrt(x)")
    assert status == 200, body
    assert all(y is None for x, y in body["plot"]["points"] if x < 0)

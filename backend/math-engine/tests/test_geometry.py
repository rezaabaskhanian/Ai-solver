import pytest
import sympy
from fastapi.testclient import TestClient

from app.main import app
from app.solver.geometry import FORMULAS, solve_geometry, verify_geometry
from app.solver.parser import ParseError, parse_problem

client = TestClient(app)


def _solve(raw):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "geometry"
    steps, answer, value = solve_geometry(parsed.structure)
    assert verify_geometry(parsed.structure, value)
    return steps, answer, value


@pytest.mark.parametrize("raw,answer", [
    ("area(square, a=4)", "16"),
    ("perimeter(square, a=4)", "16"),
    ("area(rectangle, a=5, b=3)", "15"),
    ("perimeter(rectangle, a=5, b=3)", "16"),
    ("area(triangle, b=6, h=4)", "12"),
    ("perimeter(triangle, a=3, b=4, c=5)", "12"),
    ("area(parallelogram, b=7, h=2)", "14"),
    ("area(trapezoid, a=6, b=4, h=3)", "15"),
    ("area(rhombus, d1=6, d2=8)", "24"),
    ("perimeter(rhombus, a=5)", "20"),
    ("area(circle, r=3)", "9π ≈ 28.27"),
    ("perimeter(circle, r=5)", "10π ≈ 31.42"),
    ("volume(cube, a=3)", "27"),
    ("surface(cube, a=3)", "54"),
    ("volume(cuboid, a=2, b=3, c=4)", "24"),
    ("surface(cuboid, a=2, b=3, c=4)", "52"),
    ("volume(cylinder, r=2, h=5)", "20π ≈ 62.83"),
    ("surface(cylinder, r=2, h=5)", "28π ≈ 87.96"),
    ("volume(cone, r=3, h=4)", "12π ≈ 37.7"),
    ("volume(sphere, r=3)", "36π ≈ 113.1"),
    ("surface(sphere, r=3)", "36π ≈ 113.1"),
    ("volume(pyramid, a=6, h=5)", "60"),
    ("angle_sum(polygon, n=6)", "720°"),
    ("interior_angle(polygon, n=8)", "135°"),
    ("exterior_angle(polygon, n=7)", "360/7 ≈ 51.43°"),
    ("area(circle, r=۲)", "4π ≈ 12.57"),
    ("area(circle, r=1/2)", "π/4 ≈ 0.79"),
])
def test_formulas(raw, answer):
    _, got, _ = _solve(raw)
    assert got == answer


def test_every_formula_verifies_independently():
    # The check path (sympy.geometry / integration) must agree with the
    # textbook formula for every shape, at awkward values too.
    for (quantity, shape), formula in FORMULAS.items():
        values = {p: sympy.Rational(7, 2) if p != "n" else sympy.Integer(9) for p in formula.params}
        if (quantity, shape) == ("perimeter", "triangle"):
            values = {"a": 4, "b": 5, "c": 6}
        result = sympy.nsimplify(formula.compute(**values))
        assert sympy.simplify(formula.check(**values) - result) == 0, (quantity, shape)


def test_steps_show_formula_substitution_and_result():
    steps, _, _ = _solve("area(circle, r=3)")
    assert [s.operation for s in steps] == ["formula", "compute", "approximate"]
    assert steps[0].before == "S = π × r^2"
    assert steps[0].after == "S = π × 3^2"
    assert steps[1].after == "9π"


@pytest.mark.parametrize("raw,answer,last", [
    ("pythagoras(a=3, b=4)", "5", "c = √25 = 5"),
    ("pythagoras(a=5, c=13)", "12", "b = √144 = 12"),
    ("pythagoras(b=12, c=13)", "5", "a = √25 = 5"),
    ("pythagoras(a=1, b=1)", "sqrt(2) ≈ 1.41", "c = √2"),
])
def test_pythagoras(raw, answer, last):
    steps, got, _ = _solve(raw)
    assert got == answer
    assert any(s.after == last for s in steps)


@pytest.mark.parametrize("raw", [
    "pythagoras(a=5, c=3)",                 # hypotenuse shorter than a leg
    "pythagoras(a=3)",                      # needs two sides
    "perimeter(triangle, a=1, b=2, c=5)",   # triangle inequality
    "area(circle, a=3)",                    # wrong measurement name
    "area(hexagon, a=1)",                   # unknown shape
    "angle_sum(polygon, n=2)",
    "area(square, a=0)",
])
def test_invalid_input_is_a_parse_error(raw):
    with pytest.raises(ParseError):
        parse_problem(raw)


def test_pi_prints_as_a_symbol_elsewhere_too():
    resp = client.post("/solve", json={"problem": "2*pi"})
    assert resp.json()["answer"] == "2π"


def test_api_geometry_in_persian():
    resp = client.post("/solve", json={"problem": "area(circle, r=3)", "lang": "fa"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "geometry"
    assert body["verified"] is True
    assert "مساحت دایره" in body["steps"][0]["explanation"]

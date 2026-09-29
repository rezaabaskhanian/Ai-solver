import pytest
import sympy
from fastapi.testclient import TestClient

from app.main import app
from app.solver.parser import ParseError, parse_problem
from app.solver.vectors import solve_vector, verify_vector

client = TestClient(app)


def _solve(raw):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "vector"
    steps, answer, value = solve_vector(parsed.structure)
    assert verify_vector(parsed.structure, value)
    return parsed, steps, answer


@pytest.mark.parametrize("raw,answer", [
    ("[2, 3] + [1, -4]", "[3, -1]"),
    ("[5, 1] - [2, 4]", "[3, -3]"),
    ("3[2, -1]", "[6, -3]"),
    ("2*[3, 4]", "[6, 8]"),
    ("-[1, 2] + 2[3, 4]", "[5, 6]"),
    ("1/2[4, -6]", "[2, -3]"),
    ("[1, 2, 3] + [1, 1, 1]", "[2, 3, 4]"),
    ("|[3, 4]|", "5"),
    ("|[1, 1]|", "sqrt(2)"),
])
def test_vector_arithmetic(raw, answer):
    _, _, got = _solve(raw)
    assert got == answer


def test_each_operation_is_a_step_with_components_shown():
    _, steps, _ = _solve("3[2, -1] - [1, 5]")
    assert [s.operation for s in steps] == ["scale", "subtract"]
    assert steps[0].after == "[3×2, 3×(-1)] = [6, -3]"
    assert steps[1].after == "[6 - 1, -3 - 5] = [5, -8]"


def test_vector_between_two_points():
    parsed, steps, answer = _solve("A(1, 2), B(4, 6), AB")
    assert answer == "[3, 4]"
    assert parsed.display == "A(1, 2), B(4, 6), AB"
    assert steps[0].before == "AB = B - A"
    assert steps[0].after == "[4 - 1, 6 - 2] = [3, 4]"


def test_length_between_two_points():
    _, steps, answer = _solve("A(1,2), B(4,6), |AB|")
    assert answer == "5"
    assert steps[-1].after == "√(3^2 + 4^2) = √25 = 5"


def test_missing_point_is_unsupported():
    resp = client.post("/solve", json={"problem": "A(1,2), AC"})
    assert resp.status_code == 422


def test_different_dimensions_are_unsupported():
    resp = client.post("/solve", json={"problem": "[1,2] + [1,2,3]"})
    assert resp.status_code == 422


def test_length_inside_a_sum_is_a_parse_error():
    with pytest.raises(ParseError):
        parse_problem("|[3,4]| + [1,2]")


def test_verify_rejects_a_wrong_answer():
    parsed = parse_problem("[2, 3] + [1, -4]")
    assert not verify_vector(parsed.structure, (sympy.Integer(3), sympy.Integer(1)))


def test_api_vectors_in_persian():
    resp = client.post("/solve", json={"problem": "[2, 3] + [1, -4]", "lang": "fa"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "vector"
    assert body["answer"] == "[3, -1]"
    assert body["verified"] is True

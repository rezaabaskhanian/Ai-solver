import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.solver.parser import ParseError, parse_problem
from app.solver.sets import solve_sets, verify_sets

client = TestClient(app)


def _solve(raw):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "set_operation"
    steps, answer, value = solve_sets(parsed.structure)
    assert verify_sets(parsed.structure, value)
    return parsed, steps, answer


@pytest.mark.parametrize("raw,answer", [
    ("A={1,2,3}, B={2,3,4}, A∪B", "{1, 2, 3, 4}"),
    ("A={1,2,3}, B={2,3,4}, A∩B", "{2, 3}"),
    ("A={1,2,3}, B={2,3,4}, A-B", "{1}"),
    ("A={1,2,3}, B={2,3,4}, A\\B", "{1}"),
    ("A={1,2}, B={3}, A∩B", "∅"),
    ("{1,2} ∪ {2,5}", "{1, 2, 5}"),
    ("A={a,b}, B={b,c}, A∪B", "{a, b, c}"),
    ("A = {۱، ۲، ۳}, B={3,4}, A∩B", "{3}"),
])
def test_operations(raw, answer):
    _, _, got = _solve(raw)
    assert got == answer


def test_nested_operations_get_one_step_each():
    _, steps, answer = _solve("A={1,2,3}, B={2,3,4}, (A∪B)-(A∩B)")
    assert answer == "{1, 4}"
    assert [s.operation for s in steps] == ["union", "intersection", "difference"]
    assert steps[2].before == "{1, 2, 3, 4} - {2, 3}"


def test_complement_uses_the_universal_set():
    _, steps, answer = _solve("U={1,2,3,4,5,6}, A={1,2}, A'")
    assert answer == "{3, 4, 5, 6}"
    assert steps[0].before == "U - {1, 2}"


def test_complement_without_universal_set_is_an_error():
    resp = client.post("/solve", json={"problem": "A={1,2}, A'"})
    assert resp.status_code == 422


def test_power_set_is_listed():
    _, _, answer = _solve("A={1,2}, P(A)")
    assert answer == "{∅, {1}, {2}, {1, 2}}"


def test_number_of_subsets_uses_two_to_the_n():
    _, steps, answer = _solve("A={a,b,c}, n(P(A))")
    assert answer == "8"
    assert steps[-1].before == "n(P(A)) = 2^3"


def test_duplicate_elements_count_once():
    _, _, answer = _solve("A={1/2, 0.5, 3}, n(A)")
    assert answer == "2"


def test_mixed_operators_need_parentheses():
    with pytest.raises(ParseError):
        parse_problem("A={1,2}, B={2}, C={3}, A∪B∩C")


def test_counting_formula_for_the_union():
    _, steps, answer = _solve("n(A)=5, n(B)=7, n(A∩B)=3, n(A∪B)")
    assert answer == "9"
    assert steps[0].before == "n(A ∪ B) = n(A) + n(B) - n(A ∩ B)"
    assert steps[0].after == "x = 5 + 7 - 3"


def test_counting_formula_solved_for_the_intersection():
    _, steps, answer = _solve("n(A)=8, n(B)=6, n(A∪B)=11, n(A∩B)")
    assert answer == "3"
    assert steps[0].after == "11 = 8 + 6 - x"
    assert steps[-1].after == "n(A ∩ B) = 3"


def test_counting_formula_for_a_difference():
    _, _, answer = _solve("n(A)=8, n(A∩B)=3, n(A-B)")
    assert answer == "5"


def test_impossible_counts_are_rejected():
    resp = client.post("/solve", json={"problem": "n(A)=3, n(B)=4, n(A∩B)=5, n(A∪B)"})
    assert resp.status_code == 422


def test_limit_with_braces_is_not_a_set():
    assert parse_problem("lim_{x->0+} 1/x").problem_type == "limit"


def test_api_sets_in_persian():
    resp = client.post("/solve", json={"problem": "A={1,2,3}, B={2,3,4}, A∪B", "lang": "fa"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "set_operation"
    assert body["answer"] == "{1, 2, 3, 4}"
    assert body["verified"] is True

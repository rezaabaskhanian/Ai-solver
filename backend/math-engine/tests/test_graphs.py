import itertools

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.solver.graphs import _construct, _erdos_gallai, solve_graph, verify_graph
from app.solver.parser import ParseError, parse_problem

client = TestClient(app)


def _solve(raw):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "graph"
    steps, answer, value = solve_graph(parsed.structure)
    assert verify_graph(parsed.structure, value)
    return steps, answer


@pytest.mark.parametrize("raw,answer", [
    ("complete_graph(p=6)", "q = 15"),
    ("complete_graph(p=1)", "q = 0"),
    ("regular_graph(p=8, k=3)", "q = 12"),
    ("regular_graph(p=7, k=3)", "∄"),          # 3 × 7 is odd
    ("regular_graph(p=4, k=4)", "∄"),          # degree > p - 1
    ("complement_edges(p=6, q=9)", "q' = 6"),
    ("degree_sequence(3, 3, 2, 2, 2)", "q = 6"),
    ("degree_sequence(2, 2, 2)", "q = 3"),
    ("degree_sequence(3, 3, 1, 1)", "∄"),       # even sum, still impossible
    ("degree_sequence(3, 3, 3, 1)", "∄"),
    ("degree_sequence(4, 3, 2, 1)", "∄"),       # degree 4 with 4 vertices
    ("degree_sequence(3, 2, 2)", "∄"),          # odd sum
    ("degree_sequence(۳, ۳, ۲, ۲, ۲)", "q = 6"),
    ("graph(ab, bc, cd, da, ac)", "p = 4, q = 5, δ = 2, Δ = 3"),
])
def test_answers(raw, answer):
    _, got = _solve(raw)
    assert got == answer


def test_havel_hakimi_steps():
    steps, _ = _solve("degree_sequence(3, 3, 2, 2, 2)")
    assert steps[0].after == "12 = 2q"
    assert [s.after for s in steps if s.operation == "havel_hakimi"] == ["(2, 2, 1, 1)", "(1, 1, 0)", "(0, 0)"]
    assert steps[-1].operation == "graph_exists"


def test_graph_degrees_step():
    steps, _ = _solve("graph(ab, bc, cd, da, ac)")
    assert steps[1].after == "deg(a) = 3, deg(b) = 2, deg(c) = 3, deg(d) = 2"
    assert steps[2].after == "10 = 2 × 5"


def test_havel_hakimi_agrees_with_erdos_gallai_everywhere():
    # Every degree sequence of up to 6 vertices: the step-by-step method
    # and the independent theorem must give the same verdict.
    for p in range(1, 7):
        for seq in itertools.combinations_with_replacement(range(p), p):
            degrees = list(seq)
            parsed = parse_problem(f"degree_sequence({', '.join(map(str, degrees))})")
            _, answer, value = solve_graph(parsed.structure)
            assert (value is not None) == _erdos_gallai(degrees), degrees
            if value is not None:
                assert _construct(degrees), degrees


@pytest.mark.parametrize("raw", [
    "graph(ab, ba)",                   # multiple edge
    "graph(aa)",                       # loop
    "complement_edges(p=4, q=9)",      # more edges than K_4 has
    "regular_graph(p=5)",              # missing k
    "degree_sequence(2, x)",
])
def test_invalid_input(raw):
    resp = client.post("/solve", json={"problem": raw})
    assert resp.status_code == 422


def test_parse_errors_are_parse_errors():
    with pytest.raises(ParseError):
        parse_problem("graph(aa)")


def test_api_graph_in_persian():
    resp = client.post("/solve", json={"problem": "complete_graph(p=6)", "lang": "fa"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "graph"
    assert body["answer"] == "q = 15"
    assert body["verified"] is True
    assert "گراف کامل" in body["steps"][0]["explanation"]

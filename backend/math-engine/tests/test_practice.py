import re

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.solver.parser import parse_problem
from app.solver.practice import generate_practice_problem


@pytest.mark.parametrize(
    "problem_type",
    ["linear_equation", "quadratic_equation", "expression", "arithmetic",
     "limit", "log_equation", "exponential_equation", "set_operation", "vector"],
)
def test_generated_problem_round_trips_to_requested_type(problem_type):
    for _ in range(10):
        text = generate_practice_problem(problem_type)
        parsed = parse_problem(text)
        assert parsed.problem_type == problem_type


def test_generated_problems_are_not_all_identical():
    seen = {generate_practice_problem("linear_equation") for _ in range(10)}
    assert len(seen) > 1


client = TestClient(app)


@pytest.mark.parametrize(
    "problem_type", ["limit", "log_equation", "exponential_equation", "set_operation", "vector"],
)
def test_new_topic_practice_problems_solve_and_verify(problem_type):
    # A practice problem the app itself can't solve would strand the
    # student, so every draw must go through /solve verified.
    for _ in range(25):
        text = generate_practice_problem(problem_type)
        resp = client.post("/solve", json={"problem": text})
        assert resp.status_code == 200, (text, resp.json())
        assert resp.json()["verified"] is True, text
        assert resp.json()["answer"] not in ("∄", "∅"), text


def test_exponential_practice_keeps_numbers_small():
    for _ in range(30):
        text = generate_practice_problem("exponential_equation")
        assert all(int(n) <= 1000 for n in re.findall(r"\d+", text)), text

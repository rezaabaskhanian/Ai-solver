import pytest

from app.solver.parser import parse_problem
from app.solver.practice import generate_practice_problem


@pytest.mark.parametrize(
    "problem_type",
    ["linear_equation", "quadratic_equation", "expression", "arithmetic"],
)
def test_generated_problem_round_trips_to_requested_type(problem_type):
    for _ in range(10):
        text = generate_practice_problem(problem_type)
        parsed = parse_problem(text)
        assert parsed.problem_type == problem_type


def test_generated_problems_are_not_all_identical():
    seen = {generate_practice_problem("linear_equation") for _ in range(10)}
    assert len(seen) > 1

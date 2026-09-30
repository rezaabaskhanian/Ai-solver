import pytest

from app.solver.linear_system import solve_linear_system, verify_linear_system
from app.solver.parser import parse_problem


def _solve(raw):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "linear_system"
    steps, answer, solution = solve_linear_system(parsed.structure)
    assert verify_linear_system(parsed.structure, solution)
    return steps, answer


@pytest.mark.parametrize("raw, answer", [
    ("2x + y = 5, x - y = 1", "x = 2, y = 1"),
    ("3x + 2y = 12; 2x - 3y = -5", "x = 2, y = 3"),
    ("y = 2x + 1, 3x + y = 11", "x = 2, y = 5"),
    ("2a + 3b = 8, 3a - b = 1", "a = 1, b = 2"),
])
def test_unique_solution_shows_both_methods(raw, answer):
    steps, got = _solve(raw)
    assert got == answer
    operations = [s.operation for s in steps]
    assert "method_elimination" in operations and "method_substitution" in operations
    assert operations.index("method_elimination") < operations.index("method_substitution")


def test_multipliers_line_up_the_coefficients():
    steps, _ = _solve("3x + 2y = 12, 2x - 3y = -5")
    multiply = next(s for s in steps if s.operation == "elim_multiply")
    assert multiply.after == "9x + 6y = 36, 4x - 6y = -10"


def test_substitution_writes_the_expression_into_the_other_equation():
    steps, _ = _solve("2a + 3b = 8, 3a - b = 1")
    replace = next(s for s in steps if s.operation == "subst_replace")
    assert replace.after == "2a + 3(3a - 1) = 8"


def test_parallel_lines_have_no_solution():
    steps, answer = _solve("2x + 4y = 6, x + 2y = 5")
    assert answer == "∅"
    assert steps[-1].operation == "system_no_solution"


def test_same_line_has_infinitely_many_solutions():
    steps, _ = _solve("2x + 4y = 6, x + 2y = 3")
    assert steps[-1].operation == "system_infinite"


def test_sets_are_not_mistaken_for_a_system():
    assert parse_problem("A={1,2,3}, B={2,3,4}, A∪B").problem_type == "set_operation"

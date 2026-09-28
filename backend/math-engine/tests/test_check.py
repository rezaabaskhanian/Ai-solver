from app.solver.check import check_student_work
from app.solver.parser import parse_problem


def _check(problem, student_steps):
    parsed = parse_problem(problem)
    return check_student_work(
        parsed.problem_type, parsed.lhs, parsed.rhs, parsed.expr,
        parsed.symbol, student_steps,
    )


def test_linear_all_correct_steps_reaches_solved():
    outcome = _check("2x + 5 = 17", ["2x = 12", "x = 6"])
    assert outcome.status == "correct_and_solved"
    assert outcome.step_statuses == ["correct", "correct"]
    assert outcome.first_error_index is None
    assert outcome.next_step_hint is None
    assert outcome.correct_answer == "x = 6"


def test_linear_catches_first_wrong_step():
    # Second line has an arithmetic slip (should be 2x = 12).
    outcome = _check("2x + 5 = 17", ["2x = 12", "2x = 22", "x = 11"])
    assert outcome.status == "incorrect"
    assert outcome.step_statuses == ["correct", "incorrect"]
    assert outcome.first_error_index == 1
    assert outcome.next_step_hint is not None
    assert outcome.next_step_hint.operation == "divide"


def test_linear_partial_progress_gives_next_step_hint():
    outcome = _check("2x + 5 = 17", ["2x = 12"])
    assert outcome.status == "correct_so_far"
    assert outcome.step_statuses == ["correct"]
    assert outcome.first_error_index is None
    assert outcome.next_step_hint is not None
    assert outcome.next_step_hint.operation == "divide"


def test_linear_no_steps_yet_hints_first_move():
    outcome = _check("2x + 5 = 17", [])
    assert outcome.status == "correct_so_far"
    assert outcome.step_statuses == []
    assert outcome.next_step_hint is not None
    assert outcome.next_step_hint.operation == "subtract"


def test_linear_unparseable_step_is_incorrect():
    outcome = _check("2x + 5 = 17", ["this isn't math"])
    assert outcome.status == "incorrect"
    assert outcome.step_statuses == ["incorrect"]
    assert outcome.first_error_index == 0


def test_quadratic_reaches_factored_zero_product_form():
    outcome = _check("x^2 - 5x + 6 = 0", ["(x - 2)(x - 3) = 0"])
    assert outcome.status == "correct_and_solved"
    assert outcome.step_statuses == ["correct"]
    assert "x = 2" in outcome.correct_answer and "x = 3" in outcome.correct_answer


def test_quadratic_catches_wrong_factorization():
    outcome = _check("x^2 - 5x + 6 = 0", ["(x - 1)(x - 6) = 0"])
    assert outcome.status == "incorrect"
    assert outcome.first_error_index == 0


def test_expression_all_correct_reaches_solved():
    outcome = _check("2x + 3x - 5", ["5x - 5"])
    assert outcome.status == "correct_and_solved"
    assert outcome.correct_answer == "5x - 5"


def test_expression_catches_wrong_simplification():
    outcome = _check("2x + 3x - 5", ["6x - 5"])
    assert outcome.status == "incorrect"
    assert outcome.first_error_index == 0

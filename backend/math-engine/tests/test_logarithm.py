import pytest
import sympy
from fastapi.testclient import TestClient

from app.main import app
from app.solver.formatting import format_expr
from app.solver.functions import LogB
from app.solver.logarithm import (
    LogEquationUnsupported,
    solve_exponential_equation,
    solve_log_equation,
    verify_roots,
)
from app.solver.parser import parse_problem

client = TestClient(app)
x = sympy.Symbol("x")


def _solve(raw):
    parsed = parse_problem(raw)
    solver = solve_log_equation if parsed.problem_type == "log_equation" else solve_exponential_equation
    steps, roots = solver(parsed.lhs, parsed.rhs, parsed.symbol)
    return parsed, steps, roots


@pytest.mark.parametrize("raw,want", [
    ("log(x)", LogB(x, 10)),         # textbook convention: log = base 10
    ("log_2(x)", LogB(x, 2)),
    ("log2(x)", LogB(x, 2)),
    ("log₂(x)", LogB(x, 2)),
    ("log_{3}(x)", LogB(x, 3)),
    ("log(x, 5)", LogB(x, 5)),
    ("log2x", LogB(x, 2)),
    ("log x", LogB(x, 10)),
])
def test_log_notations(raw, want):
    assert parse_problem(raw).expr == want


def test_ln_stays_natural_log():
    assert parse_problem("ln(x)").expr == sympy.log(x)


def test_log_prints_with_subscript_base():
    assert format_expr(LogB(x, 2) + LogB(x - 2, 2)) == "log₂(x) + log₂(x - 2)"
    assert format_expr(LogB(x, 10)) == "log(x)"


def test_numeric_logs_evaluate_as_arithmetic():
    resp = client.post("/solve", json={"problem": "log_2(8) + log(100)"})
    assert resp.status_code == 200
    assert resp.json()["answer"] == "5"


@pytest.mark.parametrize("raw,problem_type", [
    ("log_2(x) + log_2(x-2) = 3", "log_equation"),
    ("2^(x+1) = 8", "exponential_equation"),
    ("2x + 5 = 17", "linear_equation"),
])
def test_equation_classification(raw, problem_type):
    assert parse_problem(raw).problem_type == problem_type


def test_log_sum_combines_converts_and_rejects_out_of_domain_root():
    parsed, steps, roots = _solve("log_2(x) + log_2(x-2) = 3")
    assert roots == [4]
    operations = [s.operation for s in steps]
    assert operations[:3] == ["domain", "combine_logs", "to_exponential"]
    assert steps[0].after == "x > 0, x - 2 > 0"
    assert steps[2].after == "x(x - 2) = 8"
    assert "reject_root" in operations  # x = -2
    assert operations[-1] == "check_domain"
    assert verify_roots(parsed.lhs, parsed.rhs, parsed.symbol, roots)


def test_equal_logs_drop_to_equal_arguments():
    _, steps, roots = _solve("log_3(x+1) = log_3(2x-5)")
    assert roots == [6]
    assert steps[1].operation == "drop_logs"
    assert steps[1].after == "x + 1 = 2x - 5"


def test_log_power_rule_with_a_numeric_log():
    _, steps, roots = _solve("2log(x) = log(9)")
    assert roots == [3]
    assert steps[1].after == "log(x^2) = log(9)"


def test_log_difference_multiplies_out_the_denominator():
    _, steps, roots = _solve("log_2(x) - log_2(x-1) = 1")
    assert roots == [2]
    assert "multiply" in [s.operation for s in steps]


def test_no_root_in_domain_gives_empty_answer():
    resp = client.post("/solve", json={"problem": "log_2(x) = log_2(-x-2)"})
    assert resp.status_code == 200
    assert resp.json()["answer"] == "∅"


def test_mixed_log_and_polynomial_is_unsupported():
    with pytest.raises(LogEquationUnsupported):
        _solve("log(x) + x = 3")


def test_different_bases_are_unsupported():
    with pytest.raises(LogEquationUnsupported):
        _solve("log(x) = log_2(x)")


@pytest.mark.parametrize("raw,root,rewritten", [
    ("2^(x+1) = 8", 2, "2^(x + 1) = 2^3"),
    ("4^x = 2^(x+3)", 3, "2^(2x) = 2^(x + 3)"),
    ("9^x = 27", sympy.Rational(3, 2), "3^(2x) = 3^3"),
    ("(1/2)^x = 8", -3, "2^(-x) = 2^3"),
])
def test_exponential_same_base(raw, root, rewritten):
    parsed, steps, roots = _solve(raw)
    assert roots == [root]
    assert steps[0].operation == "same_base"
    assert steps[0].after == rewritten
    assert steps[1].operation == "equate_exponents"
    assert verify_roots(parsed.lhs, parsed.rhs, parsed.symbol, roots)


def test_exponential_coefficient_is_divided_out_first():
    _, steps, roots = _solve("3*2^x = 24")
    assert roots == [3]
    assert steps[0].operation == "divide"


def test_exponential_without_common_base_takes_a_log():
    parsed, steps, roots = _solve("2^x = 5")
    assert roots == [LogB(5, 2)]
    assert steps[0].operation == "take_log"
    assert verify_roots(parsed.lhs, parsed.rhs, parsed.symbol, roots)


def test_api_log_equation_in_persian():
    resp = client.post("/solve", json={"problem": "log₂(x) + log₂(x-2) = 3", "lang": "fa"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "log_equation"
    assert body["answer"] == "x = 4"
    assert body["verified"] is True
    assert body["problem"] == "log₂(x) + log₂(x - 2) = 3"

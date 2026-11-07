import pytest
import sympy
from fastapi.testclient import TestClient

from app.main import app
from app.solver.parser import parse_problem
from app.solver.rational import solve_rational_equation

client = TestClient(app)
x = sympy.Symbol("x")


def _solve(raw):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "rational_equation"
    steps, roots = solve_rational_equation(parsed.lhs, parsed.rhs, parsed.symbol)
    return steps, roots


@pytest.mark.parametrize("raw,want", [
    ("x/(x-1) = 2", [2]),
    ("(x^2-1)/(x-1) = 0", [-1]),                 # x = 1 makes the denominator zero
    ("(1 + 1/x)/(1 - 1/x) = 3", [2]),            # nested fraction: x ≠ 0, x ≠ 1
    ("1/x = 0", []),
    ("x/(x-3) = 3/(x-3)", []),                   # x = 3 is the only candidate
])
def test_rational_roots(raw, want):
    _, roots = _solve(raw)
    assert roots == [sympy.Integer(r) for r in want]


def test_domain_step_lists_excluded_values():
    steps, _ = _solve("(1 + 1/x)/(1 - 1/x) = 3")
    assert steps[0].operation == "domain"
    assert steps[0].after == "x ≠ 0, x ≠ 1"


def test_rejected_root_gets_its_own_step():
    steps, _ = _solve("(x^2-1)/(x-1) = 0")
    assert any(s.operation == "reject_root" for s in steps)


def test_polynomial_equations_are_not_rational():
    assert parse_problem("x/2 + 1 = 3").problem_type == "linear_equation"


def test_api_solves_fraction_sum_equation():
    resp = client.post("/solve", json={"problem": "(x^2+3x)/(3x-3) = 2/(x-1)", "lang": "fa"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["type"] == "rational_equation"
    assert body["verified"] is True

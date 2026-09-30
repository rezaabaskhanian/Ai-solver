import pytest

from app.solver.cubic import CubicUnsupported, solve_cubic
from app.solver.formatting import format_roots
from app.solver.parser import parse_problem
from app.solver.verify import verify_equation_root


def _solve(raw):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "cubic_equation"
    steps, roots = solve_cubic(parsed.lhs, parsed.rhs, parsed.symbol)
    for r in roots:
        assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r)
    return parsed, steps, roots


@pytest.mark.parametrize("raw, answer, operation", [
    ("x^3 - 4x = 0", "x = -2 or x = 0 or x = 2", "common_factor"),
    ("x^3 - x^2 = 0", "x = 0 or x = 1", "common_factor"),
    ("x^3 - 6x^2 + 11x - 6 = 0", "x = 1 or x = 2 or x = 3", "polynomial_division"),
    ("2x^3 - 3x^2 - 3x + 2 = 0", "x = -1 or x = 1/2 or x = 2", "polynomial_division"),
    ("x^3 - 1 = 0", "x = 1", "cube_root"),
    ("x^3 - 2 = 0", "x = ∛2", "cube_root"),
    ("2x^3 + 16 = 0", "x = -2", "cube_root"),
])
def test_textbook_methods(raw, answer, operation):
    parsed, steps, roots = _solve(raw)
    assert format_roots(parsed.symbol, roots) == answer
    assert operation in [s.operation for s in steps]


def test_fractional_root_divides_as_qx_minus_p():
    _, steps, _ = _solve("2x^3 - 3x^2 - 3x + 2 = 0")
    division = next(s for s in steps if s.operation == "polynomial_division")
    assert division.after == "(2x - 1)(x^2 - x - 2) = 0"


def test_quadratic_factor_without_real_roots_keeps_only_the_rational_root():
    _, steps, roots = _solve("x^3 + x^2 + x - 3 = 0")
    assert roots == [1]
    assert "no_real_roots" in [s.operation for s in steps]


def test_no_rational_root_is_unsupported():
    parsed = parse_problem("x^3 + x + 1 = 0")
    with pytest.raises(CubicUnsupported):
        solve_cubic(parsed.lhs, parsed.rhs, parsed.symbol)

import pytest

from app.solver.biquadratic import solve_biquadratic
from app.solver.formatting import format_roots
from app.solver.parser import ParseError, parse_problem
from app.solver.verify import verify_equation_root


@pytest.mark.parametrize("raw, answer", [
    ("x^4 - 5x^2 + 4 = 0", "x = -2 or x = -1 or x = 1 or x = 2"),
    ("x^4 - 3x^2 - 4 = 0", "x = -2 or x = 2"),          # t = -1 is dropped
    ("x^4 = 16", "x = -2 or x = 2"),
    ("2x^4 - 8x^2 = 0", "x = -2 or x = 0 or x = 2"),
    ("x^4 + x^2 + 1 = 0", "∅"),                          # Δ < 0 in t
    ("x^4 - 4x^2 + 1 = 0",
     "x = -sqrt(2 + sqrt(3)) or x = -sqrt(2 - sqrt(3)) or x = sqrt(2 - sqrt(3)) or x = sqrt(2 + sqrt(3))"),
])
def test_biquadratic(raw, answer):
    parsed = parse_problem(raw)
    assert parsed.problem_type == "biquadratic_equation"
    steps, roots = solve_biquadratic(parsed.lhs, parsed.rhs, parsed.symbol)
    assert format_roots(parsed.symbol, roots) == answer
    assert "substitute_t" in [s.operation for s in steps]
    for r in roots:
        assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r)


def test_general_quartic_is_still_unsupported():
    with pytest.raises(ParseError):
        parse_problem("x^4 + x^3 = 1")

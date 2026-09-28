from app.solver.formatting import format_expr
from app.solver.parser import parse_problem
from app.solver.quadratic import solve_quadratic
from app.solver.verify import verify_equation_root


def _solve(raw):
    parsed = parse_problem(raw)
    steps, roots = solve_quadratic(parsed.lhs, parsed.rhs, parsed.symbol)
    return parsed, steps, roots


def test_factorable_quadratic_uses_factor_path():
    parsed, steps, roots = _solve("x^2 - 5x + 6 = 0")
    root_strs = sorted(format_expr(r) for r in roots)
    assert root_strs == ["2", "3"]
    assert any(s.operation == "factor" for s in steps)
    assert any(s.operation == "zero_product_property" for s in steps)
    for r in roots:
        assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r)


def test_non_zero_rhs_gets_move_term_step():
    parsed, steps, roots = _solve("x^2 - 5x + 8 = 2")
    assert steps[0].operation == "move_term"
    for r in roots:
        assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r)


def test_irrational_roots_use_quadratic_formula_path():
    parsed, steps, roots = _solve("x^2 - 2 = 0")
    operations = [s.operation for s in steps]
    assert "apply_quadratic_formula" in operations
    assert "compute_discriminant" in operations
    assert "compute_roots" in operations
    assert len(roots) == 2
    for r in roots:
        assert verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r)


def test_perfect_square_has_repeated_root():
    parsed, steps, roots = _solve("x^2 - 4x + 4 = 0")
    assert all(format_expr(r) == "2" for r in roots)

import sympy

from app.solver.verify import verify_equation_root

x = sympy.Symbol("x")


def test_correct_root_verifies_true():
    lhs = 2 * x + 5
    rhs = sympy.Integer(17)
    assert verify_equation_root(lhs, rhs, x, sympy.Integer(6)) is True


def test_incorrect_root_verifies_false():
    lhs = 2 * x + 5
    rhs = sympy.Integer(17)
    assert verify_equation_root(lhs, rhs, x, sympy.Integer(5)) is False


def test_verifies_against_original_unexpanded_equation():
    lhs = 3 * (x + 2)
    rhs = sympy.Integer(15)
    assert verify_equation_root(lhs, rhs, x, sympy.Integer(3)) is True


def test_quadratic_root_verifies():
    lhs = x**2 - 5 * x + 6
    rhs = sympy.Integer(0)
    assert verify_equation_root(lhs, rhs, x, sympy.Integer(2)) is True
    assert verify_equation_root(lhs, rhs, x, sympy.Integer(3)) is True
    assert verify_equation_root(lhs, rhs, x, sympy.Integer(4)) is False

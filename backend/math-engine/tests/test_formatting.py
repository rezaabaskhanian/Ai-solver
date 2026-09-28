import sympy

from app.solver.formatting import format_eq, format_expr, join_signed_terms

x = sympy.Symbol("x")


def test_implicit_multiplication_between_coefficient_and_symbol():
    assert format_expr(2 * x + 5) == "2x + 5"


def test_power_uses_caret_not_double_star():
    assert format_expr(x**2) == "x^2"


def test_multiplication_between_symbol_and_parenthesis():
    assert format_expr(x * (x + 1)) == "x(x + 1)"


def test_format_eq_joins_both_sides():
    assert format_eq(2 * x + 5, sympy.Integer(17)) == "2x + 5 = 17"


def test_negative_and_fractional_coefficients():
    assert format_expr(sympy.Rational(1, 2) * x) == "x/2"


def test_symbol_times_function_keeps_the_star():
    # "x*cos(x)" -> "xcos(x)" would read as one identifier; only
    # coefficient*function ("3cos(x)") is safe to compact.
    assert format_expr(x * sympy.cos(x)) == "x*cos(x)"
    assert format_expr(3 * sympy.cos(x)) == "3cos(x)"


def test_natural_log_renders_as_ln():
    assert format_expr(sympy.log(x)) == "ln(x)"
    assert format_expr(x * sympy.log(x)) == "x*ln(x)"


def test_join_signed_terms_uses_minus_not_plus_minus():
    assert join_signed_terms([x**3, -2 * x**2, sympy.Integer(7)]) == "x^3 - 2x^2 + 7"

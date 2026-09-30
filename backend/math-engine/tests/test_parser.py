import pytest

from app.solver.parser import ParseError, parse_problem


def test_linear_equation_is_detected():
    parsed = parse_problem("2x + 5 = 17")
    assert parsed.problem_type == "linear_equation"
    assert str(parsed.symbol) == "x"
    assert parsed.confidence == 0.99


def test_quadratic_equation_is_detected():
    parsed = parse_problem("x^2 - 5x + 6 = 0")
    assert parsed.problem_type == "quadratic_equation"


def test_unicode_superscript_lowers_confidence():
    parsed = parse_problem("x² - 5x + 6 = 0")
    assert parsed.problem_type == "quadratic_equation"
    assert parsed.confidence == 0.85


def test_bare_expression_is_expression_type():
    parsed = parse_problem("2*(3 + 4)")
    assert parsed.problem_type == "arithmetic"


def test_expression_with_symbol_is_expression_type():
    parsed = parse_problem("2x + 3x")
    assert parsed.problem_type == "expression"


def test_arithmetic_equation_no_symbols():
    parsed = parse_problem("2 + 2 = 4")
    assert parsed.problem_type == "arithmetic_equation"


def test_empty_input_raises_parse_error():
    with pytest.raises(ParseError):
        parse_problem("   ")


def test_two_equals_signs_raises_parse_error():
    with pytest.raises(ParseError):
        parse_problem("x = y = 3")


def test_multiple_variables_raises_parse_error():
    with pytest.raises(ParseError):
        parse_problem("x + y = 3")


def test_cubic_equation_raises_parse_error():
    with pytest.raises(ParseError):
        parse_problem("x^3 - 1 = 0")


def test_unparseable_side_raises_parse_error():
    with pytest.raises(ParseError):
        parse_problem("@@@ = 5")


def test_trigonometric_equation_raises_clean_parse_error():
    # Poly() can't handle non-polynomial terms like sin(x) — this must
    # surface as a ParseError, not an unhandled PolynomialError.
    with pytest.raises(ParseError):
        parse_problem("sin(x) = 1/2")


def test_d_dx_notation_is_derivative():
    parsed = parse_problem("d/dx(x^2 + 3x)")
    assert parsed.problem_type == "derivative"
    assert str(parsed.symbol) == "x"


def test_diff_call_notation_is_derivative():
    parsed = parse_problem("diff(x^2, x)")
    assert parsed.problem_type == "derivative"


def test_derivative_notation_is_derivative():
    parsed = parse_problem("derivative(sin(x), x)")
    assert parsed.problem_type == "derivative"


def test_integral_sign_notation_is_integral():
    parsed = parse_problem("∫x^2 dx")
    assert parsed.problem_type == "integral"
    assert str(parsed.symbol) == "x"


def test_integrate_call_notation_is_integral():
    parsed = parse_problem("integrate(x^2, x)")
    assert parsed.problem_type == "integral"


def test_trig_expression_is_detected():
    parsed = parse_problem("sin(x)^2 + cos(x)^2")
    assert parsed.problem_type == "trig_expression"


def test_exact_value_trig_keeps_the_trig_function():
    # sympy resolves sin(pi/6) to 1/2 at parse time; the unevaluated
    # parse is kept (trig_raw) so the problem still reads sin(π/6) and
    # trig.py can show the exact-value step.
    parsed = parse_problem("sin(pi/6)")
    assert parsed.problem_type == "trig_expression"
    assert parsed.display == "sin(π/6)"
    assert parsed.trig_raw is not None


def test_degree_angle_is_displayed_in_degrees():
    parsed = parse_problem("2sin(30°) + cos(0°)")
    assert parsed.problem_type == "trig_expression"
    assert parsed.display == "2sin(30°) + cos(0°)"


def test_ocr_digit_confusion_is_corrected_with_low_confidence():
    # PRD section 9's own example: OCR misreads a '5' as the letter 'S'.
    parsed = parse_problem("2x + S = 17")
    assert parsed.problem_type == "linear_equation"
    assert parsed.display == "2x + 5 = 17"
    assert parsed.confidence == 0.6


def test_ocr_correction_tries_multiple_confusable_letters():
    # 'S' -> 5 and 'O' -> 0 together turn a two-unknown mess into a valid
    # single-variable quadratic; a partial fix (only one letter swapped)
    # still leaves two free symbols and fails, so only the full correction
    # can succeed here -- no ambiguity to worry about.
    parsed = parse_problem("x^2 - S = O")
    assert parsed.problem_type == "quadratic_equation"
    assert parsed.confidence == 0.6


def test_legitimate_single_variable_use_of_confusable_letter_is_untouched():
    # 'S' is in the OCR-confusable table, but this already parses fine as a
    # normal single-variable equation on the first try, so the guessing
    # fallback must never kick in and must never lower its confidence.
    parsed = parse_problem("S + 5 = 17")
    assert parsed.problem_type == "linear_equation"
    assert str(parsed.symbol) == "S"
    assert parsed.confidence == 0.99


def test_ambiguous_ocr_correction_is_not_guessed():
    # Both letters are independently "fixable" into a valid equation, but
    # they disagree on what the corrected problem actually is -- guessing
    # here would be worse than surfacing the original error.
    with pytest.raises(ParseError):
        parse_problem("S + O = 17")


def test_ocr_correction_does_not_mask_unrelated_parse_errors():
    # No confusable letters at all -- the unsupported-degree error must
    # still surface exactly as before the correction fallback was added.
    with pytest.raises(ParseError):
        parse_problem("x^5 - 1 = 0")

from app.solver.normalize import normalize_input


def test_ascii_input_is_unchanged():
    assert normalize_input("2x + 5 = 17") == "2x + 5 = 17"


def test_unicode_superscript_becomes_caret():
    assert normalize_input("x² - 5x + 6 = 0") == "x^2 - 5x + 6 = 0"


def test_multi_digit_superscript_run():
    assert normalize_input("x¹²") == "x^12"


def test_multiplication_and_division_symbols():
    assert normalize_input("3×(x + 2) = 15") == "3*(x + 2) = 15"
    assert normalize_input("x ÷ 3 + 4 = 9") == "x / 3 + 4 = 9"


def test_unicode_minus_sign():
    assert normalize_input("5 − 2") == "5 - 2"


def test_collapses_extra_whitespace():
    assert normalize_input("  2x   +   5  ") == "2x + 5"


def test_persian_digits_become_ascii():
    assert normalize_input("۳x+۵=۱۰") == "3x+5=10"


def test_arabic_indic_digits_and_decimal_separator():
    assert normalize_input("٢٫٥x") == "2.5x"


def test_sqrt_symbol_with_parentheses():
    assert normalize_input("√(x+1)") == "sqrt(x+1)"


def test_bare_sqrt_symbol():
    assert normalize_input("√9+√x") == "sqrt(9)+sqrt(x)"


def test_degrees_become_radians():
    assert normalize_input("sin(30°)") == "sin((30*pi/180))"
    assert normalize_input("cos(22.5 °)") == "cos((22.5*pi/180))"


def test_degree_sign_lookalikes_and_persian_digits():
    # º (ordinal indicator) and ˚ (ring above) are what some phone
    # keyboards offer for the degree sign.
    assert normalize_input("sin(30º)") == "sin((30*pi/180))"
    assert normalize_input("tan(45˚)") == "tan((45*pi/180))"
    assert normalize_input("sin(۳۰°)") == "sin((30*pi/180))"

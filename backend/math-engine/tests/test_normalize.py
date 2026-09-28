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

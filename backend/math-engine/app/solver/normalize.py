import re

_SUPERSCRIPT_MAP = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
}
_SUPERSCRIPT_RUN = re.compile(r"[⁰¹²³⁴⁵⁶⁷⁸⁹]+")

_SYMBOL_REPLACEMENTS = {
    "×": "*",
    "÷": "/",
    "−": "-",  # unicode minus sign (U+2212)
    " ": " ",  # non-breaking space
    "π": "pi",  # sympy's own constant name -- parses directly as-is
    "٫": ".",  # Persian/Arabic decimal separator
    "·": "*",
    "،": ",",  # Persian comma, e.g. A={۱،۲،۳}
    "→": "->",  # limits: lim(x→2)
    "∞": "oo",  # sympy's infinity
    # Primes for y' / f''(x) — phone keyboards' smart quotes and the math
    # prime characters all mean the plain apostrophe parser.py reads.
    "’": "'",
    "′": "'",
    "″": "''",
}

# Persian (۰-۹) and Arabic-Indic (٠-٩) digits: a Persian phone keyboard
# types these by default, so "۳x+۵=۱۰" must mean the same as "3x+5=10".
_DIGIT_TRANSLATION = str.maketrans(
    "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
    "01234567890123456789",
)

# Angles in degrees: "sin(30°)" -> "sin((30*pi/180))", so sympy gets the
# radian value it expects and simplifies it exactly (pi/6). Without this
# "°" reached sympy as an unknown symbol and sin(30°) came back unsolved.
# Phone keyboards also offer º (ordinal indicator) and ˚ (ring above)
# for the same sign.
_DEGREES = re.compile(r"([0-9]+(?:\.[0-9]+)?)\s*[°º˚]")

# "√(...)" -> "sqrt(...)", and the bare "√9" / "√x" forms keyboards and
# the app's own math key row produce -> "sqrt(9)" / "sqrt(x)".
_SQRT_PAREN = re.compile(r"√\s*\(")
_SQRT_BARE = re.compile(r"√\s*([0-9]+(?:\.[0-9]+)?|[A-Za-z])")

# A log's base as the engine prints it (log₂) or as typed from a LaTeX
# habit (log_{2}) -> the "log_2" form parser.py reads.
_SUBSCRIPT_DIGITS = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")
_LOG_SUBSCRIPT_BASE = re.compile(r"log([₀₁₂₃₄₅₆₇₈₉]+)")
_LOG_BRACED_BASE = re.compile(r"log_\{\s*([0-9]+)\s*\}")


def normalize_input(raw: str) -> str:
    """Turn typed math input into a string sympy can parse.

    Handles Persian/Arabic digits (۳ -> 3), unicode superscripts
    (x² -> x^2), unicode math symbols (× ÷ − √ → ∞), log bases (log₂ ->
    log_2), and stray whitespace. Guessed correction of OCR-confusable
    letters (e.g. 'S' -> '5') is *not* done here, since it should only be
    attempted after a straight parse has failed — see
    `parser._try_ocr_correction`.
    """
    text = raw.strip().translate(_DIGIT_TRANSLATION)

    for old, new in _SYMBOL_REPLACEMENTS.items():
        text = text.replace(old, new)

    text = _LOG_SUBSCRIPT_BASE.sub(lambda m: "log_" + m.group(1).translate(_SUBSCRIPT_DIGITS), text)
    text = _LOG_BRACED_BASE.sub(r"log_\1", text)

    text = _DEGREES.sub(r"(\1*pi/180)", text)

    text = _SQRT_PAREN.sub("sqrt(", text)
    text = _SQRT_BARE.sub(r"sqrt(\1)", text)

    def _sup_to_caret(match: "re.Match[str]") -> str:
        digits = "".join(_SUPERSCRIPT_MAP[ch] for ch in match.group(0))
        return f"^{digits}"

    text = _SUPERSCRIPT_RUN.sub(_sup_to_caret, text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

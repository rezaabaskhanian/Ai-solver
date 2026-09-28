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
}


def normalize_input(raw: str) -> str:
    """Turn typed math input into a string sympy can parse.

    Handles unicode superscripts (x² -> x^2), unicode math symbols
    (× ÷ −), and stray whitespace. Guessed correction of OCR-confusable
    letters (e.g. 'S' -> '5') is *not* done here, since it should only be
    attempted after a straight parse has failed — see
    `parser._try_ocr_correction`.
    """
    text = raw.strip()

    for old, new in _SYMBOL_REPLACEMENTS.items():
        text = text.replace(old, new)

    def _sup_to_caret(match: "re.Match[str]") -> str:
        digits = "".join(_SUPERSCRIPT_MAP[ch] for ch in match.group(0))
        return f"^{digits}"

    text = _SUPERSCRIPT_RUN.sub(_sup_to_caret, text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

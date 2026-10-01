import string

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.solver.messages import MESSAGES, SUPPORTED_LANGS, normalize_lang, render

client = TestClient(app)

LRI, PDI = "⁦", "⁩"


def _placeholders(template: str) -> set[str]:
    return {name for _, name, _, _ in string.Formatter().parse(template) if name}


@pytest.mark.parametrize("key", sorted(MESSAGES))
def test_every_message_has_every_language(key):
    for lang in SUPPORTED_LANGS:
        assert MESSAGES[key].get(lang), f"{key!r} is missing {lang!r}"


@pytest.mark.parametrize("key", sorted(MESSAGES))
def test_every_message_renders_in_every_language(key):
    # Every param any template of this key needs, so a typo'd placeholder
    # in one language fails here instead of 500-ing in production.
    params = {"value": "5", "symbol": "x", "func": "sin(x)", "point": "2",
              "base": "2", "root": "x = -2", "left": "A", "right": "B", "set": "A",
              "n": "2", "count": "4", "quantity": "n(A ∪ B)", "start": "A", "end": "B",
              "k": "3", "shape": "circle", "p": "6", "d": "3", "lower": "0", "upper": "1", "factor": "x",
              "m1": "2", "m2": "3", "var": "y", "known": "x", "which": "1", "other": "x", "m": "3",
              "a": "2", "b": "-5", "c": "6", "q": "-3", "ac": "12", "ac_eq": "2 × 6 = 12",
              "prod": "(-2) × (-3) = 6", "sum": "(-2) + (-3) = -5", "factored": "(x - 2)(x - 3)",
              "split": "2x^2 - 2x - 3x + 6 = 0", "cancel": "5 - 5 = 0", "term": "-5", "coeff": "1/3",
              "eq1": "x - 2 = 0", "eq2": "x - 3 = 0", "coeffs": "a = 1, b = -5, c = 6",
              "calc": "Δ = 25 - 24 = 1", "rule": "(sin(x))' = cos(x)", "inner": "(2x)' = 2",
              "u": "x", "v": "sin(x)", "candidates": "±1, ±2", "quotient": "x^2 + 1", "conj": "sqrt(x) + 2"}
    for lang in SUPPORTED_LANGS:
        text = render(key, lang, **params)
        assert text and "{" not in text


def test_english_text_is_unchanged():
    assert render("subtract_both_sides", "en", value="5") == "Subtract 5 from both sides."
    assert render("integral_log_rule", "en", symbol="x") == (
        "Integral of 1/x is ln|x|, because the derivative of ln|x| is 1/x (the absolute value lets x be negative too)."
    )


def test_persian_isolates_math_so_rtl_cannot_reorder_it():
    text = render("add_both_sides", "fa", value="-3")
    assert text == f"{LRI}-3{PDI} را به هر دو طرف اضافه می‌کنیم."


@pytest.mark.parametrize("raw,want", [
    ("fa", "fa"), ("FA", "fa"), ("fa-IR", "fa"), ("en-US", "en"),
    ("de", "en"), ("", "en"), (None, "en"),
])
def test_normalize_lang(raw, want):
    assert normalize_lang(raw) == want


def test_solve_defaults_to_english():
    resp = client.post("/solve", json={"problem": "2x + 5 = 17"})
    assert resp.status_code == 200
    assert resp.json()["steps"][0]["explanation"] == (
        "To get x on its own, remove the number 5 from the left: subtract 5 from both sides "
        "(5 - 5 = 0). Whatever we do to one side we must do to the other."
    )


def test_solve_in_persian():
    resp = client.post("/solve", json={"problem": "2x + 5 = 17", "lang": "fa"})
    assert resp.status_code == 200
    steps = resp.json()["steps"]
    assert steps[0]["explanation"] == (
        f"برای این‌که {LRI}x{PDI} تنها بماند، عدد {LRI}5{PDI} را از سمت چپ حذف می‌کنیم: "
        f"از هر دو طرف {LRI}5{PDI} کم می‌کنیم ({LRI}5 - 5 = 0{PDI}). "
        "هر کاری با یک طرف تساوی بکنیم، باید با طرف دیگر هم بکنیم."
    )
    assert steps[1]["explanation"] == (
        f"{LRI}x{PDI} در {LRI}2{PDI} ضرب شده است؛ عکسِ ضرب، تقسیم است، "
        f"پس هر دو طرف را بر {LRI}2{PDI} تقسیم می‌کنیم ({LRI}2x ÷ 2 = x{PDI})."
    )
    # Only the explanation is localized — the math itself never is.
    assert steps[0]["before"] == "2x + 5 = 17"


def test_every_problem_type_solves_in_persian_without_english_left():
    # Between them these hit every message key: expand/add/subtract/divide/
    # multiply, factoring and the formula path, simplify, and each named
    # derivative/integral rule.
    for problem in ["3(x + 2) = 15", "x/3 + 4 = 9", "5 - x = 2x - 4",
                    "x^2 - 5x + 6 = 0", "x^2 + x - 1 = 0", "2*(3 + 4)",
                    "d/dx(x^3 + sin(x) + 5 + exp(x))",
                    "integrate(1/x + x^2 + 3 + cos(x) + exp(x), x)"]:
        resp = client.post("/solve", json={"problem": problem, "lang": "fa"})
        assert resp.status_code == 200, (problem, resp.json())
        for step in resp.json()["steps"]:
            words = step["explanation"].replace(LRI, " ").replace(PDI, " ")
            assert not any(w in words for w in ("the ", "both sides", "Apply")), step


def test_check_hint_in_persian():
    resp = client.post("/check", json={
        "problem": "2x + 5 = 17", "student_steps": ["2x = 12"], "lang": "fa",
    })
    assert resp.status_code == 200
    hint = resp.json()["next_step_hint"]
    assert hint is not None
    assert "تقسیم" in hint["explanation"]

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
              "k": "3", "shape": "circle", "p": "6", "d": "3"}
    for lang in SUPPORTED_LANGS:
        text = render(key, lang, **params)
        assert text and "{" not in text


def test_english_text_is_unchanged():
    assert render("subtract_both_sides", "en", value="5") == "Subtract 5 from both sides."
    assert render("integral_log_rule", "en", symbol="x") == "Integral of 1/x is ln|x|."


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
    assert resp.json()["steps"][0]["explanation"] == "Subtract 5 from both sides."


def test_solve_in_persian():
    resp = client.post("/solve", json={"problem": "2x + 5 = 17", "lang": "fa"})
    assert resp.status_code == 200
    steps = resp.json()["steps"]
    assert steps[0]["explanation"] == f"{LRI}5{PDI} را از هر دو طرف کم می‌کنیم."
    assert steps[1]["explanation"] == f"هر دو طرف را بر {LRI}2{PDI} تقسیم می‌کنیم."
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

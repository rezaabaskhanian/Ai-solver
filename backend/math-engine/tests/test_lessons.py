"""Every worked example in the app's «درسنامه» (mobile/.../content/
lessons.ts) must be a problem the engine solves, with the same final
answer the lesson shows — otherwise the lesson and the "try it" button
would disagree.

Skipped where the mobile source isn't present (e.g. inside the
math-engine Docker image).
"""
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

LESSONS_TS = (
    Path(__file__).resolve().parents[3] / "mobile" / "MathMotion" / "src" / "content" / "lessons.ts"
)

pytestmark = pytest.mark.skipif(not LESSONS_TS.exists(), reason="mobile app source not present")

client = TestClient(app)


def _examples() -> list[tuple[str, str]]:
    source = LESSONS_TS.read_text(encoding="utf-8")
    # problem: '...' ... answer: '...' — within one example object.
    return re.findall(r"problem: '([^']*)',.*?answer: '([^']*)'", source, re.S)


def test_lessons_have_examples():
    assert len(_examples()) >= 12


@pytest.mark.parametrize("problem,answer", _examples() if LESSONS_TS.exists() else [])
def test_worked_example_matches_the_engine(problem, answer):
    resp = client.post("/solve", json={"problem": problem, "lang": "fa"})
    assert resp.status_code == 200, resp.json()
    body = resp.json()
    assert body["verified"] is True
    assert body["answer"] == answer

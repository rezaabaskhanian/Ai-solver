"""The mobile app's «مباحث درسی» (topics) screen sends its example
problems straight into the normal Solve flow, so every one must parse and
solve here. Reads them from the app's source so this test fails the moment
someone adds an example the engine can't handle.

Skipped where the mobile source isn't present (e.g. inside the
math-engine Docker image, which only contains this service).
"""
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.solver.practice import _SUPPORTED_PRACTICE_TYPES

TOPICS_TS = (
    Path(__file__).resolve().parents[3] / "mobile" / "MathMotion" / "src" / "content" / "topics.ts"
)

pytestmark = pytest.mark.skipif(not TOPICS_TS.exists(), reason="mobile app source not present")

client = TestClient(app)


def _topics_source() -> str:
    return TOPICS_TS.read_text(encoding="utf-8")


def _examples() -> list[str]:
    examples = []
    for block in re.findall(r"examples:\s*\[(.*?)\]", _topics_source(), re.S):
        examples += re.findall(r"'((?:[^'\\]|\\.)*)'", block)
    return examples


def _practice_types() -> list[str]:
    return re.findall(r"practiceType:\s*'([^']+)'", _topics_source())


def test_topics_file_has_examples():
    assert len(_examples()) >= 9


@pytest.mark.parametrize("problem", _examples() if TOPICS_TS.exists() else [])
def test_topic_example_solves(problem):
    resp = client.post("/solve", json={"problem": problem, "lang": "fa"})
    assert resp.status_code == 200, resp.json()
    assert resp.json()["verified"] is True


@pytest.mark.parametrize("problem_type", _practice_types() if TOPICS_TS.exists() else [])
def test_topic_practice_type_is_generatable(problem_type):
    assert problem_type in _SUPPORTED_PRACTICE_TYPES

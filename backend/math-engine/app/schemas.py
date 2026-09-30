from typing import Optional

from pydantic import BaseModel


class ParseRequest(BaseModel):
    input: str


class ParseResponse(BaseModel):
    problem: str
    type: str
    confidence: float


class SolveRequest(BaseModel):
    problem: str
    # Language of step explanations ("en" | "fa"); anything else → "en".
    lang: str = "en"


class Step(BaseModel):
    id: int
    before: str
    after: str
    operation: str
    value: Optional[str] = None
    target: Optional[str] = None
    explanation: str


class SolveResponse(BaseModel):
    problem: str
    answer: str
    verified: bool
    type: str
    steps: list[Step]
    # "function_plot" only: the sampled curve and its marked points
    # (solver/plot.py) for the app to draw.
    plot: Optional[dict] = None


class ErrorResponse(BaseModel):
    error: str
    message: str


class CheckRequest(BaseModel):
    problem: str
    student_steps: list[str]
    lang: str = "en"


class CheckResponse(BaseModel):
    status: str
    step_statuses: list[str]
    first_error_index: Optional[int] = None
    next_step_hint: Optional[Step] = None
    correct_answer: str


class PracticeRequest(BaseModel):
    type: str


class PracticeResponse(BaseModel):
    problem: str
    type: str

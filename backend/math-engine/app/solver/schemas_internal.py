from dataclasses import dataclass
from typing import Optional


@dataclass
class StepData:
    id: int
    before: str
    after: str
    operation: str
    value: Optional[str]
    target: Optional[str]
    explanation: str

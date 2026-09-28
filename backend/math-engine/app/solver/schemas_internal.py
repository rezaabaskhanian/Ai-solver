from dataclasses import dataclass, field
from typing import Optional

from .messages import render


@dataclass
class StepData:
    id: int
    before: str
    after: str
    operation: str
    value: Optional[str]
    target: Optional[str]
    # Always English — see messages.explained(); use explanation_in() for
    # the text shown to the user.
    explanation: str
    message_key: Optional[str] = None
    message_params: dict[str, str] = field(default_factory=dict)

    def explanation_in(self, lang: str) -> str:
        if self.message_key is None:
            return self.explanation
        return render(self.message_key, lang, **self.message_params)

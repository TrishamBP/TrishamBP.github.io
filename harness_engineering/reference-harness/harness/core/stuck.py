"""Cheap, deterministic stuck detection.

Paper observations (§6.2, Recommendation 18): Gemini CLI hashes calls with
SHA-256 (five identical tool calls abort) and adds an LLM self-check only
after 30 turns; Hermes hashes tool name + sorted-JSON args, warns after two
identical failures and ships the hard stop disabled; OpenCode routes three
identical calls to a permission ask. "Do not over-engineer stuck detection -
but do ship the cheap caps, which cost a dozen lines."
"""

from __future__ import annotations

import hashlib
from collections import deque
from dataclasses import dataclass, field

from ..llm.provider import ToolCall


@dataclass
class StuckDetector:
    """Hard stop counts every identical call (Gemini CLI: five identical calls
    abort); warnings count identical calls that *failed* (Hermes warns after two
    identical failures) - retrying once after an error is legitimate."""

    warn_at: int = 2                 # prior identical failures before warning
    halt_at: int | None = 5          # identical calls before halting; None = warn only
    window: int = 20
    _recent: deque = field(init=False, repr=False)
    _failed: deque = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._recent = deque(maxlen=self.window)
        self._failed = deque(maxlen=self.window)

    @staticmethod
    def _hash(c: ToolCall) -> str:
        return hashlib.sha256(c.signature().encode()).hexdigest()

    def observe(self, calls: list[ToolCall]) -> tuple[bool, dict[str, str]]:
        """Call before executing a batch. Returns (halt, {call_id: warning})."""
        warnings: dict[str, str] = {}
        halt = False
        for c in calls:
            h = self._hash(c)
            self._recent.append(h)
            if self.halt_at is not None and self._recent.count(h) >= self.halt_at:
                halt = True
            failures = self._failed.count(h)
            if failures >= self.warn_at:
                warnings[c.id] = (f"<stuck-warning>This exact call already failed {failures} times. "
                                  "Change approach instead of repeating it.</stuck-warning>")
        return halt, warnings

    def record(self, call: ToolCall, is_error: bool) -> None:
        if is_error:
            self._failed.append(self._hash(call))

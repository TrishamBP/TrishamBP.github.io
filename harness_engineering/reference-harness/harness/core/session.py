"""Session = event log + runtime state + projection to LLM messages.

The projection is the important idea. The model never sees the log directly;
it sees `messages()`, a deterministic function of the active branch. The
latest COMPACTION event on the branch replaces everything before it with a
summary (OpenHands also event-sources its condensations, §9.4).
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from .events import EventKind, EventLog
from .state import IterationBudget, SessionState


class Session:
    def __init__(
        self,
        workspace: Path,
        log: EventLog | None = None,
        session_id: str | None = None,
        parent_id: str | None = None,
        budget: IterationBudget | None = None,
    ):
        self.id = session_id or uuid.uuid4().hex[:12]
        self.parent_id = parent_id  # set for sub-agent sessions
        self.workspace = workspace.resolve()
        self.log = log or EventLog()
        self.state = SessionState()
        self.budget = budget or IterationBudget()

    # ------------------------------------------------------------------
    def messages(self) -> list[dict[str, Any]]:
        """Project the active branch into provider-neutral chat messages."""
        path = self.log.active_path()
        start = 0
        for i, ev in enumerate(path):
            if ev.kind == EventKind.COMPACTION:
                start = i
        msgs: list[dict[str, Any]] = []
        for ev in path[start:]:
            p = ev.payload
            if ev.kind == EventKind.COMPACTION:
                # The envelope re-injects the original task next to the summary,
                # so the goal survives the reset (Mistral Vibe's context envelope).
                msgs.append({"role": "user", "content": p["task"]})
                msgs.append(
                    {"role": "user", "content": f"<conversation-summary>\n{p['summary']}\n</conversation-summary>"}
                )
                msgs.extend(p.get("tail", []))
            elif ev.kind == EventKind.USER_MESSAGE:
                msgs.append({"role": "user", "content": p["content"]})
            elif ev.kind == EventKind.MODEL_RESPONSE:
                msgs.append(
                    {
                        "role": "assistant",
                        "content": p.get("text", ""),
                        "tool_calls": p.get("tool_calls", []),
                        # Provider-native blocks (e.g. thinking) replayed unchanged.
                        "raw": p.get("raw"),
                    }
                )
            elif ev.kind == EventKind.TOOL_RESULT:
                msgs.append(
                    {
                        "role": "tool",
                        "tool_call_id": p["call_id"],
                        "name": p["name"],
                        "content": p["content"],
                        "is_error": p.get("is_error", False),
                    }
                )
        return msgs

    def task(self) -> str:
        for ev in self.log.active_path():
            if ev.kind == EventKind.USER_MESSAGE:
                return ev.payload["content"]
        return ""

"""Threshold compaction with incremental summaries.

Paper observations (§9.5, Recommendation 7):
* Seven of eleven systems converge on threshold-triggered LLM compaction.
* Preserve a verbatim recent tail (Gemini CLI keeps the last 30%; OpenCode
  keeps two user turns).
* Merge summaries incrementally: OpenCode passes the previous summary back in
  a <previous-summary> block, into mandated sections (Objective / Important
  Details / Work State / Next Move / Relevant Files), via a hidden agent with
  all tools denied. Pi persists cumulative read/modified file lists.
* Mistral Vibe re-injects prior user messages so "original task goals survive
  resets", and reuses the same routine reactively on overflow.

Compaction is itself an event (OpenHands event-sources condensation): the log
is never rewritten, the projection simply starts at the latest COMPACTION.
"""

from __future__ import annotations

from typing import Any

from ..core.events import Event, EventKind
from ..core.session import Session
from ..llm.provider import Model, SystemPrompt

SECTIONS = ["Objective", "Important Details", "Work State", "Next Move", "Relevant Files"]

COMPACTOR_SYSTEM = (
    "You compress an agent transcript into a working summary. You have no tools. "
    "Preserve still-true details, remove stale ones, keep exact file paths, error messages and decisions. "
    "Use exactly these Markdown sections: " + ", ".join(f"## {s}" for s in SECTIONS) + "."
)


def _render(messages: list[dict[str, Any]]) -> str:
    lines = []
    for m in messages:
        if m["role"] == "assistant":
            calls = ", ".join(f"{c['name']}({c['args']})" for c in m.get("tool_calls", []))
            lines.append(f"[assistant] {m.get('content', '')}" + (f"  calls: {calls}" if calls else ""))
        elif m["role"] == "tool":
            lines.append(f"[tool:{m['name']}] {str(m['content'])[:2000]}")
        else:
            lines.append(f"[{m['role']}] {m['content']}")
    return "\n".join(lines)


class Compactor:
    def __init__(self, model: Model, keep_tail: int = 6):
        self.model = model
        self.keep_tail = keep_tail

    def _previous(self, session: Session) -> Event | None:
        prev = None
        for ev in session.log.active_path():
            if ev.kind == EventKind.COMPACTION:
                prev = ev
        return prev

    async def compact(self, session: Session, reason: str) -> Event:
        msgs = session.messages()
        prev = self._previous(session)
        if prev is not None:
            msgs = msgs[2:]  # drop the previous envelope (task + summary); it is merged below
        cut = max(0, len(msgs) - self.keep_tail)
        # Never start the tail on a tool result orphaned from its assistant turn.
        while 0 < cut < len(msgs) and msgs[cut]["role"] == "tool":
            cut -= 1
        head, tail = msgs[:cut], msgs[cut:]
        state = session.state
        prompt = (
            (f"<previous-summary>\n{prev.payload['summary']}\n</previous-summary>\n\n" if prev else "")
            + f"<transcript>\n{_render(head)}\n</transcript>\n\n"
            + f"Files read: {sorted(state.files_read)}\nFiles modified: {sorted(state.files_modified)}\n"
            + "Write the merged summary now."
        )
        resp = await self.model.complete(SystemPrompt(COMPACTOR_SYSTEM, ""), [{"role": "user", "content": prompt}], [])
        return session.log.append(EventKind.COMPACTION, {
            "reason": reason,
            "task": session.task(),
            "summary": resp.text,
            "tail": tail,
            "merged_previous": prev is not None,
        })


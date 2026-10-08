"""Bounded, cache-friendly persistent memory.

Paper observation (§9.6): Hermes keeps persistent memory deliberately tiny -
two bounded Markdown files (MEMORY.md 2,200 chars; USER.md 1,375) injected as
a *frozen snapshot*, "so mid-session writes hit disk without invalidating the
prompt cache". Writes are scanned for injection payloads (§10.7).

This is the "model-direct-but-bounded" governance model; the paper also
documents agent-maintained (Codex) and human-gated (Gemini CLI) variants.
"""

from __future__ import annotations

from pathlib import Path

from ..safety.untrusted import scan_injection
from ..tools.permissions import PermissionLevel
from ..tools.registry import Access, Tool, ToolContext, ToolResult


class MemoryStore:
    def __init__(self, path: Path, max_chars: int = 2200):
        self.path = path
        self.max_chars = max_chars
        self._snapshot = path.read_text(encoding="utf-8") if path.exists() else ""

    def snapshot(self) -> str:
        """Frozen at construction: the prompt prefix stays byte-stable all session."""
        return self._snapshot

    def add(self, fact: str) -> str:
        fact = " ".join(fact.split())
        if hit := scan_injection(fact):
            return f"ERROR: memory write rejected (matched '{hit}')"
        current = self.path.read_text(encoding="utf-8") if self.path.exists() else ""
        entry = f"- {fact}\n"
        if len(current) + len(entry) > self.max_chars:
            return f"ERROR: memory is full ({self.max_chars} chars). Consolidate existing entries first."
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(current + entry, encoding="utf-8")
        return "remembered (visible from the next session)"

    def tool(self) -> Tool:
        async def remember(args: dict, ctx: ToolContext) -> ToolResult:
            msg = self.add(args["fact"])
            return ToolResult(msg, is_error=msg.startswith("ERROR"))

        return Tool("remember", "Persist one durable fact about this project for future sessions.",
                    {"type": "object", "properties": {"fact": {"type": "string"}}, "required": ["fact"],
                     "additionalProperties": False},
                    remember, PermissionLevel.META, concurrency_safe=False,
                    accesses=lambda a, c: [Access("memory:" + self.path.as_posix(), "w")])

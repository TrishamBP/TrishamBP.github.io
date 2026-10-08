"""Context manager: owns what the model sees.

Responsibilities:
1. Assemble a two-part system prompt - static prefix (byte-stable across
   turns and sessions) and dynamic suffix (environment, repo context, memory
   snapshot, skills index). Claude Code and OpenHands both split at a cache
   boundary (§7.2).
2. Estimate token usage and decide when to compact (threshold buffer below the
   window: Claude Code uses AUTOCOMPACT_BUFFER_TOKENS = 13,000, §9.5).
3. Wire JIT context: a PostToolUse hook appends nested context files and
   path-matched skill hints to the result of any tool that touched a file.

Token estimates use chars/4 (OpenCode does the same; the paper notes it has no
tokenizer anywhere in its tree). Good enough for a trigger, not for billing.
"""

from __future__ import annotations

import datetime as _dt
import json
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any

from ..extensions.hooks import HookBus, HookEvent, HookResult
from ..llm.provider import SystemPrompt
from .repo_context import RepoContext

if TYPE_CHECKING:  # pragma: no cover
    from ..extensions.skills import SkillRegistry
    from ..tools.registry import Tool
    from .memory import MemoryStore

STATIC_PREAMBLE = """You are a coding agent working inside a repository through tools.

Rules:
- Read a file before editing it. Make the smallest change that solves the task.
- Prefer dedicated tools (read_file, grep, list_files, edit_file) over run_command.
- run_command runs exactly one program with no shell operators.
- Do not commit, push, or rewrite git history unless the user asks.
- Never claim tests pass unless you ran them and saw them pass.
- When the work is complete, reply with a short summary and no tool calls."""


def estimate_tokens(obj: Any) -> int:
    return len(json.dumps(obj, default=str)) // 4


@dataclass
class ContextBudget:
    context_window: int = 200_000
    compact_buffer: int = 13_000
    warn_fraction: float = 0.8

    @property
    def compact_at(self) -> int:
        return self.context_window - self.compact_buffer


class ContextManager:
    def __init__(self, workspace: Path, repo: RepoContext | None = None, memory: "MemoryStore | None" = None,
                 skills: "SkillRegistry | None" = None, budget: ContextBudget | None = None):
        self.workspace = workspace.resolve()
        self.repo = repo or RepoContext(self.workspace)
        self.memory = memory
        self.skills = skills
        self.budget = budget or ContextBudget()
        self._startup_context: str | None = None
        self._static: str | None = None

    def system_prompt(self, base_tools: list["Tool"]) -> SystemPrompt:
        if self._static is None:
            # Per-tool guidance co-varies with the toolset (Pi); computed once from
            # the non-deferred tools so it never changes mid-session.
            snippets = sorted({t.prompt_snippet for t in base_tools if t.prompt_snippet and not t.defer})
            self._static = STATIC_PREAMBLE + ("\n\nTool notes:\n- " + "\n- ".join(snippets) if snippets else "")
        if self._startup_context is None:
            self._startup_context = self.repo.startup()
        dynamic = [f"<env>\nworkspace: {self.workspace.as_posix()}\ndate: {_dt.date.today().isoformat()}\n</env>"]
        if self._startup_context:
            dynamic.append(self._startup_context)
        if self.memory and self.memory.snapshot():
            dynamic.append(f"<memory>\n{self.memory.snapshot().strip()}\n</memory>")
        if self.skills and self.skills.index():
            dynamic.append(self.skills.index())
        return SystemPrompt(self._static, "\n\n".join(dynamic))

    def tokens(self, system: SystemPrompt, messages: list[dict[str, Any]]) -> int:
        return estimate_tokens(system.render()) + estimate_tokens(messages)

    def needs_compaction(self, tokens: int) -> bool:
        return tokens >= self.budget.compact_at

    def attach(self, hooks: HookBus) -> None:
        async def jit_context(payload: dict[str, Any]) -> HookResult | None:
            result = payload["result"]
            rel = result.metadata.get("path") if not result.is_error else None
            if not rel:
                return None
            extra = [self.repo.on_file_touched(self.workspace / rel)]
            if self.skills:
                extra.append(self.skills.on_file_touched(rel))
            text = "\n\n".join(e for e in extra if e)
            return HookResult(append=text) if text else None

        hooks.on(HookEvent.POST_TOOL_USE, jit_context)

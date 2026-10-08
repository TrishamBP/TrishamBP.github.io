"""Lifecycle hooks.

Paper observation (§10.2, §14.1): Claude Code's hook vocabulary
(PreToolUse, PostToolUse, PreCompact, SessionStart, UserPromptSubmit,
SubagentStart/Stop, Stop) was adopted near-verbatim by Codex, and hooks are
now the dominant extension substrate (9 of 11 systems). OpenCode runs its
plugin hooks sequentially for determinism.

Proposed implementation: handlers run in registration order; a PRE hook can
block a call or rewrite its arguments; a POST hook can append context to a
tool result; a STOP hook can veto the agent's exit.
"""

from __future__ import annotations

import fnmatch
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Awaitable, Callable


class HookEvent(str, Enum):
    SESSION_START = "SessionStart"
    USER_PROMPT_SUBMIT = "UserPromptSubmit"
    PRE_TOOL_USE = "PreToolUse"
    POST_TOOL_USE = "PostToolUse"
    PRE_COMPACT = "PreCompact"
    STOP = "Stop"
    SUBAGENT_STOP = "SubagentStop"


@dataclass
class HookResult:
    block: bool = False
    reason: str = ""
    updated_args: dict[str, Any] | None = None
    append: str = ""  # extra context for the model (POST_TOOL_USE / STOP continuation)


Hook = Callable[[dict[str, Any]], Awaitable[HookResult | None]]


@dataclass
class _Registration:
    event: HookEvent
    matcher: str
    fn: Hook


@dataclass
class HookBus:
    _hooks: list[_Registration] = field(default_factory=list)

    def on(self, event: HookEvent, fn: Hook, matcher: str = "*") -> None:
        self._hooks.append(_Registration(event, matcher, fn))

    async def emit(self, event: HookEvent, payload: dict[str, Any]) -> HookResult:
        merged = HookResult()
        target = str(payload.get("tool", "*"))
        for reg in self._hooks:
            if reg.event != event or not fnmatch.fnmatch(target, reg.matcher):
                continue
            res = await reg.fn(payload)
            if res is None:
                continue
            if res.updated_args is not None:
                payload = {**payload, "args": res.updated_args}
                merged.updated_args = res.updated_args
            if res.append:
                merged.append = (merged.append + "\n" + res.append).strip()
            if res.block:
                merged.block, merged.reason = True, res.reason
                break  # first blocker wins; later hooks do not run
        return merged

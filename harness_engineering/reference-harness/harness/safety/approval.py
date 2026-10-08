"""Approval workflows for ASK decisions.

Paper observations (§10): Gemini CLI's DEFAULT mode offers approve once /
approve always / reject; OpenCode headless runs auto-reject every ask;
Claude Code background sub-agents cannot show dialogs, so their prompts
resolve to denials, and the harness counts denials per session.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class ApprovalRequest:
    tool: str
    args: dict[str, Any]
    reason: str
    grant: tuple[str, ...] | None = None


@dataclass(frozen=True)
class ApprovalResponse:
    approved: bool
    always: bool = False  # extend to a session grant (arity-scoped)


class Approver(Protocol):
    async def __call__(self, req: ApprovalRequest) -> ApprovalResponse: ...


class DenyAll:
    """Headless / background default: nobody is there to ask."""

    async def __call__(self, req: ApprovalRequest) -> ApprovalResponse:
        return ApprovalResponse(False)


class ApproveAll:
    async def __call__(self, req: ApprovalRequest) -> ApprovalResponse:
        return ApprovalResponse(True)


class ScriptedApprover:
    def __init__(self, answers: list[ApprovalResponse]):
        self.answers = list(answers)
        self.seen: list[ApprovalRequest] = []

    async def __call__(self, req: ApprovalRequest) -> ApprovalResponse:
        self.seen.append(req)
        return self.answers.pop(0) if self.answers else ApprovalResponse(False)


class ConsoleApprover:
    async def __call__(self, req: ApprovalRequest) -> ApprovalResponse:
        scope = f" [a]lways '{' '.join(req.grant)} *'" if req.grant else ""
        prompt = f"\n[approval] {req.tool} {req.args}\n  reason: {req.reason}\n  [y]es / [n]o{scope}: "
        answer = (await asyncio.to_thread(input, prompt)).strip().lower()
        return ApprovalResponse(answer in ("y", "yes", "a", "always"), always=answer in ("a", "always"))

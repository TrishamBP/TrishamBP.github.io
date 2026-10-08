"""The per-call pipeline every tool request passes through.

    request -> lookup -> schema validation -> PreToolUse hooks -> policy
            -> approval (if ASK) -> audit event -> execute (timeout)
            -> PostToolUse hooks -> output cap -> result

The ordering is the design. Validation runs before policy so a malformed call
never reaches a human; policy runs after hooks so a hook that rewrites
arguments cannot smuggle a call past the rules; the audit event is written
before execution so a crash mid-tool still leaves a record.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from ..core.events import EventKind
from ..extensions.hooks import HookBus, HookEvent
from ..llm.provider import ToolCall
from ..safety.approval import ApprovalRequest, Approver, DenyAll
from ..safety.policy import PolicyEngine
from .permissions import Decision
from .registry import ToolContext, ToolRegistry, ToolResult, validate_args

MAX_RESULT_CHARS = 25_000  # the paper's 90-line scaffold truncates at the same size


def cap(s: str, n: int = MAX_RESULT_CHARS) -> str:
    return s if len(s) <= n else s[:n] + "\n...[truncated]"


@dataclass
class ToolExecutor:
    registry: ToolRegistry
    policy: PolicyEngine
    hooks: HookBus
    approver: Approver = DenyAll()

    async def execute(self, call: ToolCall, ctx: ToolContext) -> ToolResult:
        log, state = ctx.session.log, ctx.session.state
        log.append(EventKind.TOOL_CALL, {"call_id": call.id, "name": call.name, "args": call.args})

        tool = self.registry.get(call.name)
        if tool is None:
            return ToolResult(f"ERROR: unknown tool '{call.name}'. Use tool_search to discover tools.", True)
        if tool.defer and tool.name not in state.loaded_tools:
            return ToolResult(f"ERROR: '{call.name}' is not loaded. Call tool_search with 'select:{call.name}' first.", True)

        errors = validate_args(tool.parameters, call.args)
        if errors:
            return ToolResult("ERROR: invalid arguments: " + "; ".join(errors), True)

        args = {k: v for k, v in call.args.items() if k != "wait_for_previous"}
        pre = await self.hooks.emit(HookEvent.PRE_TOOL_USE, {"tool": tool.name, "args": args, "session": ctx.session.id})
        if pre.block:
            self._audit(ctx, call, "deny", f"blocked by hook: {pre.reason}", "hook", None, None)
            return ToolResult(f"ERROR: blocked by hook: {pre.reason}", True)
        if pre.updated_args is not None:
            args = pre.updated_args

        verdict = self.policy.evaluate(tool.name, tool.permission, args)
        decision, approved = verdict.decision, None
        if decision == Decision.ASK:
            answer = await self.approver(ApprovalRequest(tool.name, args, verdict.reason, verdict.grant))
            decision, approved = (Decision.ALLOW if answer.approved else Decision.DENY), answer.approved
            if answer.approved and answer.always and verdict.grant:
                self.policy.add_grant(verdict.grant)
            if not answer.approved:
                state.denials += 1
        self._audit(ctx, call, decision.value, verdict.reason, verdict.rule, verdict.decision.value, approved)
        if decision == Decision.DENY:
            return ToolResult(f"ERROR: permission denied ({verdict.reason}). Do not retry the same call.", True)

        try:
            result = await asyncio.wait_for(tool.handler(args, ctx), tool.timeout_s)
        except asyncio.TimeoutError:
            result = ToolResult(f"ERROR: tool timed out after {tool.timeout_s}s", True)
        except PermissionError as e:
            result = ToolResult(f"ERROR: {e}", True)
        except Exception as e:  # tool bugs become observations, not crashes
            result = ToolResult(f"ERROR: {type(e).__name__}: {e}", True)

        post = await self.hooks.emit(
            HookEvent.POST_TOOL_USE,
            {"tool": tool.name, "args": args, "result": result, "session": ctx.session.id, "ctx": ctx},
        )
        if post.append:
            result.content = result.content + "\n\n" + post.append
        result.content = cap(result.content)
        return result

    @staticmethod
    def _audit(ctx: ToolContext, call: ToolCall, decision: str, reason: str, rule: str | None,
               policy: str | None, approved: bool | None) -> None:
        """`policy` is what the rules said; `decision` is what happened after any human answer."""
        ctx.session.log.append(EventKind.PERMISSION_DECISION, {
            "call_id": call.id, "tool": call.name, "decision": decision, "policy": policy,
            "approved": approved, "reason": reason, "rule": rule,
        })

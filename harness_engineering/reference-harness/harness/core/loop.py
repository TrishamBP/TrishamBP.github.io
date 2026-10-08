"""The agent loop.

Shape: Mini-SWE-Agent's linear while-loop (§6.2, Listing 1) - query, act,
observe, repeat - with every additional concern pushed *out* of the loop body
into a component the loop calls at a fixed point:

    before each turn   -> middleware stack (limits, compaction, warnings)
    the model call     -> Model protocol (routing, streaming, caching live behind it)
    a text-only answer -> stop guard (verify-on-stop) and Stop hooks
    tool calls         -> truncation guard, stuck detector, scheduler -> executor
    every step         -> an event in the session log

The loop owns ordering and stop conditions. It owns nothing else.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from ..context.compaction import Compactor
from ..context.manager import ContextManager
from ..extensions.hooks import HookBus, HookEvent
from ..llm.provider import ContextOverflowError, Model, ModelResponse
from ..llm.streaming import TRUNCATED_ERROR, is_truncated
from ..tools.registry import ToolContext, ToolRegistry
from ..tools.scheduler import ToolScheduler
from .events import EventKind
from .middleware import Middleware
from .session import Session
from .stuck import StuckDetector

StopGuard = Callable[[Session], Awaitable[str | None]]

WAIT_FOR_PREVIOUS = {
    "type": "boolean",
    "description": "Set true to run this call only after all earlier calls in this message finish.",
}


@dataclass
class RunResult:
    status: str            # "completed" | "unverified" | a limit / stuck / cancelled reason
    final_text: str
    session_id: str
    turns: int


@dataclass
class AgentLoop:
    session: Session
    model: Model
    registry: ToolRegistry
    scheduler: ToolScheduler
    context: ContextManager
    compactor: Compactor
    hooks: HookBus
    tool_ctx: ToolContext
    middlewares: list[Middleware] = field(default_factory=list)
    stop_guard: StopGuard | None = None
    stuck: StuckDetector = field(default_factory=StuckDetector)
    cancel: asyncio.Event = field(default_factory=asyncio.Event)

    # ------------------------------------------------------------------
    def request_tools(self) -> list[dict[str, Any]]:
        """Visible schemas, each with the model-visible serialization knob injected."""
        out = []
        for t in self.registry.visible(self.session.state.loaded_tools):
            schema = t.schema()
            params = dict(schema["parameters"])
            params["properties"] = {**params.get("properties", {}), "wait_for_previous": WAIT_FOR_PREVIOUS}
            out.append({**schema, "parameters": params})
        return out

    async def compact(self, reason: str) -> None:
        await self.hooks.emit(HookEvent.PRE_COMPACT, {"reason": reason, "session": self.session.id})
        await self.compactor.compact(self.session, reason)

    def _finish(self, status: str, text: str = "") -> RunResult:
        s = self.session
        s.state.stop_reason = s.state.stop_reason or status
        final = "unverified" if s.state.stop_reason == "verification_failed" else status
        s.log.append(EventKind.SESSION_COMPLETED, {"status": final, "turns": s.state.turns, "text": text})
        return RunResult(final, text, s.id, s.state.turns)

    def _record(self, resp: ModelResponse) -> None:
        st = self.session.state
        st.input_tokens += resp.usage.input_tokens
        st.output_tokens += resp.usage.output_tokens
        st.cost_usd += resp.usage.cost_usd
        self.session.log.append(EventKind.MODEL_RESPONSE, {
            "text": resp.text,
            "tool_calls": [{"id": c.id, "name": c.name, "args": c.args} for c in resp.tool_calls],
            "stop_reason": resp.stop_reason,
            "usage": {"input": resp.usage.input_tokens, "output": resp.usage.output_tokens},
            "raw": resp.raw,
        })

    # ------------------------------------------------------------------
    async def run(self, task: str) -> RunResult:
        s = self.session
        submit = await self.hooks.emit(HookEvent.USER_PROMPT_SUBMIT, {"prompt": task, "session": s.id})
        if submit.block:
            return self._finish("blocked", submit.reason)
        s.log.append(EventKind.USER_MESSAGE, {"content": task + (f"\n\n{submit.append}" if submit.append else "")})
        await self.hooks.emit(HookEvent.SESSION_START, {"session": s.id})

        while True:
            if self.cancel.is_set():
                return self._finish("cancelled")

            for mw in self.middlewares:
                action = await mw.before_turn(self)
                if action and action.stop:
                    return self._finish(action.stop)
                if action and action.inject:
                    s.log.append(EventKind.USER_MESSAGE, {"content": action.inject, "synthetic": True})

            if s.budget.exhausted:
                return await self._grace_and_finish()
            s.budget.consume()
            s.state.turns += 1

            system = self.context.system_prompt(self.registry.visible(set()))
            try:
                resp = await self.model.complete(system, s.messages(), self.request_tools())
            except ContextOverflowError:
                await self.compact("overflow")  # reactive path, same routine
                continue
            self._record(resp)

            if resp.stop_reason == "refusal":
                return self._finish("refusal", resp.text)

            if not resp.tool_calls:
                veto = await self.stop_guard(s) if self.stop_guard else None
                stop_hook = await self.hooks.emit(HookEvent.STOP, {"session": s.id, "text": resp.text})
                if stop_hook.block:
                    veto = (veto + "\n\n" if veto else "") + (stop_hook.append or stop_hook.reason)
                if veto:
                    s.log.append(EventKind.USER_MESSAGE, {"content": veto, "synthetic": True})
                    continue
                return self._finish("completed", resp.text)

            if is_truncated(resp):  # never execute possibly-incomplete arguments
                for c in resp.tool_calls:
                    s.log.append(EventKind.TOOL_RESULT, {"call_id": c.id, "name": c.name,
                                                         "content": TRUNCATED_ERROR, "is_error": True})
                continue

            halt, warnings = self.stuck.observe(resp.tool_calls)
            if halt:
                return self._finish("stuck")

            results = await self.scheduler.run(resp.tool_calls, self.tool_ctx)
            for c, r in results:  # appended in the order the model asked
                self.stuck.record(c, r.is_error)
                content = r.content + (f"\n\n{warnings[c.id]}" if c.id in warnings else "")
                s.log.append(EventKind.TOOL_RESULT, {"call_id": c.id, "name": c.name,
                                                     "content": content, "is_error": r.is_error})

    async def _grace_and_finish(self) -> RunResult:
        """Hermes-style grace call: one tool-less turn to summarize, then stop."""
        s = self.session
        s.log.append(EventKind.USER_MESSAGE, {"content": "Iteration budget exhausted. Summarize what is done and "
                                                         "what remains. Do not call tools.", "synthetic": True})
        s.budget.grace_used = True
        resp = await self.model.complete(self.context.system_prompt(self.registry.visible(set())), s.messages(), [])
        self._record(resp)
        return self._finish("budget_exhausted", resp.text)

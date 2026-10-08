"""Turn-level policies as composable middleware.

Paper observation (§6.2): Mistral Vibe walks a stack of middleware pre-turn
checks before each iteration - TurnLimit, PriceLimit, TokenLimit,
AutoCompact, ContextWarning, ReadOnlyAgent - so "new turn-level policies can
be added without modifying the loop body", and six agent profiles share one
loop by swapping the middleware composition. Recommendation 1 says to adopt
this once you have three or more orthogonal turn policies.

Read-only mode is not a middleware here: it is the PLAN policy mode, enforced
per call by the policy engine (and visible in the audit log).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:  # pragma: no cover
    from .loop import AgentLoop


@dataclass
class TurnAction:
    stop: str | None = None     # end the run with this reason
    inject: str | None = None   # append a synthetic user message first


class Middleware(Protocol):
    async def before_turn(self, loop: "AgentLoop") -> TurnAction | None: ...


@dataclass
class TurnLimit:
    max_turns: int

    async def before_turn(self, loop: "AgentLoop") -> TurnAction | None:
        return TurnAction(stop=f"turn_limit({self.max_turns})") if loop.session.state.turns >= self.max_turns else None


@dataclass
class TokenLimit:
    max_total_tokens: int

    async def before_turn(self, loop: "AgentLoop") -> TurnAction | None:
        st = loop.session.state
        used = st.input_tokens + st.output_tokens
        return TurnAction(stop=f"token_limit({self.max_total_tokens})") if used >= self.max_total_tokens else None


@dataclass
class CostLimit:
    max_usd: float

    async def before_turn(self, loop: "AgentLoop") -> TurnAction | None:
        return TurnAction(stop=f"cost_limit(${self.max_usd:.2f})") if loop.session.state.cost_usd >= self.max_usd else None


@dataclass
class AutoCompact:
    """Proactive compaction at the threshold. The loop also compacts reactively
    when the provider reports a context overflow."""

    async def before_turn(self, loop: "AgentLoop") -> TurnAction | None:
        ctx = loop.context
        system = ctx.system_prompt(loop.registry.visible(set()))
        if ctx.needs_compaction(ctx.tokens(system, loop.session.messages())):
            await loop.compact("threshold")
        return None


@dataclass
class ContextWarning:
    fraction: float = 0.8
    _warned: bool = False

    async def before_turn(self, loop: "AgentLoop") -> TurnAction | None:
        ctx = loop.context
        tokens = ctx.tokens(ctx.system_prompt(loop.registry.visible(set())), loop.session.messages())
        if not self._warned and tokens >= self.fraction * ctx.budget.context_window:
            self._warned = True
            return TurnAction(inject=f"<system-reminder>Context is {tokens} / {ctx.budget.context_window} tokens. "
                                     "Be economical: read narrower ranges and avoid re-reading files.</system-reminder>")
        return None

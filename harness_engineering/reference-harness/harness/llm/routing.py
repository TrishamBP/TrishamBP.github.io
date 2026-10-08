"""Model routing as a chain of strategies.

Paper observation (§7.1): Gemini CLI's ModelRouterService dispatches each
request through "a chain of pluggable strategies (fallback, override,
approval-mode, three classifier strategies ... and default)". The paper's
point is that routing layers "exist precisely to absorb model churn so the
loop does not".

Proposed implementation: each strategy returns a model name or None; the
first non-None answer wins. The router itself satisfies the Model protocol,
so the loop never knows routing happened.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from .provider import Model, ModelResponse, SystemPrompt

RouteContext = dict[str, Any]
Strategy = Callable[[RouteContext], str | None]


def override_strategy(name: str | None) -> Strategy:
    return lambda ctx: name


def plan_mode_strategy(model_name: str) -> Strategy:
    """Example: read-only planning turns go to a cheaper model."""
    return lambda ctx: model_name if ctx.get("mode") == "plan" else None


def default_strategy(name: str) -> Strategy:
    return lambda ctx: name


@dataclass
class ModelRouter:
    models: dict[str, Model]
    strategies: list[Strategy]
    context: RouteContext | None = None
    name: str = "router"

    def pick(self) -> Model:
        ctx = self.context or {}
        for strategy in self.strategies:
            choice = strategy(ctx)
            if choice is not None and choice in self.models:
                return self.models[choice]
        raise LookupError("no routing strategy produced a known model")

    async def complete(self, system: SystemPrompt, messages, tools) -> ModelResponse:
        return await self.pick().complete(system, messages, tools)

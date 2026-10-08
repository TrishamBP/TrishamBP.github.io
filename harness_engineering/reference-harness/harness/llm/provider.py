"""Provider-neutral LLM interface.

The loop speaks only these types. Each provider adapter translates them to
its wire format. Paper context (§7.1): the corpus spans tight single-provider
coupling to full agnosticism; Mini-SWE-Agent's whole extension story is
structural typing (Python Protocols, §12.2). We use the same idea here.
"""

from __future__ import annotations

import itertools
import json
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Protocol, Sequence


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    args: dict[str, Any]

    def signature(self) -> str:
        """Stable identity for stuck detection: name + sorted-JSON args (Hermes)."""
        return self.name + ":" + json.dumps(self.args, sort_keys=True, separators=(",", ":"))


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0


@dataclass
class ModelResponse:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    # "end_turn" | "tool_use" | "max_tokens" | "refusal"
    stop_reason: str = "end_turn"
    usage: Usage = field(default_factory=Usage)
    # Provider-native content blocks, kept so they can be replayed unchanged.
    raw: Any = None


@dataclass
class SystemPrompt:
    """Two-part prompt: a byte-stable static prefix and a per-turn dynamic suffix.

    Claude Code splits at SYSTEM_PROMPT_DYNAMIC_BOUNDARY and OpenHands renders
    STATIC/DYNAMIC cache tiers (§7.2). The static part must not change between
    turns or prompt caching silently stops working.
    """

    static: str
    dynamic: str

    def render(self) -> str:
        return self.static + "\n\n" + self.dynamic


class Model(Protocol):
    name: str

    async def complete(
        self,
        system: SystemPrompt,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> ModelResponse: ...


ScriptStep = ModelResponse | Callable[[list[dict[str, Any]]], ModelResponse]


class ScriptedModel:
    """Deterministic model for tests and demos.

    Each step is either a fixed ModelResponse or a function of the messages
    so far. It records every request so tests can assert on what the model
    was actually shown (visible tools, injected context, compaction).
    """

    name = "scripted"

    def __init__(self, steps: Sequence[ScriptStep]):
        self.steps = list(steps)
        self.requests: list[dict[str, Any]] = []

    async def complete(self, system, messages, tools) -> ModelResponse:
        self.requests.append({"system": system, "messages": list(messages), "tools": list(tools)})
        if not self.steps:
            return ModelResponse(text="(script exhausted)", stop_reason="end_turn")
        step = self.steps.pop(0)
        return step(messages) if callable(step) else step


_call_ids = itertools.count(1)


def call(tool_name: str, /, **args: Any) -> ToolCall:
    """Convenience constructor used by scripts and tests (ids are sequential)."""
    return ToolCall(id=f"call_{next(_call_ids)}", name=tool_name, args=args)


AsyncFn = Callable[..., Awaitable[Any]]


class ContextOverflowError(Exception):
    """Raised by an adapter when the provider rejects a request as too long.
    The loop answers by compacting and retrying - never by crashing (OpenHands,
    Pi and OpenCode all route overflow into compaction, §6.2/§9.4)."""

"""Optional adapter for the Claude Messages API (requires `pip install anthropic`).

Translation rules this adapter owns - the loop knows none of them:
* The static system prefix carries a cache breakpoint; the dynamic suffix
  follows it, so per-session context never invalidates the cached prefix.
* Assistant turns are replayed from their *raw* content blocks, unchanged.
  Current Claude models require thinking blocks to be passed back as-is.
* Consecutive tool results are sent as one user message of tool_result blocks.
* Server-side refusal fallback is enabled by default (`fallbacks="default"`);
  after a mid-output fallback, model-internal blocks that precede the final
  `fallback` block are not echoed back.
"""

from __future__ import annotations

from typing import Any

from .provider import ContextOverflowError, ModelResponse, SystemPrompt, ToolCall, Usage

# USD per million tokens: input, output, cache read, cache write (5-minute TTL).
PRICES = {"claude-opus-5-5": (4.00, 20.00, 0.20, 5.00)}
_INTERNAL = {"thinking", "redacted_thinking", "tool_use"}


def _echo_blocks(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    last_fb = max((i for i, b in enumerate(blocks) if b.get("type") == "fallback"), default=-1)
    return [b for i, b in enumerate(blocks) if not (i < last_fb and b.get("type") in _INTERNAL)]


def to_wire(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    wire: list[dict[str, Any]] = []

    def user_blocks() -> list[dict[str, Any]]:
        if wire and wire[-1]["role"] == "user":
            return wire[-1]["content"]
        wire.append({"role": "user", "content": []})
        return wire[-1]["content"]

    for m in messages:
        if m["role"] == "assistant":
            if m.get("raw"):
                content = _echo_blocks(m["raw"])
            else:
                content = ([{"type": "text", "text": m["content"]}] if m.get("content") else []) + [
                    {"type": "tool_use", "id": c["id"], "name": c["name"], "input": c["args"]}
                    for c in m.get("tool_calls", [])]
            wire.append({"role": "assistant", "content": content})
        elif m["role"] == "tool":
            user_blocks().append({"type": "tool_result", "tool_use_id": m["tool_call_id"],
                                  "content": m["content"], "is_error": m.get("is_error", False)})
        else:
            user_blocks().append({"type": "text", "text": m["content"]})
    return wire


class AnthropicModel:
    def __init__(self, model: str = "claude-opus-5-5", max_tokens: int = 16000, effort: str = "high",
                 fallbacks: bool = True, client: Any = None):
        import anthropic  # imported lazily so the harness has no hard dependency

        self.name = model
        self.max_tokens = max_tokens
        self.effort = effort
        self.fallbacks = fallbacks
        self.client = client or anthropic.AsyncAnthropic()

    async def complete(self, system: SystemPrompt, messages, tools) -> ModelResponse:
        kwargs: dict[str, Any] = dict(
            model=self.name,
            max_tokens=self.max_tokens,
            system=[{"type": "text", "text": system.static, "cache_control": {"type": "ephemeral"}},
                    {"type": "text", "text": system.dynamic}],
            messages=to_wire(messages),
            thinking={"type": "adaptive"},
            output_config={"effort": self.effort},
        )
        if tools:
            kwargs["tools"] = [{"name": t["name"], "description": t["description"], "input_schema": t["parameters"]}
                               for t in tools]
        if self.fallbacks:
            resp = await self.client.beta.messages.create(
                **kwargs, betas=["server-side-fallback-2026-07-01"], fallbacks="default")
        else:
            resp = await self.client.messages.create(**kwargs)

        if resp.stop_reason == "model_context_window_exceeded":
            raise ContextOverflowError(resp.stop_reason)
        raw = [b.model_dump(exclude_none=True) for b in resp.content]
        text = "".join(b.text for b in resp.content if b.type == "text")
        calls = [ToolCall(b.id, b.name, dict(b.input)) for b in resp.content if b.type == "tool_use"]
        u = resp.usage
        cache_read = getattr(u, "cache_read_input_tokens", 0) or 0
        cache_write = getattr(u, "cache_creation_input_tokens", 0) or 0
        p_in, p_out, p_read, p_write = PRICES.get(self.name, (0, 0, 0, 0))
        cost = (u.input_tokens * p_in + u.output_tokens * p_out + cache_read * p_read + cache_write * p_write) / 1e6
        stop = resp.stop_reason if resp.stop_reason in ("end_turn", "tool_use", "max_tokens", "refusal") else "end_turn"
        return ModelResponse(text, calls, stop, Usage(u.input_tokens + cache_read + cache_write, u.output_tokens, cost), raw)

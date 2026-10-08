"""Stream accumulation and the truncation-poisoning guard.

Paper observations:
* Claude Code consumes fine-grained SSE events (content_block_start / delta /
  stop) (§6.2, §7.4).
* Pi fails *all* tool calls of an assistant message that was cut off at the
  length limit, "because salvage-parsed streaming arguments can validate
  while being silently incomplete" (§6.2).

The stream format below is a provider-neutral simplification proposed for
this reference harness.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, AsyncIterator

from .provider import ModelResponse, ToolCall, Usage


@dataclass
class StreamEvent:
    type: str  # "text_delta" | "tool_start" | "tool_args_delta" | "tool_stop" | "message_stop"
    data: dict[str, Any]


async def accumulate(stream: AsyncIterator[StreamEvent]) -> ModelResponse:
    text: list[str] = []
    calls: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    stop_reason = "end_turn"
    usage = Usage()
    async for ev in stream:
        if ev.type == "text_delta":
            text.append(ev.data["text"])
        elif ev.type == "tool_start":
            calls[ev.data["id"]] = {"name": ev.data["name"], "args": ""}
            order.append(ev.data["id"])
        elif ev.type == "tool_args_delta":
            calls[ev.data["id"]]["args"] += ev.data["partial_json"]
        elif ev.type == "message_stop":
            stop_reason = ev.data.get("stop_reason", "end_turn")
            usage = Usage(ev.data.get("input_tokens", 0), ev.data.get("output_tokens", 0))
    tool_calls = []
    for cid in order:
        raw = calls[cid]["args"] or "{}"
        try:
            args = json.loads(raw)
        except json.JSONDecodeError:
            args = {"__invalid_json__": raw}
        tool_calls.append(ToolCall(cid, calls[cid]["name"], args))
    return ModelResponse("".join(text), tool_calls, stop_reason, usage)


TRUNCATED_ERROR = (
    "Tool call not executed: your previous message was cut off at the output "
    "length limit, so its arguments may be incomplete. Re-issue the call."
)


def is_truncated(resp: ModelResponse) -> bool:
    """True when tool arguments cannot be trusted (Pi's truncation guard)."""
    return resp.stop_reason == "max_tokens" and bool(resp.tool_calls)

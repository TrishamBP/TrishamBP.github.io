"""Step 1 of the article: the smallest useful agent loop, ~30 lines.

prompt -> LLM -> tool calls -> execution -> observations -> next iteration.
No policy, no scheduler, no persistence - those arrive in later steps.
Run:  python examples/minimal_loop.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any, Awaitable, Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from harness.llm.provider import Model, ModelResponse, ScriptedModel, SystemPrompt, call  # noqa: E402

ToolFn = Callable[..., Awaitable[str]]


async def minimal_loop(model: Model, tools: dict[str, ToolFn], schemas: list[dict[str, Any]],
                       task: str, max_turns: int = 20) -> str:
    system = SystemPrompt("You are a coding agent. Use tools; answer without tools when done.", "")
    messages: list[dict[str, Any]] = [{"role": "user", "content": task}]
    for _ in range(max_turns):                                   # stop condition 1: turn cap
        resp = await model.complete(system, messages, schemas)
        messages.append({"role": "assistant", "content": resp.text,
                         "tool_calls": [{"id": c.id, "name": c.name, "args": c.args} for c in resp.tool_calls]})
        if not resp.tool_calls:                                  # stop condition 2: model is done
            return resp.text
        for c in resp.tool_calls:                                # act, then observe
            try:
                out = await tools[c.name](**c.args)
            except Exception as e:                               # errors are observations, not crashes
                out = f"ERROR: {type(e).__name__}: {e}"
            messages.append({"role": "tool", "tool_call_id": c.id, "name": c.name, "content": str(out)[:25_000]})
    return "stopped: turn limit reached"


async def read_file(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


if __name__ == "__main__":
    here = Path(__file__).name
    model = ScriptedModel([
        ModelResponse(tool_calls=[call("read_file", path=__file__)], stop_reason="tool_use"),
        lambda msgs: ModelResponse(text=f"{here} is {len(msgs[-1]['content'].splitlines())} lines long."),
    ])
    schema = [{"name": "read_file", "description": "Read a file",
               "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}]
    print(asyncio.run(minimal_loop(model, {"read_file": read_file}, schema, f"How long is {here}?")))

"""Concurrency-aware tool scheduling.

Two production designs from the paper (§6.2, Table 18):

* Claude Code: `partitionToolCalls()` - a single-pass reduce that batches
  *consecutive* concurrency-safe tools and runs every unsafe tool solo, max
  10 concurrent via a semaphore. Tools default to unsafe.
* OpenHands: a ParallelToolExecutor with a resource-lock manager keyed on
  each tool's declared resources, "so only same-resource calls serialize".
  Hermes parallelizes only when every call is read-only-safe or path-scoped
  with non-overlapping prefixes. Gemini CLI additionally gives the model a
  `wait_for_previous` boolean on every tool schema to force serialization.

`policy="boolean"` reproduces the Claude Code partition; `policy="resource"`
(the default) is the reference design proposed in the article: an
order-preserving single pass that opens a new batch only on a real conflict.
Results always come back in the order the model asked for them
(Codex uses FuturesOrdered for the same reason).
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

from ..llm.provider import ToolCall
from .executor import ToolExecutor
from .registry import Access, ToolContext, ToolResult


@dataclass
class Batch:
    calls: list[ToolCall] = field(default_factory=list)
    accesses: list[Access] = field(default_factory=list)
    exclusive: bool = False

    def conflicts(self, new: list[Access]) -> bool:
        return any(a.conflicts_with(b) for a in new for b in self.accesses)


@dataclass
class ToolScheduler:
    executor: ToolExecutor
    max_concurrency: int = 10
    policy: str = "resource"  # "resource" | "boolean" | "serial"
    last_plan: list[Batch] = field(default_factory=list)

    def plan(self, calls: list[ToolCall], ctx: ToolContext) -> list[Batch]:
        batches: list[Batch] = []
        current = Batch()

        def flush() -> None:
            nonlocal current
            if current.calls:
                batches.append(current)
            current = Batch()

        for c in calls:
            tool = self.executor.registry.get(c.name)
            if self.policy == "serial" or tool is None:
                flush()
                batches.append(Batch([c], exclusive=True))
                continue
            if c.args.get("wait_for_previous") is True:
                flush()  # model-visible serialization knob (Gemini CLI)
            if self.policy == "boolean":
                if tool.concurrency_safe:
                    current.calls.append(c)
                else:
                    flush()
                    batches.append(Batch([c], exclusive=True))
                continue
            accesses = tool.declared_accesses(c.args, ctx)
            if accesses is None:  # undeclared side effects -> run alone
                flush()
                batches.append(Batch([c], exclusive=True))
                continue
            if current.conflicts(accesses):
                flush()
            current.calls.append(c)
            current.accesses.extend(accesses)
        flush()
        return batches

    async def run(self, calls: list[ToolCall], ctx: ToolContext) -> list[tuple[ToolCall, ToolResult]]:
        self.last_plan = self.plan(calls, ctx)
        sem = asyncio.Semaphore(self.max_concurrency)
        results: dict[str, ToolResult] = {}

        async def one(c: ToolCall) -> None:
            async with sem:
                results[c.id] = await self.executor.execute(c, ctx)

        for batch in self.last_plan:  # batches run in order; calls inside a batch overlap
            await asyncio.gather(*(one(c) for c in batch.calls))
        return [(c, results[c.id]) for c in calls]  # original order, always

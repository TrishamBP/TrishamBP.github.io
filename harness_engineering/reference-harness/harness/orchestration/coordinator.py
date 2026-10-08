"""Coordinator-worker orchestration with hard limits.

Two entry points:

* `spawn_tool()` - a model-callable `spawn_agent` tool (the Claude Code
  AgentTool / OpenCode task-tool shape). Read-only agents declare no
  resources, so the scheduler runs several spawns in parallel; write-capable
  agents declare nothing at all, so they always run alone.
* `run_phases()` - a deterministic Research -> Synthesis -> Implementation ->
  Verification pipeline: the workflow the paper reports Claude Code's
  coordinator follows (§6.4), driven here by code rather than by an LLM.

Limits are explicit and enforced in code: depth (child registries lose
`spawn_agent` at the limit), a per-run worker cap, parallelism, and each
worker's iteration budget. Unlimited recursion is not an option.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Callable

from ..core.events import EventKind
from ..safety.approval import DenyAll
from ..tools.permissions import PermissionLevel
from ..tools.registry import Tool, ToolContext, ToolResult
from .worker import BUILTIN_AGENTS, AgentSpec, linked_cancel, render_handoff, stricter

if TYPE_CHECKING:  # pragma: no cover
    from ..app import Harness
    from ..llm.provider import Model


@dataclass
class WorkerResult:
    agent: str
    status: str
    summary: str
    session_id: str

    def render(self) -> str:
        return f'<task-result agent="{self.agent}" status="{self.status}" session="{self.session_id}">\n{self.summary}\n</task-result>'


@dataclass
class Coordinator:
    parent: "Harness"
    agents: dict[str, AgentSpec] = field(default_factory=lambda: dict(BUILTIN_AGENTS))
    max_depth: int = 1
    max_workers: int = 8
    max_parallel: int = 3
    model_for: Callable[[AgentSpec], "Model"] | None = None
    spawned: int = 0
    _sem: asyncio.Semaphore = field(default_factory=lambda: asyncio.Semaphore(3))

    def __post_init__(self) -> None:
        self._sem = asyncio.Semaphore(self.max_parallel)

    async def run_worker(self, spec: AgentSpec, task: str) -> WorkerResult:
        from ..app import build_harness  # local import: app wires coordinators in

        if self.spawned >= self.max_workers:
            return WorkerResult(spec.name, "refused", f"worker cap ({self.max_workers}) reached", "-")
        self.spawned += 1
        p = self.parent
        allowed = set(spec.tools) & set(p.registry.names())  # never gain tools the parent lacks
        config = p.config.child(
            mode=stricter(spec.mode, p.config.mode),
            max_iterations=spec.max_iterations,
            enable_subagents=p.depth + 1 < self.max_depth,
        )
        # Background (read-only, parallel) workers cannot ask anyone: asks become denials.
        approver = DenyAll() if spec.read_only else p.approver
        model = self.model_for(spec) if self.model_for else p.model
        async with self._sem:
            child = build_harness(p.session.workspace, model, config, approver,
                                  depth=p.depth + 1, allowed_tools=allowed, parent_session_id=p.session.id)
            p.session.log.append(EventKind.SUBAGENT_STARTED, {"agent": spec.name, "child_session": child.session.id,
                                                              "depth": child.depth, "task": task})
            async with linked_cancel(p.loop.cancel, child.loop.cancel):
                result = await child.run(render_handoff(p.session.messages(), spec, task))
        p.session.log.append(EventKind.SUBAGENT_COMPLETED, {"agent": spec.name, "child_session": child.session.id,
                                                            "status": result.status})
        return WorkerResult(spec.name, result.status, result.final_text, child.session.id)

    # -- model-callable entry point ---------------------------------------
    def spawn_tool(self) -> Tool:
        names = sorted(self.agents)

        async def spawn_agent(args: dict, ctx: ToolContext) -> ToolResult:
            spec = self.agents[args["agent"]]
            res = await self.run_worker(spec, args["task"])
            return ToolResult(res.render(), is_error=res.status not in ("completed",))

        def accesses(args: dict, ctx: ToolContext):
            spec = self.agents.get(args.get("agent", ""))
            return [] if spec and spec.read_only else None  # read-only spawns may overlap

        roster = "; ".join(f"{n}: {self.agents[n].description}" for n in names)
        return Tool("spawn_agent", f"Delegate a sub-task to a sub-agent and get its report. Agents: {roster}",
                    {"type": "object", "properties": {"agent": {"type": "string", "enum": names},
                                                      "task": {"type": "string"}},
                     "required": ["agent", "task"], "additionalProperties": False},
                    spawn_agent, PermissionLevel.META, concurrency_safe=False, accesses=accesses, timeout_s=1800)

    # -- code-driven pipeline -------------------------------------------------
    async def run_phases(self, task: str, research_questions: list[str]) -> dict[str, Any]:
        research = await asyncio.gather(*(self.run_worker(self.agents["explorer"], q) for q in research_questions))
        findings = "\n\n".join(r.render() for r in research)  # synthesis = curated hand-off
        impl = await self.run_worker(self.agents["implementer"], f"{task}\n\n<findings>\n{findings}\n</findings>")
        verify = await self.run_worker(self.agents["verifier"], f"Verify this change: {task}\n\n{impl.summary}")
        return {"research": research, "implementation": impl, "verification": verify}

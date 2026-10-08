"""Composition root: the one place where subsystems are wired together.

Every subsystem above is constructed here and nowhere else. That keeps each
module testable in isolation and makes the architecture readable in one
screen: if you want to know what a harness *is*, read `build_harness`.
"""

from __future__ import annotations

import dataclasses
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .context.compaction import Compactor
from .context.manager import ContextBudget, ContextManager
from .context.memory import MemoryStore
from .context.repo_context import RepoContext
from .core.events import EventLog, secret_redactor
from .core.loop import AgentLoop, RunResult
from .core.middleware import AutoCompact, ContextWarning, CostLimit, Middleware, TokenLimit, TurnLimit
from .core.session import Session
from .core.state import IterationBudget
from .core.stuck import StuckDetector
from .extensions.hooks import HookBus
from .extensions.plugins import ToolServer, mcp_tools
from .extensions.skills import SkillRegistry
from .llm.provider import Model
from .safety.approval import Approver, DenyAll
from .safety.policy import Mode, PolicyEngine
from .safety.sandbox import CommandRunner
from .tools.builtins import FS_TOOLS, SHELL_TOOLS, make_tool_search
from .tools.executor import ToolExecutor
from .tools.registry import Tool, ToolContext, ToolRegistry
from .tools.scheduler import ToolScheduler
from .verification.engine import Validator, VerificationEngine, VerifyOnStop
from .verification.reflection import attach_reflection


@dataclass
class HarnessConfig:
    mode: Mode = Mode.DEFAULT
    max_iterations: int = 50
    max_turns: int | None = None
    max_total_tokens: int | None = None
    max_cost_usd: float | None = None
    context_window: int = 200_000
    compact_buffer: int = 13_000
    keep_tail: int = 6
    scheduler_policy: str = "resource"
    max_concurrency: int = 10
    stuck_halt_at: int | None = 5
    max_verification_attempts: int = 3
    validators: list[Validator] = field(default_factory=list)
    enable_subagents: bool = False
    max_depth: int = 1
    persist: bool = True                        # write the event log to .harness/sessions/
    extra_tools: list[Tool] = field(default_factory=list)
    tool_servers: list[ToolServer] = field(default_factory=list)
    secrets: list[str] = field(default_factory=list)

    def child(self, **overrides) -> "HarnessConfig":
        return dataclasses.replace(self, **overrides)


@dataclass
class Harness:
    session: Session
    loop: AgentLoop
    registry: ToolRegistry
    policy: PolicyEngine
    hooks: HookBus
    scheduler: ToolScheduler
    context: ContextManager
    verifier: VerificationEngine
    runner: CommandRunner
    model: Model
    approver: Approver
    config: HarnessConfig
    depth: int = 0
    coordinator: Any = None  # orchestration.coordinator.Coordinator when sub-agents are enabled

    async def run(self, task: str) -> RunResult:
        return await self.loop.run(task)


def build_harness(workspace: Path, model: Model, config: HarnessConfig | None = None,
                  approver: Approver | None = None, *, depth: int = 0, allowed_tools: set[str] | None = None,
                  parent_session_id: str | None = None) -> Harness:
    cfg = config or HarnessConfig()
    ws = workspace.resolve()
    state_dir = ws / ".harness"

    # Session substrate ------------------------------------------------------
    sid = uuid.uuid4().hex[:12]
    log = EventLog(state_dir / "sessions" / f"{sid}.jsonl" if cfg.persist else None,
                   redactor=secret_redactor(cfg.secrets))
    session = Session(ws, log, session_id=sid, parent_id=parent_session_id,
                      budget=IterationBudget(cfg.max_iterations))

    # Extensibility + memory -------------------------------------------------
    hooks = HookBus()
    skills = SkillRegistry([ws / ".agents" / "skills"])
    memory = MemoryStore(state_dir / "MEMORY.md")

    # Tools ----------------------------------------------------------------------
    registry = ToolRegistry()
    for t in [*FS_TOOLS, *SHELL_TOOLS, memory.tool(), *cfg.extra_tools]:
        registry.register(t)
    if skills.skills:
        registry.register(skills.tool())
    for server in cfg.tool_servers:
        for t in mcp_tools(server):  # deferred by default
            registry.register(t)
    registry.register(make_tool_search(registry))
    if allowed_tools is not None:
        registry = registry.subset(allowed_tools | {"tool_search"})

    # Context, safety, execution ---------------------------------------------------
    context = ContextManager(ws, RepoContext(ws), memory, skills,
                             ContextBudget(cfg.context_window, cfg.compact_buffer))
    context.attach(hooks)
    attach_reflection(hooks, ws)
    policy = PolicyEngine(mode=cfg.mode)
    approver = approver or DenyAll()
    runner = CommandRunner(ws)
    executor = ToolExecutor(registry, policy, hooks, approver)
    scheduler = ToolScheduler(executor, cfg.max_concurrency, cfg.scheduler_policy)
    verifier = VerificationEngine(list(cfg.validators), runner)

    middlewares: list[Middleware] = [AutoCompact(), ContextWarning()]
    if cfg.max_turns:
        middlewares.insert(0, TurnLimit(cfg.max_turns))
    if cfg.max_total_tokens:
        middlewares.insert(0, TokenLimit(cfg.max_total_tokens))
    if cfg.max_cost_usd:
        middlewares.insert(0, CostLimit(cfg.max_cost_usd))

    loop = AgentLoop(
        session=session, model=model, registry=registry, scheduler=scheduler, context=context,
        compactor=Compactor(model, cfg.keep_tail), hooks=hooks,
        tool_ctx=ToolContext(session, runner), middlewares=middlewares,
        stop_guard=VerifyOnStop(verifier, cfg.max_verification_attempts),
        stuck=StuckDetector(halt_at=cfg.stuck_halt_at),
    )
    harness = Harness(session, loop, registry, policy, hooks, scheduler, context, verifier,
                      runner, model, approver, cfg, depth)

    # Orchestration (opt-in, depth-limited) ---------------------------------------
    if cfg.enable_subagents and depth < cfg.max_depth:
        from .orchestration.coordinator import Coordinator

        harness.coordinator = Coordinator(harness, max_depth=cfg.max_depth)
        registry.register(harness.coordinator.spawn_tool())
    return harness

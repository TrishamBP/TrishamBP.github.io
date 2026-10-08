"""Sub-agent definitions, context inheritance, and cancellation linking.

Paper observations (§11):
* Claude Code forks context along six dimensions; the AbortController is
  linked "parent abort -> child abort, but not vice versa"; background agents'
  permission prompts resolve to denials; workers get a 16-tool whitelist and
  report via <task-notification> XML.
* Codex's SpawnAgentForkMode is FullHistory or LastNTurns(N), and forked
  history keeps only system/developer/user messages and final assistant
  answers, "filtering out intermediate tool calls and reasoning".
* Hermes intersects the child's toolsets with the parent's ("subagent must not
  gain tools the parent lacks"), blocklists recursion by default, and defaults
  to depth 1, three concurrent children, 50-iteration budgets.
"""

from __future__ import annotations

import asyncio
import contextlib
from dataclasses import dataclass
from typing import Any

from ..safety.policy import Mode

STRICTNESS = [Mode.YOLO, Mode.AUTO_EDIT, Mode.DEFAULT, Mode.PLAN]


def stricter(a: Mode, b: Mode) -> Mode:
    """A child may be more restricted than its parent, never less."""
    return a if STRICTNESS.index(a) >= STRICTNESS.index(b) else b


@dataclass(frozen=True)
class AgentSpec:
    name: str
    description: str
    tools: frozenset[str]
    mode: Mode
    instructions: str
    read_only: bool
    max_iterations: int = 20
    inherit: str = "fresh"  # "fresh" | "last_n" | "full"
    last_n: int = 2


BUILTIN_AGENTS: dict[str, AgentSpec] = {
    "explorer": AgentSpec(
        "explorer", "Read-only codebase research. Safe to run several in parallel.",
        frozenset({"read_file", "grep", "list_files"}), Mode.PLAN,
        "You are a research sub-agent. Do not modify anything. Answer the question with file paths and line numbers.",
        read_only=True, max_iterations=15),
    "implementer": AgentSpec(
        "implementer", "Makes code changes for a well-specified task.",
        frozenset({"read_file", "grep", "list_files", "edit_file", "write_file", "run_command"}), Mode.AUTO_EDIT,
        "You are an implementation sub-agent. Make the minimal change, run the relevant check, report what changed.",
        read_only=False, max_iterations=30, inherit="last_n"),
    "verifier": AgentSpec(
        "verifier", "Runs the project's checks and reports evidence. Never edits.",
        frozenset({"read_file", "grep", "list_files", "run_command"}), Mode.DEFAULT,
        "You are a verification sub-agent. Run the checks, report PASS or FAIL with the exact output. Do not edit.",
        read_only=True, max_iterations=10),
}


def inherited_messages(messages: list[dict[str, Any]], mode: str, last_n: int) -> list[dict[str, Any]]:
    """Codex-style filter: user messages and final assistant answers only."""
    if mode == "fresh":
        return []
    kept = [m for m in messages
            if m["role"] == "user" or (m["role"] == "assistant" and not m.get("tool_calls") and m.get("content"))]
    if mode == "last_n":
        user_idx = [i for i, m in enumerate(kept) if m["role"] == "user"]
        if len(user_idx) > last_n:
            kept = kept[user_idx[-last_n]:]
    return kept


def render_handoff(parent_messages: list[dict[str, Any]], spec: AgentSpec, task: str) -> str:
    inherited = inherited_messages(parent_messages, spec.inherit, spec.last_n)
    ctx = "\n".join(f"[{m['role']}] {m['content']}" for m in inherited)
    return (f"{spec.instructions}\n\n"
            + (f"<parent-context>\n{ctx}\n</parent-context>\n\n" if ctx else "")
            + f"<task>\n{task}\n</task>")


@contextlib.asynccontextmanager
async def linked_cancel(parent: asyncio.Event, child: asyncio.Event):
    """Parent cancellation propagates to the child; the reverse never happens."""

    async def watch() -> None:
        await parent.wait()
        child.set()

    watcher = asyncio.create_task(watch())
    try:
        yield child
    finally:
        watcher.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await watcher

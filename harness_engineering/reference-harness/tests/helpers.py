from __future__ import annotations

import asyncio
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from harness.core.session import Session  # noqa: E402
from harness.extensions.hooks import HookBus  # noqa: E402
from harness.safety.policy import Mode, PolicyEngine  # noqa: E402
from harness.safety.sandbox import CommandRunner  # noqa: E402
from harness.tools.builtins import FS_TOOLS, SHELL_TOOLS  # noqa: E402
from harness.tools.executor import ToolExecutor  # noqa: E402
from harness.tools.permissions import PermissionLevel  # noqa: E402
from harness.tools.registry import Access, Tool, ToolContext, ToolRegistry, ToolResult  # noqa: E402
from harness.tools.scheduler import ToolScheduler  # noqa: E402


def workspace(files: dict[str, str] | None = None) -> Path:
    ws = Path(tempfile.mkdtemp(prefix="harness-test-"))
    for rel, text in (files or {}).items():
        p = ws / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    return ws


def sleepy_tool(name: str, log: list, safe: bool, accesses=None, delay: float = 0.05) -> Tool:
    async def handler(args, ctx):
        log.append(("start", name, args.get("path")))
        await asyncio.sleep(delay)
        log.append(("end", name, args.get("path")))
        return ToolResult(f"{name} ok")

    return Tool(name, name, {"type": "object", "properties": {"path": {"type": "string"}},
                             "additionalProperties": False},
                handler, PermissionLevel.READ, concurrency_safe=safe, accesses=accesses)


def path_access(mode: str):
    return lambda args, ctx: [Access("path:" + args["path"], mode)]


def make_executor(ws: Path, tools: list[Tool] | None = None, mode: Mode = Mode.YOLO, approver=None):
    reg = ToolRegistry()
    for t in tools if tools is not None else [*FS_TOOLS, *SHELL_TOOLS]:
        reg.register(t)
    from harness.safety.approval import DenyAll

    ex = ToolExecutor(reg, PolicyEngine(mode=mode), HookBus(), approver or DenyAll())
    session = Session(ws)
    ctx = ToolContext(session, CommandRunner(ws))
    return ex, ctx


def make_scheduler(ws: Path, tools: list[Tool], policy: str = "resource"):
    ex, ctx = make_executor(ws, tools)
    return ToolScheduler(ex, policy=policy), ctx

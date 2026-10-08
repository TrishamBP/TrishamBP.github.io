"""run_command: one program per call, no shell, policy-gated.

The policy engine has already parsed and approved the command by the time
this handler runs; we parse again so the handler never trusts its input.
It declares no resources, so the scheduler always runs it alone - a command
can touch anything, and pretending otherwise is how races are born.
"""

from __future__ import annotations

from ...safety.policy import parse_command
from ..permissions import PermissionLevel
from ..registry import Tool, ToolContext, ToolResult


async def run_command(args: dict, ctx: ToolContext) -> ToolResult:
    argv = parse_command(args["command"])
    res = await ctx.runner.run(argv, timeout_s=float(args.get("timeout_s", 60)))
    if res.exit_code == 0 and not res.timed_out:
        ctx.session.state.mark_evidence()  # fresh verification evidence for verify-on-stop
    return ToolResult(res.render(), is_error=res.exit_code != 0, metadata={"exit_code": res.exit_code})


SHELL_TOOLS = [
    Tool("run_command", "Run one program (no shell operators) in the workspace, e.g. 'python -m unittest -q'.",
         {"type": "object", "properties": {"command": {"type": "string"}, "timeout_s": {"type": "integer"}},
          "required": ["command"], "additionalProperties": False},
         run_command, PermissionLevel.EXECUTE, concurrency_safe=False, accesses=None, timeout_s=300),
]

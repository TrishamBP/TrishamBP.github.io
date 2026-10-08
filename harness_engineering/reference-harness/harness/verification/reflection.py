"""In-loop reflection: cheap deterministic checks appended to edit results.

Paper observations: Aider's lint pipeline starts with a syntax check and uses
grep_ast's TreeContext "to show code context around error lines" (§6.3);
OpenCode appends LSP diagnostics to every edit result (§8.4). This hook is the
smallest version of that idea for Python files: compile, and on failure show
the offending lines - in the same tool result, before the model moves on.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..extensions.hooks import HookBus, HookEvent, HookResult


def syntax_feedback(path: Path) -> str | None:
    if path.suffix != ".py" or not path.is_file():
        return None
    source = path.read_text(encoding="utf-8")
    try:
        compile(source, str(path), "exec")
    except SyntaxError as e:
        lines = source.splitlines()
        lo, hi = max(0, (e.lineno or 1) - 3), min(len(lines), (e.lineno or 1) + 2)
        window = "\n".join(f"{'>' if i + 1 == e.lineno else ' '}{i + 1:5}: {lines[i]}" for i in range(lo, hi))
        return f"<diagnostics>\nSyntaxError: {e.msg} (line {e.lineno})\n{window}\n</diagnostics>"
    return None


def attach_reflection(hooks: HookBus, workspace: Path) -> None:
    async def check(payload: dict[str, Any]) -> HookResult | None:
        result = payload["result"]
        rel = result.metadata.get("path")
        if result.is_error or not rel:
            return None
        fb = syntax_feedback(workspace / rel)
        return HookResult(append=fb) if fb else None

    hooks.on(HookEvent.POST_TOOL_USE, check, matcher="edit_file")
    hooks.on(HookEvent.POST_TOOL_USE, check, matcher="write_file")

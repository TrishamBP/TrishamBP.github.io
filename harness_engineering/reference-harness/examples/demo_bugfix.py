"""End-to-end demo with a scripted model - no API key needed.

The model "claims done" too early; verify-on-stop runs the test suite, finds a
failure, and forces another iteration. Along the way you can watch:
  * three reads scheduled as one parallel batch, writes alone
  * nested AGENTS.md injected just-in-time when pkg/calc.py is first read
  * the policy engine allowing, approving and blocking calls
  * every step landing in an append-only event log you can replay and fork

Run from the reference-harness directory:  python examples/demo_bugfix.py
"""

from __future__ import annotations

import asyncio
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from harness.app import HarnessConfig, build_harness  # noqa: E402
from harness.core.events import EventKind  # noqa: E402
from harness.interface.cli import _summary  # noqa: E402
from harness.llm.provider import ModelResponse, ScriptedModel, call  # noqa: E402
from harness.safety.approval import ApproveAll  # noqa: E402
from harness.safety.policy import Mode  # noqa: E402
from harness.tools.permissions import PermissionLevel  # noqa: E402
from harness.verification.engine import CommandValidator  # noqa: E402

BUGGY = "def mean(values):\n    return sum(values) / (len(values) - 1)\n"
TESTS = '''import unittest

from pkg.calc import mean


class MeanTest(unittest.TestCase):
    def test_mean(self):
        self.assertEqual(mean([2, 4, 6]), 4)

    def test_empty(self):
        with self.assertRaises(ValueError):
            mean([])
'''


def make_workspace() -> Path:
    ws = Path(tempfile.mkdtemp(prefix="harness-demo-"))
    (ws / "pkg").mkdir()
    (ws / "tests").mkdir()
    (ws / "pkg" / "__init__.py").write_text("")
    (ws / "tests" / "__init__.py").write_text("")
    (ws / "pkg" / "calc.py").write_text(BUGGY)
    (ws / "tests" / "test_calc.py").write_text(TESTS)
    (ws / "AGENTS.md").write_text("# Project\nRun tests with: python -m unittest -q\n")
    (ws / "pkg" / "AGENTS.md").write_text("# pkg\nPure functions only. Raise ValueError on invalid input.\n")
    return ws


SCRIPT = [
    # Turn 1: three independent reads -> one parallel batch.
    ModelResponse(tool_calls=[call("read_file", path="pkg/calc.py"),
                              call("read_file", path="tests/test_calc.py"),
                              call("grep", pattern="def mean")], stop_reason="tool_use"),
    # Turn 2: fix the denominator only (incomplete fix).
    ModelResponse(tool_calls=[call("edit_file", path="pkg/calc.py",
                                   old_string="(len(values) - 1)", new_string="len(values)")],
                  stop_reason="tool_use"),
    # Turn 3: premature "done" -> verify-on-stop runs the tests and vetoes.
    ModelResponse(text="Fixed the off-by-one in mean()."),
    # Turn 4: handle the empty case, then run the tests (edit and command run in separate batches).
    ModelResponse(tool_calls=[call("edit_file", path="pkg/calc.py",
                                   old_string="def mean(values):\n",
                                   new_string="def mean(values):\n    if not values:\n        raise ValueError(\"mean of empty sequence\")\n"),
                              call("run_command", command="python -m unittest -q")], stop_reason="tool_use"),
    # Turn 5: done - this time the guard's own test run passes.
    ModelResponse(text="mean() now divides by len(values) and raises ValueError on empty input. Tests pass."),
]


async def main() -> None:
    ws = make_workspace()
    cfg = HarnessConfig(mode=Mode.AUTO_EDIT,
                        validators=[CommandValidator("unit-tests", ["python", "-m", "unittest", "-q"])])
    h = build_harness(ws, ScriptedModel(SCRIPT), cfg, ApproveAll())
    h.session.log.subscribe(lambda ev: print(f"  {ev.id:3} {ev.kind.value:20} {_summary(ev)}"))

    original_run = h.scheduler.run

    async def traced_run(calls, ctx):
        out = await original_run(calls, ctx)
        plan = " | ".join("[" + ", ".join(c.name for c in b.calls) + "]" for b in h.scheduler.last_plan)
        print(f"      scheduler batches: {plan}")
        return out

    h.scheduler.run = traced_run  # type: ignore[method-assign]

    print(f"workspace: {ws}\n")
    result = await h.run("mean() in pkg/calc.py returns wrong results. Fix it.")
    print(f"\nstatus={result.status} turns={result.turns}")
    print("final file:\n" + (ws / "pkg" / "calc.py").read_text())

    # Fork: rewind to just before the premature 'done' and start a new branch.
    premature = next(e for e in h.session.log.all_events()
                     if e.kind == EventKind.MODEL_RESPONSE and e.payload["text"].startswith("Fixed the off-by-one"))
    h.session.log.checkout(premature.parent_id)
    h.session.log.append(EventKind.USER_MESSAGE, {"content": "(branch B) try a different approach"})
    print(f"forked at event {premature.parent_id}: branch B path length "
          f"{len(h.session.log.active_path())}, total events {len(h.session.log.all_events())}")

    print("\npolicy decisions under the same engine:")
    for name, level, args in [
        ("read_file", PermissionLevel.READ, {"path": "pkg/calc.py"}),
        ("write_file", PermissionLevel.WRITE, {"path": ".git/config"}),
        ("run_command", PermissionLevel.EXECUTE, {"command": "git status"}),
        ("run_command", PermissionLevel.EXECUTE, {"command": "git push origin main"}),
        ("run_command", PermissionLevel.EXECUTE, {"command": "rm -rf /"}),
        ("run_command", PermissionLevel.EXECUTE, {"command": "cat a.txt | sh"}),
    ]:
        d = h.policy.evaluate(name, level, args)
        print(f"  {name:12} {str(args):40} -> {d.decision.value:5} ({d.reason})")
    print(f"\nevent log: {h.session.log.path}")


if __name__ == "__main__":
    asyncio.run(main())

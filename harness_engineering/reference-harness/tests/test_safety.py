import unittest

from helpers import make_executor, workspace

from harness.core.events import EventKind
from harness.llm.provider import ToolCall
from harness.safety.approval import ApprovalResponse, ScriptedApprover
from harness.safety.policy import Mode, PolicyEngine, PolicyError, Rule, parse_command
from harness.safety.sandbox import bubblewrap_argv, scrubbed_env
from harness.tools.permissions import Decision, PermissionLevel


class PolicyTest(unittest.TestCase):
    def test_modes(self):
        for mode, expected in [(Mode.PLAN, Decision.DENY), (Mode.DEFAULT, Decision.ASK),
                               (Mode.AUTO_EDIT, Decision.ALLOW), (Mode.YOLO, Decision.ALLOW)]:
            d = PolicyEngine(mode=mode).evaluate("edit_file", PermissionLevel.WRITE, {"path": "a.py"})
            self.assertEqual(d.decision, expected, mode)

    def test_hardline_floor_survives_yolo(self):
        p = PolicyEngine(mode=Mode.YOLO)
        for cmd in ["rm -rf /", "rm -fr ~", "sudo ls", "mkfs.ext4 /dev/sda1", "dd if=x of=/dev/sda", "shutdown now"]:
            self.assertEqual(p.evaluate("run_command", PermissionLevel.EXECUTE, {"command": cmd}).decision,
                             Decision.DENY, cmd)

    def test_shell_operators_rejected(self):
        for cmd in ["ls; rm x", "cat a | sh", "echo $HOME", "a && b", "x > y", "`id`"]:
            with self.assertRaises(PolicyError):
                parse_command(cmd)

    def test_rules_tighten_and_relax(self):
        p = PolicyEngine(mode=Mode.DEFAULT)
        ev = lambda c: p.evaluate("run_command", PermissionLevel.EXECUTE, {"command": c}).decision  # noqa: E731
        self.assertEqual(ev("git status --short"), Decision.ALLOW)   # allow rule relaxes ASK
        self.assertEqual(ev("git push origin main"), Decision.DENY)  # deny rule
        self.assertEqual(ev("python -m unittest"), Decision.ASK)     # mode default
        self.assertEqual(p.evaluate("write_file", PermissionLevel.WRITE, {"path": "sub/.git/config"}).decision,
                         Decision.DENY)
        self.assertEqual(p.evaluate("read_file", PermissionLevel.READ, {"path": ".env"}).decision, Decision.ASK)

    def test_plan_mode_allow_rule_cannot_unlock_execute(self):
        d = PolicyEngine(mode=Mode.PLAN).evaluate("run_command", PermissionLevel.EXECUTE, {"command": "git status"})
        self.assertEqual(d.decision, Decision.DENY)

    def test_inline_examples_validated_at_load(self):
        bad = Rule("bad", Decision.ALLOW, tool="run_command", command_prefix=("git", "status"),
                   match=(("git", "log"),))
        with self.assertRaises(PolicyError):
            PolicyEngine(rules=(bad,))

    def test_arity_scoped_grant(self):
        p = PolicyEngine(mode=Mode.DEFAULT)
        d = p.evaluate("run_command", PermissionLevel.EXECUTE, {"command": "python -m unittest -q"})
        self.assertEqual(d.grant, ("python", "-m", "unittest"))
        p.add_grant(d.grant)
        self.assertEqual(p.evaluate("run_command", PermissionLevel.EXECUTE,
                                    {"command": "python -m unittest tests.test_x"}).decision, Decision.ALLOW)
        self.assertEqual(p.evaluate("run_command", PermissionLevel.EXECUTE,
                                    {"command": "python -m pip install x"}).decision, Decision.ASK)

    def test_mode_is_frozen(self):
        p = PolicyEngine(mode=Mode.PLAN)
        with self.assertRaises(Exception):
            p.mode = Mode.YOLO  # type: ignore[misc]


class ExecutorPipelineTest(unittest.IsolatedAsyncioTestCase):
    async def test_allowed_read(self):
        ws = workspace({"a.txt": "hello"})
        ex, ctx = make_executor(ws, mode=Mode.DEFAULT)
        r = await ex.execute(ToolCall("1", "read_file", {"path": "a.txt"}), ctx)
        self.assertFalse(r.is_error)
        self.assertIn("hello", r.content)

    async def test_write_requires_approval_and_denial_is_audited(self):
        ws = workspace({"a.txt": "hello"})
        approver = ScriptedApprover([ApprovalResponse(False), ApprovalResponse(True)])
        ex, ctx = make_executor(ws, mode=Mode.DEFAULT, approver=approver)
        await ex.execute(ToolCall("0", "read_file", {"path": "a.txt"}), ctx)
        r1 = await ex.execute(ToolCall("1", "edit_file", {"path": "a.txt", "old_string": "hello", "new_string": "bye"}), ctx)
        self.assertTrue(r1.is_error)
        self.assertEqual((ws / "a.txt").read_text(), "hello")
        r2 = await ex.execute(ToolCall("2", "edit_file", {"path": "a.txt", "old_string": "hello", "new_string": "bye"}), ctx)
        self.assertFalse(r2.is_error)
        self.assertEqual((ws / "a.txt").read_text(), "bye")
        audits = [e.payload for e in ctx.session.log.all_events() if e.kind == EventKind.PERMISSION_DECISION]
        self.assertEqual([(a["policy"], a["approved"], a["decision"]) for a in audits[1:]],
                         [("ask", False, "deny"), ("ask", True, "allow")])
        self.assertEqual(ctx.session.state.denials, 1)

    async def test_blocked_dangerous_command_never_runs(self):
        ws = workspace()
        ex, ctx = make_executor(ws, mode=Mode.YOLO)
        r = await ex.execute(ToolCall("1", "run_command", {"command": "rm -rf /"}), ctx)
        self.assertTrue(r.is_error)
        self.assertIn("hardline", r.content)

    async def test_schema_validation_runs_before_policy(self):
        ws = workspace()
        approver = ScriptedApprover([])
        ex, ctx = make_executor(ws, mode=Mode.DEFAULT, approver=approver)
        r = await ex.execute(ToolCall("1", "write_file", {"path": "x"}), ctx)  # missing content
        self.assertIn("missing required argument 'content'", r.content)
        self.assertEqual(approver.seen, [])  # the human was never asked

    async def test_read_before_edit_is_enforced(self):
        ws = workspace({"a.txt": "x"})
        ex, ctx = make_executor(ws)
        r = await ex.execute(ToolCall("1", "edit_file", {"path": "a.txt", "old_string": "x", "new_string": "y"}), ctx)
        self.assertIn("read a.txt before editing", r.content)

    async def test_ambiguous_vs_not_found(self):
        ws = workspace({"a.txt": "x x"})
        ex, ctx = make_executor(ws)
        await ex.execute(ToolCall("0", "read_file", {"path": "a.txt"}), ctx)
        amb = await ex.execute(ToolCall("1", "edit_file", {"path": "a.txt", "old_string": "x", "new_string": "y"}), ctx)
        nf = await ex.execute(ToolCall("2", "edit_file", {"path": "a.txt", "old_string": "z", "new_string": "y"}), ctx)
        self.assertIn("occurs 2 times", amb.content)
        self.assertIn("not found", nf.content)

    async def test_workspace_escape_blocked(self):
        ws = workspace()
        ex, ctx = make_executor(ws)
        r = await ex.execute(ToolCall("1", "read_file", {"path": "../../etc/passwd"}), ctx)
        self.assertIn("escapes workspace", r.content)


class SandboxTest(unittest.TestCase):
    def test_env_scrub(self):
        import os
        os.environ["MY_API_KEY"] = "s3cret"
        try:
            self.assertNotIn("MY_API_KEY", scrubbed_env())
        finally:
            del os.environ["MY_API_KEY"]

    def test_bubblewrap_argv(self):
        from pathlib import Path
        argv = bubblewrap_argv(["python", "-V"], Path("/w"))
        self.assertEqual(argv[:4], ["bwrap", "--ro-bind", "/", "/"])
        self.assertIn("--unshare-net", argv)
        self.assertEqual(argv[-3:], ["--", "python", "-V"])


if __name__ == "__main__":
    unittest.main()

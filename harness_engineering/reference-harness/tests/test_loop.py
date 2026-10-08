import unittest

from helpers import workspace

from harness.app import HarnessConfig, build_harness
from harness.core.events import EventKind, EventLog
from harness.extensions.hooks import HookEvent, HookResult
from harness.llm.provider import ModelResponse, ScriptedModel, ToolCall, call
from harness.safety.approval import ApproveAll
from harness.safety.policy import Mode
from harness.verification.engine import CallableValidator


def kinds(h):
    return [e.kind for e in h.session.log.all_events()]


class MinimalLoopTest(unittest.IsolatedAsyncioTestCase):
    async def test_prompt_tool_observation_answer(self):
        ws = workspace({"a.txt": "42"})
        model = ScriptedModel([ModelResponse(tool_calls=[call("read_file", path="a.txt")], stop_reason="tool_use"),
                               ModelResponse(text="The file says 42.")])
        h = build_harness(ws, model, HarnessConfig(persist=False))
        res = await h.run("What does a.txt say?")
        self.assertEqual(res.status, "completed")
        second = model.requests[1]["messages"]
        self.assertEqual(second[-1]["role"], "tool")
        self.assertIn("42", second[-1]["content"])

    async def test_root_context_in_prompt_and_nested_context_jit(self):
        ws = workspace({"AGENTS.md": "ROOT RULES", "pkg/AGENTS.md": "PKG RULES", "pkg/m.py": "x = 1\n"})
        model = ScriptedModel([
            ModelResponse(tool_calls=[call("read_file", path="pkg/m.py")], stop_reason="tool_use"),
            ModelResponse(tool_calls=[call("read_file", path="pkg/m.py", offset=0)], stop_reason="tool_use"),
            ModelResponse(text="ok")])
        h = build_harness(ws, model, HarnessConfig(persist=False))
        await h.run("look")
        system = model.requests[0]["system"]
        self.assertIn("ROOT RULES", system.dynamic)
        self.assertNotIn("PKG RULES", system.render())          # not eager
        results = [e.payload["content"] for e in h.session.log.all_events() if e.kind == EventKind.TOOL_RESULT]
        self.assertIn("PKG RULES", results[0])                  # injected on first touch
        self.assertNotIn("PKG RULES", results[1])               # only once
        self.assertEqual(model.requests[0]["system"].static, model.requests[2]["system"].static)  # cache-stable


class VerifyOnStopTest(unittest.IsolatedAsyncioTestCase):
    async def _harness(self, script, validators, attempts=3):
        ws = workspace({"f.py": "x = 1\n"})
        cfg = HarnessConfig(mode=Mode.AUTO_EDIT, validators=validators, max_verification_attempts=attempts, persist=False)
        return build_harness(ws, ScriptedModel(script), cfg, ApproveAll()), ws

    def edit_script(self):
        return [ModelResponse(tool_calls=[call("read_file", path="f.py")], stop_reason="tool_use"),
                ModelResponse(tool_calls=[call("edit_file", path="f.py", old_string="x = 1", new_string="x = 2")],
                              stop_reason="tool_use")]

    async def test_veto_then_pass(self):
        state = {"ok": False}

        async def check(ws):
            return state["ok"], "ok" if state["ok"] else "x must be 3"

        def fix(messages):
            state["ok"] = True
            return ModelResponse(text="done for real")

        script = self.edit_script() + [ModelResponse(text="done"), fix]
        h, _ = await self._harness(script, [CallableValidator("check", check)])
        res = await h.run("set x")
        self.assertEqual(res.status, "completed")
        vetoes = [e for e in h.session.log.all_events()
                  if e.kind == EventKind.USER_MESSAGE and "verification-failed" in e.payload["content"]]
        self.assertEqual(len(vetoes), 1)
        self.assertIn("x must be 3", vetoes[0].payload["content"])

    async def test_gives_up_as_unverified_never_as_success(self):
        async def never(ws):
            return False, "still broken"

        script = self.edit_script() + [ModelResponse(text="done")] * 5
        h, _ = await self._harness(script, [CallableValidator("check", never)], attempts=2)
        res = await h.run("set x")
        self.assertEqual(res.status, "unverified")

    async def test_hermes_mode_requires_model_evidence(self):
        script = self.edit_script() + [
            ModelResponse(text="done"),  # vetoed: no passing check after the edit
            ModelResponse(tool_calls=[call("run_command", command="python -c pass")], stop_reason="tool_use"),
            ModelResponse(text="done, checked")]
        h, _ = await self._harness(script, [])
        res = await h.run("set x")
        self.assertEqual(res.status, "completed")
        self.assertEqual(h.session.state.verification_attempts, 1)

    async def test_no_mutation_no_verification(self):
        async def boom(ws):
            raise AssertionError("must not run")

        h, _ = await self._harness([ModelResponse(text="nothing to do")], [CallableValidator("c", boom)])
        self.assertEqual((await h.run("q")).status, "completed")


class LoopGuardsTest(unittest.IsolatedAsyncioTestCase):
    async def test_truncated_tool_calls_are_not_executed(self):
        ws = workspace({"a.txt": "x"})
        model = ScriptedModel([
            ModelResponse(tool_calls=[call("write_file", path="new.txt", content="partial")], stop_reason="max_tokens"),
            ModelResponse(text="ok")])
        h = build_harness(ws, model, HarnessConfig(mode=Mode.YOLO, persist=False))
        await h.run("go")
        self.assertFalse((ws / "new.txt").exists())
        self.assertIn("cut off", model.requests[1]["messages"][-1]["content"])

    async def test_stuck_detection_warns_then_halts(self):
        ws = workspace({"a.txt": "x"})
        model = ScriptedModel([ModelResponse(tool_calls=[call("read_file", path="missing.txt")], stop_reason="tool_use")
                               for _ in range(10)])
        h = build_harness(ws, model, HarnessConfig(stuck_halt_at=4, persist=False))
        res = await h.run("go")
        self.assertEqual(res.status, "stuck")
        self.assertNotIn("stuck-warning", model.requests[2]["messages"][-1]["content"])  # 1 prior failure
        self.assertIn("already failed 2 times", model.requests[3]["messages"][-1]["content"])

    async def test_budget_grace_turn_has_no_tools(self):
        ws = workspace({"a.txt": "x"})
        model = ScriptedModel([ModelResponse(tool_calls=[call("list_files")], stop_reason="tool_use")] * 3
                              + [ModelResponse(text="summary")])
        h = build_harness(ws, model, HarnessConfig(max_iterations=3, stuck_halt_at=None, persist=False))
        res = await h.run("go")
        self.assertEqual((res.status, res.final_text), ("budget_exhausted", "summary"))
        self.assertEqual(model.requests[-1]["tools"], [])

    async def test_cost_limit_middleware(self):
        ws = workspace()
        r = ModelResponse(tool_calls=[call("list_files")], stop_reason="tool_use")
        r.usage.cost_usd = 0.6
        h = build_harness(ws, ScriptedModel([r, r, r]), HarnessConfig(max_cost_usd=1.0, stuck_halt_at=None, persist=False))
        self.assertEqual((await h.run("go")).status, "cost_limit($1.00)")

    async def test_stop_hook_can_veto(self):
        ws = workspace()
        model = ScriptedModel([ModelResponse(text="first"), ModelResponse(text="second")])
        h = build_harness(ws, model, HarnessConfig(persist=False))
        calls = {"n": 0}

        async def once(payload):
            calls["n"] += 1
            return HookResult(block=True, append="Also update the changelog.") if calls["n"] == 1 else None

        h.hooks.on(HookEvent.STOP, once)
        res = await h.run("go")
        self.assertEqual(res.final_text, "second")


class DeferredToolsTest(unittest.IsolatedAsyncioTestCase):
    async def test_tool_search_loads_tool_for_next_turn(self):
        from harness.tools.permissions import PermissionLevel
        from harness.tools.registry import Tool, ToolResult

        async def deploy(args, ctx):
            return ToolResult("deployed")

        hidden = Tool("deploy_preview", "Deploy a preview environment for the current branch",
                      {"type": "object", "properties": {}}, deploy, PermissionLevel.META, defer=True,
                      keywords=("vercel", "preview"))
        ws = workspace()
        model = ScriptedModel([
            ModelResponse(tool_calls=[call("deploy_preview")], stop_reason="tool_use"),          # not loaded yet
            ModelResponse(tool_calls=[call("tool_search", query="preview deploy")], stop_reason="tool_use"),
            ModelResponse(tool_calls=[call("deploy_preview")], stop_reason="tool_use"),
            ModelResponse(text="done")])
        h = build_harness(ws, model, HarnessConfig(extra_tools=[hidden], persist=False))
        await h.run("deploy")
        visible = lambda i: {t["name"] for t in model.requests[i]["tools"]}  # noqa: E731
        self.assertNotIn("deploy_preview", visible(0))
        self.assertIn("deploy_preview", visible(2))
        results = [e.payload["content"] for e in h.session.log.all_events() if e.kind == EventKind.TOOL_RESULT]
        self.assertIn("not loaded", results[0])
        self.assertEqual(results[2], "deployed")


class EventSourcingTest(unittest.IsolatedAsyncioTestCase):
    async def test_replay_from_disk_reproduces_projection(self):
        ws = workspace({"a.txt": "hello"})
        model = ScriptedModel([ModelResponse(tool_calls=[call("read_file", path="a.txt")], stop_reason="tool_use"),
                               ModelResponse(text="hello it says")])
        h = build_harness(ws, model, HarnessConfig())
        await h.run("read it")
        reloaded = EventLog(h.session.log.path)
        self.assertEqual([e.to_json() for e in reloaded.all_events()],
                         [e.to_json() for e in h.session.log.all_events()])
        from harness.core.session import Session
        s2 = Session(ws, reloaded)
        self.assertEqual(s2.messages(), h.session.messages())

    async def test_fork_keeps_both_branches(self):
        log = EventLog()
        a = log.append(EventKind.USER_MESSAGE, {"content": "task"})
        log.append(EventKind.MODEL_RESPONSE, {"text": "branch A"})
        log.checkout(a.id)
        log.append(EventKind.MODEL_RESPONSE, {"text": "branch B"})
        self.assertEqual([e.payload.get("text") for e in log.active_path()], [None, "branch B"])
        self.assertEqual(len(log.children(a.id)), 2)

    async def test_secret_redaction_before_disk(self):
        ws = workspace({"a.txt": "token=sk-live-123"})
        model = ScriptedModel([ModelResponse(tool_calls=[call("read_file", path="a.txt")], stop_reason="tool_use"),
                               ModelResponse(text="ok")])
        h = build_harness(ws, model, HarnessConfig(secrets=["sk-live-123"]))
        await h.run("read")
        self.assertNotIn("sk-live-123", h.session.log.path.read_text())


class CompactionTest(unittest.IsolatedAsyncioTestCase):
    async def test_threshold_compaction_merges_previous_summary_and_keeps_task(self):
        ws = workspace({"a.txt": "x" * 4000})
        steps = []
        for i in range(6):
            steps.append(ModelResponse(tool_calls=[call("read_file", path="a.txt", limit=i + 1)], stop_reason="tool_use"))
        model = ScriptedModel(steps + [ModelResponse(text="done")])
        summarizer = ScriptedModel([ModelResponse(text=f"## Objective\nsummary {i}") for i in range(10)])
        cfg = HarnessConfig(context_window=3000, compact_buffer=500, keep_tail=2, stuck_halt_at=None, persist=False)
        h = build_harness(ws, model, cfg)
        h.loop.compactor.model = summarizer
        await h.run("ORIGINAL TASK")
        compactions = [e for e in h.session.log.all_events() if e.kind == EventKind.COMPACTION]
        self.assertGreaterEqual(len(compactions), 2)
        second_prompt = summarizer.requests[1]["messages"][0]["content"]
        self.assertIn("<previous-summary>", second_prompt)
        last_request = model.requests[-1]["messages"]
        self.assertEqual(last_request[0]["content"], "ORIGINAL TASK")
        self.assertIn("conversation-summary", last_request[1]["content"])
        self.assertNotEqual(last_request[2]["role"], "tool")  # tail never starts orphaned


if __name__ == "__main__":
    unittest.main()

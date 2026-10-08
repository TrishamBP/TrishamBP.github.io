import unittest

from helpers import make_scheduler, path_access, sleepy_tool, workspace

from harness.llm.provider import ToolCall


def names(plan):
    return [[c.id for c in b.calls] for b in plan]


class SchedulerPlanTest(unittest.TestCase):
    def setUp(self):
        self.ws = workspace()
        log = []
        self.tools = [
            sleepy_tool("read", log, safe=True, accesses=path_access("r")),
            sleepy_tool("write", log, safe=False, accesses=path_access("w")),
            sleepy_tool("bash", log, safe=False, accesses=None),
            sleepy_tool("search", log, safe=True),
        ]

    def plan(self, calls, policy="resource"):
        sched, ctx = make_scheduler(self.ws, self.tools, policy)
        return names(sched.plan(calls, ctx))

    def test_reads_batch_together(self):
        calls = [ToolCall("1", "read", {"path": "a"}), ToolCall("2", "read", {"path": "b"}),
                 ToolCall("3", "search", {})]
        self.assertEqual(self.plan(calls), [["1", "2", "3"]])

    def test_write_conflicts_with_read_of_same_file(self):
        calls = [ToolCall("1", "read", {"path": "a"}), ToolCall("2", "write", {"path": "a"}),
                 ToolCall("3", "read", {"path": "a"})]
        self.assertEqual(self.plan(calls), [["1"], ["2"], ["3"]])

    def test_writes_to_disjoint_files_share_a_batch(self):
        calls = [ToolCall("1", "write", {"path": "a"}), ToolCall("2", "write", {"path": "b"})]
        self.assertEqual(self.plan(calls), [["1", "2"]])

    def test_path_prefix_overlap_conflicts(self):
        calls = [ToolCall("1", "read", {"path": "src"}), ToolCall("2", "write", {"path": "src/x.py"})]
        self.assertEqual(self.plan(calls), [["1"], ["2"]])

    def test_undeclared_tool_runs_alone(self):
        calls = [ToolCall("1", "read", {"path": "a"}), ToolCall("2", "bash", {}), ToolCall("3", "read", {"path": "b"})]
        self.assertEqual(self.plan(calls), [["1"], ["2"], ["3"]])

    def test_wait_for_previous_forces_new_batch(self):
        calls = [ToolCall("1", "read", {"path": "a"}), ToolCall("2", "read", {"path": "b", "wait_for_previous": True})]
        self.assertEqual(self.plan(calls), [["1"], ["2"]])

    def test_boolean_policy_matches_claude_code_partition(self):
        # disjoint writes are NOT parallelized under boolean partitioning
        calls = [ToolCall("1", "read", {"path": "a"}), ToolCall("2", "read", {"path": "b"}),
                 ToolCall("3", "write", {"path": "c"}), ToolCall("4", "write", {"path": "d"}),
                 ToolCall("5", "read", {"path": "e"})]
        self.assertEqual(self.plan(calls, "boolean"), [["1", "2"], ["3"], ["4"], ["5"]])
        self.assertEqual(self.plan(calls, "resource"), [["1", "2", "3", "4", "5"]])


class SchedulerRunTest(unittest.IsolatedAsyncioTestCase):
    async def test_batch_runs_concurrently_and_results_keep_order(self):
        ws = workspace()
        log = []
        tools = [sleepy_tool("read", log, safe=True, accesses=path_access("r")),
                 sleepy_tool("write", log, safe=False, accesses=path_access("w"))]
        sched, ctx = make_scheduler(ws, tools)
        calls = [ToolCall("1", "read", {"path": "a"}), ToolCall("2", "read", {"path": "b"}),
                 ToolCall("3", "write", {"path": "a"})]
        results = await sched.run(calls, ctx)
        self.assertEqual([c.id for c, _ in results], ["1", "2", "3"])
        # both reads started before either finished; the write started after both ended
        self.assertEqual([e[0] for e in log[:2]], ["start", "start"])
        self.assertEqual(log[4], ("start", "write", "a"))


if __name__ == "__main__":
    unittest.main()

"""Command-line interface.

    python -m harness.interface.cli run --workspace DIR --task "..." [--mode default] [--verify "python -m unittest -q"]
    python -m harness.interface.cli replay DIR/.harness/sessions/<id>.jsonl
    python -m harness.interface.cli tree   DIR/.harness/sessions/<id>.jsonl

`run` needs a real model (the optional Anthropic adapter). `replay` and `tree`
read the event log only - no model, no workspace access - which is the point:
the log is a complete, inspectable record of what the agent did.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import shlex
from pathlib import Path

from ..core.events import EventKind, EventLog
from ..safety.approval import ConsoleApprover
from ..safety.policy import Mode


def _summary(ev) -> str:
    p = ev.payload
    if ev.kind == EventKind.MODEL_RESPONSE:
        calls = ", ".join(c["name"] for c in p.get("tool_calls", []))
        return (p.get("text", "")[:80].replace("\n", " ") + (f" -> [{calls}]" if calls else "")).strip()
    if ev.kind == EventKind.TOOL_RESULT:
        return f"{p['name']}: {'ERROR ' if p.get('is_error') else ''}{p['content'][:70]!r}"
    if ev.kind == EventKind.PERMISSION_DECISION:
        via = " after approval" if p.get("approved") else (" (approval refused)" if p.get("approved") is False else "")
        return f"{p['tool']} {p['decision']}{via} ({p['reason']})"
    if ev.kind == EventKind.VERIFICATION_RESULT:
        return f"{p['validator']} {'PASS' if p['passed'] else 'FAIL'}"
    return json.dumps(p)[:90]


def replay(path: Path) -> None:
    for ev in EventLog(path).all_events():
        print(f"{ev.id:4} <-{ev.parent_id or 0:<4} {ev.kind.value:20} {_summary(ev)}")


def tree(path: Path) -> None:
    log = EventLog(path)

    def walk(parent, depth):
        for child in log.children(parent):
            print("  " * depth + f"{child.id} {child.kind.value}")
            walk(child.id, depth + 1)

    walk(None, 0)


async def _run(args) -> None:
    from ..app import HarnessConfig, build_harness
    from ..llm.anthropic_provider import AnthropicModel
    from ..verification.engine import CommandValidator

    validators = [CommandValidator("verify", shlex.split(args.verify))] if args.verify else []
    cfg = HarnessConfig(mode=Mode(args.mode), validators=validators, max_iterations=args.max_iterations)
    h = build_harness(Path(args.workspace), AnthropicModel(), cfg, ConsoleApprover())
    h.session.log.subscribe(lambda ev: print(f"  [{ev.kind.value}] {_summary(ev)}"))
    result = await h.run(args.task)
    print(f"\nstatus={result.status} turns={result.turns} session={result.session_id}\n{result.final_text}")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="harness")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--workspace", required=True)
    r.add_argument("--task", required=True)
    r.add_argument("--mode", default="default", choices=[m.value for m in Mode])
    r.add_argument("--verify", help="command whose exit code verifies the task, e.g. 'python -m unittest -q'")
    r.add_argument("--max-iterations", type=int, default=50)
    for name in ("replay", "tree"):
        sub.add_parser(name).add_argument("log")
    args = ap.parse_args(argv)
    if args.cmd == "run":
        asyncio.run(_run(args))
    elif args.cmd == "replay":
        replay(Path(args.log))
    else:
        tree(Path(args.log))


if __name__ == "__main__":
    main()

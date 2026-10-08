"""Deterministic verification and the verify-on-stop guard.

Paper observations:
* Aider (§6.3): after each edit, a lint pipeline (syntax -> compile -> flake8)
  plus test failures feed a `reflected_message` back to the model, up to 3
  reflections.
* Hermes (§6.2): the verify-on-stop guard "rewrites a text-only response into
  a continuation whenever the turn mutated code files without producing fresh
  verification evidence" - the reflection loop's function relocated to the
  stop condition.
* OpenHands (§11.4): an outer /goal loop runs an LLM judge after each run.

Reference implementation proposed in the article: the guard supports two
modes. With validators configured, the *harness* runs them (Aider-style
deterministic signals, evaluated at Hermes' position). With none configured,
it falls back to Hermes' rule: the model itself must have produced a passing
check (a zero-exit run_command) after its last mutation.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, Protocol

from ..core.events import EventKind
from ..core.session import Session
from ..safety.sandbox import CommandRunner


@dataclass(frozen=True)
class Evidence:
    validator: str
    passed: bool
    details: str
    turn: int


class Validator(Protocol):
    name: str

    async def check(self, session: Session, runner: CommandRunner) -> Evidence: ...


@dataclass
class CommandValidator:
    """Tests, linters, type checkers: anything whose exit code is the verdict."""

    name: str
    argv: list[str]
    timeout_s: float = 300

    async def check(self, session: Session, runner: CommandRunner) -> Evidence:
        res = await runner.run(self.argv, timeout_s=self.timeout_s)
        tail = (res.stdout + "\n" + res.stderr).strip()[-3000:]
        return Evidence(self.name, res.exit_code == 0 and not res.timed_out, tail, session.state.turns)


@dataclass
class ExpectedFilesValidator:
    paths: list[str]
    name: str = "expected-files"

    async def check(self, session: Session, runner: CommandRunner) -> Evidence:
        missing = [p for p in self.paths if not (session.workspace / p).exists()]
        return Evidence(self.name, not missing, f"missing: {missing}" if missing else "all present", session.state.turns)


@dataclass
class DiffValidator:
    """Passes only if the session actually changed something (guards 'done' with no work)."""

    name: str = "non-empty-diff"

    async def check(self, session: Session, runner: CommandRunner) -> Evidence:
        if (session.workspace / ".git").exists():
            res = await runner.run(["git", "diff", "--stat"])
            changed = bool(res.stdout.strip())
        else:
            changed = bool(session.state.files_modified)
        return Evidence(self.name, changed, "changes present" if changed else "no changes", session.state.turns)


@dataclass
class CallableValidator:
    name: str
    fn: Callable[[Path], Awaitable[tuple[bool, str]]]

    async def check(self, session: Session, runner: CommandRunner) -> Evidence:
        ok, details = await self.fn(session.workspace)
        return Evidence(self.name, ok, details, session.state.turns)


class VerificationEngine:
    def __init__(self, validators: list[Validator], runner: CommandRunner):
        self.validators = validators
        self.runner = runner

    async def run(self, session: Session) -> list[Evidence]:
        results = []
        for v in self.validators:  # sequential: validators often share the tree
            ev = await v.check(session, self.runner)
            results.append(ev)
            session.log.append(EventKind.VERIFICATION_RESULT,
                               {"validator": ev.validator, "passed": ev.passed, "details": ev.details, "turn": ev.turn})
        if results and all(e.passed for e in results):
            session.state.mark_verified()
        return results


class VerifyOnStop:
    """Called when the model returns a final answer. Returns a continuation
    message to veto the stop, or None to allow it."""

    def __init__(self, engine: VerificationEngine, max_attempts: int = 3):
        self.engine = engine
        self.max_attempts = max_attempts

    async def __call__(self, session: Session) -> str | None:
        st = session.state
        if not st.has_unverified_changes:
            return None
        if not self.engine.validators:  # Hermes mode: the model must show evidence
            if st.last_evidence_tick > st.last_mutation_tick:
                st.mark_verified()
                return None
            evidence_msg = "You modified files but ran no passing check afterwards."
        else:
            results = await self.engine.run(session)
            failed = [e for e in results if not e.passed]
            if not failed:
                return None
            evidence_msg = "\n\n".join(f"[{e.validator}] FAILED\n{e.details}" for e in failed)
        st.verification_attempts += 1
        if st.verification_attempts > self.max_attempts:
            st.stop_reason = "verification_failed"
            return None  # stop, but the run is reported as unverified, never as success
        return (f"<verification-failed attempt=\"{st.verification_attempts}/{self.max_attempts}\">\n"
                f"{evidence_msg}\n</verification-failed>\n"
                "The task is not complete. Fix the problem, re-run the check, then finish.")

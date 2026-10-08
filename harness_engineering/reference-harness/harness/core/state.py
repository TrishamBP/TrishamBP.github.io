"""Mutable per-session runtime state.

Everything here is *derived* bookkeeping the loop needs between turns
(budgets, which files were read or modified, verification freshness). The
durable record is the event log; this is the working set.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class IterationBudget:
    """Bounded loop budget with a final grace turn.

    Paper observation (§6.2): Hermes bounds each user turn with a thread-safe
    IterationBudget (default 90) plus "a final grace call that lets the model
    summarize when the budget expires". We keep the same shape, single-threaded.
    """

    max_iterations: int = 50
    used: int = 0
    grace_used: bool = False

    def consume(self) -> None:
        self.used += 1

    @property
    def exhausted(self) -> bool:
        return self.used >= self.max_iterations


@dataclass
class SessionState:
    turns: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    files_read: set[str] = field(default_factory=set)
    files_modified: set[str] = field(default_factory=set)
    # Logical clock: every mutation, passing check, and verification gets a tick,
    # so "was this verified AFTER the last edit?" has an unambiguous answer.
    clock: int = 0
    last_mutation_tick: int = -1
    last_evidence_tick: int = -1   # model ran a check that passed (exit 0)
    last_verified_tick: int = -1   # harness-run validators all passed
    verification_attempts: int = 0
    denials: int = 0
    loaded_tools: set[str] = field(default_factory=set)  # deferred tools pulled in
    stop_reason: str | None = None

    def mark_read(self, path: str) -> None:
        self.files_read.add(path)

    def _tick(self) -> int:
        self.clock += 1
        return self.clock

    def mark_modified(self, path: str) -> None:
        self.files_modified.add(path)
        self.last_mutation_tick = self._tick()

    def mark_evidence(self) -> None:
        self.last_evidence_tick = self._tick()

    def mark_verified(self) -> None:
        self.last_verified_tick = self._tick()

    @property
    def has_unverified_changes(self) -> bool:
        return self.last_mutation_tick > max(self.last_verified_tick, -1)

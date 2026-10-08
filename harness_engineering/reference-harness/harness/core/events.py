"""Append-only event log with a movable head (session tree).

Inspired by two observations in the Harness Engineering paper (§6.2, §9.5):

* OpenHands appends every event to a persistent EventLog (one file per event,
  secret redaction) and treats the LLM's view of history as a *projection* of
  the active branch of a conversation tree.
* Pi stores the session as an append-only JSONL tree where every entry carries
  id/parentId and a movable leaf pointer defines the active branch.

This module is the reference implementation proposed in the article, not a
port of either system: one JSONL file, one event per line, parent pointers,
and a head pointer. Forking is "move the head"; nothing is ever deleted.
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Iterator


class EventKind(str, Enum):
    USER_MESSAGE = "user_message"
    MODEL_RESPONSE = "model_response"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    PERMISSION_DECISION = "permission_decision"
    VERIFICATION_RESULT = "verification_result"
    COMPACTION = "compaction"
    SUBAGENT_STARTED = "subagent_started"
    SUBAGENT_COMPLETED = "subagent_completed"
    SESSION_COMPLETED = "session_completed"


@dataclass(frozen=True)
class Event:
    id: int
    parent_id: int | None
    kind: EventKind
    payload: dict[str, Any]
    ts: float = field(default_factory=time.time)

    def to_json(self) -> str:
        d = asdict(self)
        d["kind"] = self.kind.value
        return json.dumps(d, sort_keys=True)

    @staticmethod
    def from_json(line: str) -> "Event":
        d = json.loads(line)
        return Event(d["id"], d["parent_id"], EventKind(d["kind"]), d["payload"], d["ts"])


Redactor = Callable[[dict[str, Any]], dict[str, Any]]


class EventLog:
    """Append-only, tree-shaped event store.

    `append` always attaches the new event under the current head and moves
    the head to it. `checkout(event_id)` moves the head back to any earlier
    event, so the next append starts a new branch (fork / rewind). The old
    branch stays in the file - replay, audit, and branch navigation all work.
    """

    def __init__(self, path: Path | None = None, redactor: Redactor | None = None):
        self.path = path
        self.redactor = redactor or (lambda p: p)
        self._events: dict[int, Event] = {}
        self.head: int | None = None
        self._listeners: list[Callable[[Event], None]] = []
        if path is not None and path.exists():
            self._load(path)

    # -- writing ---------------------------------------------------------
    def append(self, kind: EventKind, payload: dict[str, Any]) -> Event:
        ev = Event(
            id=len(self._events) + 1,
            parent_id=self.head,
            kind=kind,
            payload=self.redactor(payload),
        )
        self._events[ev.id] = ev
        self.head = ev.id
        if self.path is not None:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("a", encoding="utf-8") as f:
                f.write(ev.to_json() + "\n")
        for listener in self._listeners:
            listener(ev)
        return ev

    def subscribe(self, listener: Callable[[Event], None]) -> None:
        """Observability hook: every appended event is pushed to listeners."""
        self._listeners.append(listener)

    # -- branching ---------------------------------------------------------
    def checkout(self, event_id: int) -> None:
        if event_id not in self._events:
            raise KeyError(f"no event {event_id}")
        self.head = event_id

    # -- reading -------------------------------------------------------------
    def get(self, event_id: int) -> Event:
        return self._events[event_id]

    def all_events(self) -> list[Event]:
        snapshot = dict(self._events)  # C-level copy: safe against a concurrent append
        return [snapshot[i] for i in sorted(snapshot)]

    def active_path(self) -> list[Event]:
        """Root-to-head path: the branch the model currently 'lives on'."""
        path: list[Event] = []
        cursor = self.head
        while cursor is not None:
            ev = self._events[cursor]
            path.append(ev)
            cursor = ev.parent_id
        return list(reversed(path))

    def children(self, event_id: int | None) -> list[Event]:
        return [e for e in self.all_events() if e.parent_id == event_id]

    def __iter__(self) -> Iterator[Event]:
        return iter(self.all_events())

    def _load(self, path: Path) -> None:
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                ev = Event.from_json(line)
                self._events[ev.id] = ev
        # Head is the last *written* event; branch navigation is explicit.
        if self._events:
            self.head = max(self._events)


def secret_redactor(secrets: list[str]) -> Redactor:
    """Replace known secret values before they ever reach disk (OpenHands-style)."""

    def _redact(obj: Any) -> Any:
        if isinstance(obj, str):
            for s in secrets:
                if s:
                    obj = obj.replace(s, "<redacted>")
            return obj
        if isinstance(obj, dict):
            return {k: _redact(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_redact(v) for v in obj]
        return obj

    return lambda payload: _redact(payload)

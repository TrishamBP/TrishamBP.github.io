"""Permission metadata attached to every tool.

Tools *declare* what they are; the policy engine (harness.safety.policy)
*decides* what is allowed. Keeping the two separate is what lets the same
tool run under PLAN, DEFAULT, AUTO_EDIT, or YOLO modes without code changes.
"""

from __future__ import annotations

from enum import Enum


class PermissionLevel(str, Enum):
    READ = "read"          # observes the workspace, no side effects
    WRITE = "write"        # mutates files inside the workspace
    EXECUTE = "execute"    # runs a process
    NETWORK = "network"    # talks to the outside world
    META = "meta"          # harness-internal (tool_search, load_skill, ...)


class Decision(str, Enum):
    ALLOW = "allow"
    ASK = "ask"
    DENY = "deny"

    @property
    def severity(self) -> int:
        return {"allow": 0, "ask": 1, "deny": 2}[self.value]

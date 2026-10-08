"""Policy-as-code: what runs, what asks, what is forbidden.

Paper observations this module draws on (§10):
* Codex: execution-policy rules in Starlark, `prefix_rule(pattern=[...],
  decision="allow|prompt|forbidden", match=[...], not_match=[...])`, where the
  inline examples are validated at parse time - test cases inside the policy.
* Gemini CLI: an ApprovalMode enum (PLAN / DEFAULT / AUTO_EDIT / YOLO).
* Hermes: a twelve-pattern hardline floor (rm -rf /, mkfs, dd to block
  devices, fork bombs, shutdown) that survives --yolo, with the YOLO flag
  frozen at import "so a prompt-injected skill cannot flip it at runtime".
* OpenCode: "always allow" grants scoped by command arity (git -> 2,
  npm run -> 3), producing grants like `git commit *`.
* Codex re-marks protected paths (.git, ...) read-only inside writable roots;
  Mistral Vibe forces ASK for sensitive patterns like .env.

The combination - mode defaults, data-defined rules with validated examples,
an unbypassable floor, arity-scoped session grants - is the reference design
proposed in the article.
"""

from __future__ import annotations

import fnmatch
import re
import shlex
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from ..tools.permissions import Decision, PermissionLevel


class Mode(str, Enum):
    PLAN = "plan"
    DEFAULT = "default"
    AUTO_EDIT = "auto_edit"
    YOLO = "yolo"


A, Q, D = Decision.ALLOW, Decision.ASK, Decision.DENY
MODE_DEFAULTS: dict[Mode, dict[PermissionLevel, Decision]] = {
    Mode.PLAN: {PermissionLevel.READ: A, PermissionLevel.META: A, PermissionLevel.WRITE: D,
                PermissionLevel.EXECUTE: D, PermissionLevel.NETWORK: D},
    Mode.DEFAULT: {PermissionLevel.READ: A, PermissionLevel.META: A, PermissionLevel.WRITE: Q,
                   PermissionLevel.EXECUTE: Q, PermissionLevel.NETWORK: Q},
    Mode.AUTO_EDIT: {PermissionLevel.READ: A, PermissionLevel.META: A, PermissionLevel.WRITE: A,
                     PermissionLevel.EXECUTE: Q, PermissionLevel.NETWORK: Q},
    Mode.YOLO: {p: A for p in PermissionLevel},
}

SHELL_OPERATORS = re.compile(r"[;&|<>`$\n]")


class PolicyError(ValueError):
    pass


def parse_command(command: str) -> list[str]:
    """Split a command into argv WITHOUT a shell.

    Shell operators are rejected outright: one program per call. This is the
    property that keeps the executor from being a general shell. (OpenCode goes
    further and parses with tree-sitter; this is the simplest safe subset.)
    """
    if SHELL_OPERATORS.search(command):
        raise PolicyError("shell operators (; & | < > ` $ newline) are not supported; run one program per call")
    argv = shlex.split(command, posix=True)
    if not argv:
        raise PolicyError("empty command")
    return argv


# -- the floor ---------------------------------------------------------------
def _is_recursive_root_delete(argv: list[str]) -> bool:
    if argv[0] not in ("rm", "rmdir"):
        return False
    flags = "".join(a for a in argv[1:] if a.startswith("-"))
    targets = [a for a in argv[1:] if not a.startswith("-")]
    return ("r" in flags or "R" in flags) and any(t in ("/", "/*", "~", "~/", ".", "..", "*") for t in targets)


HARDLINE: list[tuple[str, Any]] = [
    ("recursive delete of root/home/cwd", _is_recursive_root_delete),
    ("filesystem format", lambda a: a[0].startswith("mkfs")),
    ("raw write to block device", lambda a: a[0] == "dd" and any(x.startswith("of=/dev/") for x in a)),
    ("power state change", lambda a: a[0] in ("shutdown", "reboot", "halt", "poweroff")),
    ("privilege escalation", lambda a: a[0] in ("sudo", "su", "doas")),
    ("world-writable chmod", lambda a: a[0] == "chmod" and "777" in a),
]


def hardline_violation(argv: list[str]) -> str | None:
    for label, predicate in HARDLINE:
        if predicate(argv):
            return label
    return None


# -- rules ----------------------------------------------------------------------
@dataclass(frozen=True)
class Rule:
    id: str
    decision: Decision
    tool: str = "*"                               # fnmatch on tool name
    command_prefix: tuple[str, ...] | None = None  # argv prefix (execute tools)
    path_glob: str | None = None                  # fnmatch on workspace-relative path
    levels: tuple[PermissionLevel, ...] | None = None  # restrict to these permission levels
    match: tuple[tuple[str, ...], ...] = ()       # argv examples that MUST match
    not_match: tuple[tuple[str, ...], ...] = ()   # argv examples that must NOT match

    def matches_argv(self, argv: list[str] | tuple[str, ...]) -> bool:
        if self.command_prefix is None:
            return False
        return tuple(argv[: len(self.command_prefix)]) == self.command_prefix

    def applies(self, tool: str, level: PermissionLevel, argv: list[str] | None, path: str | None) -> bool:
        if not fnmatch.fnmatch(tool, self.tool):
            return False
        if self.levels is not None and level not in self.levels:
            return False
        if self.command_prefix is not None and (argv is None or not self.matches_argv(argv)):
            return False
        if self.path_glob is not None and (path is None or not _path_match(path, self.path_glob)):
            return False
        return True

    def self_test(self) -> None:
        """Codex-style inline examples, checked when the policy is loaded."""
        for ex in self.match:
            if not self.matches_argv(ex):
                raise PolicyError(f"rule {self.id}: example {list(ex)} should match but does not")
        for ex in self.not_match:
            if self.matches_argv(ex):
                raise PolicyError(f"rule {self.id}: example {list(ex)} should not match but does")


def _path_match(path: str, glob: str) -> bool:
    """Match a workspace-relative path at the root or below any directory."""
    p = path.replace("\\", "/")
    if p.startswith("./"):
        p = p[2:]
    return fnmatch.fnmatch(p, glob) or fnmatch.fnmatch(p, "*/" + glob)


DEFAULT_RULES: tuple[Rule, ...] = (
    Rule("protect-git", D, path_glob=".git/*", levels=(PermissionLevel.WRITE,)),
    Rule("ask-dotenv", Q, path_glob=".env*"),
    Rule("allow-git-read", A, tool="run_command", command_prefix=("git", "status"),
         match=(("git", "status"), ("git", "status", "--short")), not_match=(("git", "push"),)),
    Rule("allow-git-diff", A, tool="run_command", command_prefix=("git", "diff")),
    Rule("deny-git-push", D, tool="run_command", command_prefix=("git", "push")),
)

# Arity dictionary for "always allow" grants (OpenCode ships a ~130-entry one).
ARITY: dict[tuple[str, ...], int] = {("git",): 2, ("npm", "run"): 3, ("python", "-m"): 3, ("pytest",): 1}


def grant_key(argv: list[str]) -> tuple[str, ...]:
    for prefix, n in sorted(ARITY.items(), key=lambda kv: -len(kv[0])):
        if tuple(argv[: len(prefix)]) == prefix:
            return tuple(argv[:n])
    return tuple(argv[:1])


@dataclass(frozen=True)
class PolicyDecision:
    decision: Decision
    reason: str
    rule: str | None = None
    grant: tuple[str, ...] | None = None  # what an "always allow" answer would cover


@dataclass(frozen=True)
class PolicyEngine:
    """Frozen configuration: mode and rules cannot be mutated by the agent."""

    mode: Mode = Mode.DEFAULT
    rules: tuple[Rule, ...] = DEFAULT_RULES
    session_grants: set[tuple[str, ...]] = field(default_factory=set, compare=False)

    def __post_init__(self) -> None:
        for r in self.rules:
            r.self_test()

    def evaluate(self, tool_name: str, permission: PermissionLevel, args: dict[str, Any]) -> PolicyDecision:
        argv: list[str] | None = None
        if permission == PermissionLevel.EXECUTE:
            try:
                argv = parse_command(str(args.get("command", "")))
            except PolicyError as e:
                return PolicyDecision(D, str(e), "parse")
            violation = hardline_violation(argv)
            if violation:  # the floor: evaluated before mode, survives YOLO
                return PolicyDecision(D, f"blocked by hardline floor: {violation}", "hardline")
        path = args.get("path")

        decision = MODE_DEFAULTS[self.mode][permission]
        reason, rule_id = f"mode={self.mode.value} default for {permission.value}", None
        for rule in self.rules:
            if not rule.applies(tool_name, permission, argv, path):
                continue
            if rule.decision == D:
                return PolicyDecision(D, f"denied by rule {rule.id}", rule.id)
            if rule.decision == Q and decision == A and self.mode != Mode.YOLO:
                decision, reason, rule_id = Q, f"rule {rule.id} requires approval", rule.id
            if rule.decision == A and decision == Q:
                decision, reason, rule_id = A, f"allowed by rule {rule.id}", rule.id

        if decision == Q and argv is not None and grant_key(argv) in self.session_grants:
            return PolicyDecision(A, f"session grant {' '.join(grant_key(argv))} *", "grant")
        return PolicyDecision(decision, reason, rule_id, grant_key(argv) if argv else None)

    def add_grant(self, key: tuple[str, ...]) -> None:
        self.session_grants.add(key)

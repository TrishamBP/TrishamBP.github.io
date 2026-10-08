"""Tool abstraction, schema validation, and the registry.

What the paper observed (§8.2-8.3):
* Claude Code's 43 tools each declare validation, permission checking,
  concurrency safety, and UI rendering as separate interface concerns, and
  default to isConcurrencySafe = false.
* OpenHands' parallel executor locks on each tool's *declared resources*
  (files, terminal session, browser), so only same-resource calls serialize.
* Deferred loading: Claude Code hides `shouldDefer` tools from the initial
  prompt and exposes ToolSearchTool (keyword search + `select:<name>`);
  Codex and Hermes rank deferred tools with BM25.

The `Tool` dataclass below combines those ideas into one contract. That
combination is a proposed design, not any single system's interface.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, Awaitable, Callable

from .permissions import PermissionLevel

if TYPE_CHECKING:  # pragma: no cover
    from ..core.session import Session
    from ..safety.sandbox import CommandRunner


@dataclass(frozen=True)
class Access:
    """A resource a tool call touches, and how. Resources are path-like strings."""

    resource: str
    mode: str  # "r" | "w"

    def conflicts_with(self, other: "Access") -> bool:
        if "w" not in (self.mode, other.mode):
            return False  # concurrent reads never conflict
        a, b = self.resource.rstrip("/"), other.resource.rstrip("/")
        return a == b or a.startswith(b + "/") or b.startswith(a + "/")


@dataclass
class ToolResult:
    content: str
    is_error: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolContext:
    session: "Session"
    runner: "CommandRunner"
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def workspace(self) -> Path:
        return self.session.workspace

    def resolve(self, path: str) -> Path:
        """Resolve a model-supplied path and refuse anything outside the workspace."""
        p = (self.workspace / path).resolve()
        if p != self.workspace and self.workspace not in p.parents:
            raise PermissionError(f"path escapes workspace: {path}")
        return p


Handler = Callable[[dict[str, Any], ToolContext], Awaitable[ToolResult]]
AccessFn = Callable[[dict[str, Any], ToolContext], list[Access]]


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]          # JSON-schema subset (object/properties/required)
    handler: Handler
    permission: PermissionLevel = PermissionLevel.READ
    concurrency_safe: bool = False      # safe default: opt in to parallelism
    accesses: AccessFn | None = None    # declared resources; None = unknown -> exclusive
    defer: bool = False                 # hidden until discovered via tool_search
    keywords: tuple[str, ...] = ()
    timeout_s: float = 60.0
    prompt_snippet: str = ""            # per-tool guidance; prompt co-varies with toolset (Pi)

    def schema(self) -> dict[str, Any]:
        return {"name": self.name, "description": self.description, "parameters": self.parameters}

    def declared_accesses(self, args: dict[str, Any], ctx: ToolContext) -> list[Access] | None:
        if self.accesses is None:
            return [] if self.concurrency_safe else None
        try:
            return self.accesses(args, ctx)
        except Exception:
            return None  # cannot reason about it -> treat as exclusive


# ---------------------------------------------------------------------------
# Schema validation (a deliberately small JSON-schema subset).
# Validation happens *before* permission checks: a malformed call should never
# reach a human approval prompt.
_TYPES: dict[str, tuple[type, ...]] = {
    "string": (str,),
    "integer": (int,),
    "number": (int, float),
    "boolean": (bool,),
    "array": (list,),
    "object": (dict,),
}


def validate_args(schema: dict[str, Any], args: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(args, dict):
        return ["arguments must be a JSON object"]
    if "__invalid_json__" in args:
        return ["arguments were not valid JSON"]
    props: dict[str, Any] = schema.get("properties", {})
    for req in schema.get("required", []):
        if req not in args:
            errors.append(f"missing required argument '{req}'")
    for key, value in args.items():
        if key == "wait_for_previous":
            continue  # harness-injected scheduling knob (see scheduler.py)
        if key not in props:
            if schema.get("additionalProperties", False) is False:
                errors.append(f"unexpected argument '{key}'")
            continue
        expected = props[key].get("type")
        wrong_type = bool(expected) and not isinstance(value, _TYPES[expected])
        bool_as_int = expected in ("integer", "number") and isinstance(value, bool)
        if wrong_type or bool_as_int:
            errors.append(f"argument '{key}' must be {expected}")
        if "enum" in props[key] and value not in props[key]["enum"]:
            errors.append(f"argument '{key}' must be one of {props[key]['enum']}")
    return errors


# ---------------------------------------------------------------------------
class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> Tool:
        if tool.name in self._tools:
            raise ValueError(f"duplicate tool {tool.name}")
        self._tools[tool.name] = tool
        return tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def names(self) -> list[str]:
        return sorted(self._tools)

    def subset(self, allowed: set[str]) -> "ToolRegistry":
        """New registry restricted to `allowed` (used for sub-agent tool filtering)."""
        r = ToolRegistry()
        for n in sorted(allowed & set(self._tools)):
            r.register(self._tools[n])
        return r

    def visible(self, loaded: set[str]) -> list[Tool]:
        """Tools whose schemas go into this turn's request, in a stable order.

        Stable ordering matters: the tool list sits in the cached prompt prefix.
        """
        return [t for n, t in sorted(self._tools.items()) if not t.defer or n in loaded]

    def deferred(self) -> list[Tool]:
        return [t for _, t in sorted(self._tools.items()) if t.defer]

    # -- deferred-tool discovery ---------------------------------------------
    def search(self, query: str, limit: int = 5) -> list[Tool]:
        """`select:a,b` direct selection, else BM25 over name/description/keywords."""
        if query.startswith("select:"):
            wanted = [q.strip() for q in query[len("select:"):].split(",")]
            return [self._tools[w] for w in wanted if w in self._tools]
        docs = self.deferred()
        if not docs:
            return []
        tokenized = [_tokens(f"{t.name} {t.description} {' '.join(t.keywords)}") for t in docs]
        q = _tokens(query)
        return [docs[i] for i in _bm25_rank(q, tokenized)[:limit]]


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower().replace("_", " "))


def _bm25_rank(query: list[str], docs: list[list[str]], k1: float = 1.2, b: float = 0.75) -> list[int]:
    n = len(docs)
    avgdl = sum(len(d) for d in docs) / n
    df = Counter(term for d in docs for term in set(d))
    scores = []
    for i, d in enumerate(docs):
        tf = Counter(d)
        s = 0.0
        for term in query:
            if term not in tf:
                continue
            idf = math.log(1 + (n - df[term] + 0.5) / (df[term] + 0.5))
            s += idf * tf[term] * (k1 + 1) / (tf[term] + k1 * (1 - b + b * len(d) / avgdl))
        scores.append((s, i))
    return [i for s, i in sorted(scores, key=lambda x: (-x[0], x[1])) if s > 0]

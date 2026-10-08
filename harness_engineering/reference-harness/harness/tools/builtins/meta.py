"""tool_search: on-demand discovery of deferred tools.

Paper observation (§8.3): Claude Code's ToolSearchTool supports keyword search
and direct selection (`select:<tool_name>`); Codex backs its tool_search with
a BM25 index over tool specs. Discovered tools join the session's loaded set,
so their schemas appear in the *next* request - the initial prompt stays small.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from ..permissions import PermissionLevel
from ..registry import Tool, ToolContext, ToolResult

if TYPE_CHECKING:  # pragma: no cover
    from ..registry import ToolRegistry


def make_tool_search(registry: "ToolRegistry") -> Tool:
    async def tool_search(args: dict, ctx: ToolContext) -> ToolResult:
        hits = registry.search(args["query"], limit=int(args.get("limit", 5)))
        if not hits:
            return ToolResult("No matching tools.")
        for t in hits:
            ctx.session.state.loaded_tools.add(t.name)
        listing = [{"name": t.name, "description": t.description, "parameters": t.parameters} for t in hits]
        return ToolResult("Loaded these tools; they are callable from your next turn:\n" + json.dumps(listing, indent=2))

    return Tool(
        "tool_search",
        "Find and load additional tools. Query with keywords, or 'select:name1,name2' to load by name.",
        {"type": "object", "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}},
         "required": ["query"], "additionalProperties": False},
        tool_search, PermissionLevel.META, concurrency_safe=True,
    )

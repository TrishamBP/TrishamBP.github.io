"""Plugins and MCP-style tool servers.

Paper observations (§12): plugins in the corpus contribute tools, skills,
hooks and agents (Codex, OpenHands, OpenClaw); OpenClaw enforces strict import
boundaries (plugins may only use the public SDK surface); Pi trust-gates
repo-controlled extensions; Codex defers MCP tools by default behind a BM25
tool_search; Mistral Vibe namespaces MCP tools as {server_name}_{tool_name};
Hermes scans MCP tool descriptions for injection payloads.

`ToolServer` is an in-process stand-in for an MCP server (list_tools /
call_tool). A real deployment would put an MCP client behind the same
protocol; the harness side - namespacing, deferral, scanning, delimiting -
does not change.
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from typing import Any, Protocol

from ..safety.untrusted import scan_injection, wrap_untrusted
from ..tools.permissions import PermissionLevel
from ..tools.registry import Tool, ToolContext, ToolRegistry, ToolResult
from .hooks import HookBus


@dataclass
class PluginAPI:
    """The only surface a plugin gets (OpenClaw-style import boundary)."""

    registry: ToolRegistry
    hooks: HookBus

    def add_tool(self, tool: Tool) -> None:
        self.registry.register(tool)


class Plugin(Protocol):
    name: str

    def register(self, api: PluginAPI) -> None: ...


def load_plugins(specs: list[str], api: PluginAPI, trusted: bool) -> list[str]:
    """Load 'package.module:attr' plugins. Loading code is a trust decision:
    callers must pass trusted=True explicitly (Pi gates repo-controlled config)."""
    if not trusted:
        return []
    loaded = []
    for spec in specs:
        module_name, attr = spec.split(":")
        plugin: Plugin = getattr(importlib.import_module(module_name), attr)
        plugin.register(api)
        loaded.append(plugin.name)
    return loaded


class ToolServer(Protocol):
    name: str

    def list_tools(self) -> list[dict[str, Any]]: ...

    async def call_tool(self, name: str, args: dict[str, Any]) -> str: ...


def mcp_tools(server: ToolServer, permission: PermissionLevel = PermissionLevel.NETWORK,
              defer: bool = True) -> list[Tool]:
    tools = []
    for spec in server.list_tools():
        if scan_injection(spec.get("description", "")):
            continue  # a poisoned description never reaches the prompt

        async def handler(args: dict, ctx: ToolContext, _name: str = spec["name"]) -> ToolResult:
            out = await server.call_tool(_name, args)
            return ToolResult(wrap_untrusted(out, f"mcp:{server.name}/{_name}"))

        tools.append(Tool(
            name=f"{server.name}__{spec['name']}",
            description=f"[{server.name}] {spec.get('description', '')}",
            parameters=spec.get("input_schema", {"type": "object", "properties": {}}),
            handler=handler,
            permission=permission,
            concurrency_safe=False,
            defer=defer,
            keywords=(server.name,),
        ))
    return tools

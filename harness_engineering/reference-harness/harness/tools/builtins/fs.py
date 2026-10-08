"""File tools: read, write, exact-match edit, list, grep.

Editing contract: exact unique-substring replacement, the contract the paper
reports frontier-model harnesses converging on (Claude Code; Mistral Vibe
migrated to it mid-2026, §8.4), with OpenCode's distinction between
"not found" and "ambiguous" errors.

Read-before-edit is enforced in code. The paper notes OpenCode's edit-tool
description claims this enforcement but "no runtime read-tracking exists in
the tool's source" - prompt text is a wish, not a mechanism (§7.3).
"""

from __future__ import annotations

import re
from pathlib import Path

from ..permissions import PermissionLevel
from ..registry import Access, Tool, ToolContext, ToolResult

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", ".harness"}
MAX_GREP_RESULTS = 100


def _key(p: Path) -> str:
    return "path:" + p.as_posix()


def _path_access(mode: str, arg: str = "path"):
    def accesses(args: dict, ctx: ToolContext) -> list[Access]:
        return [Access(_key(ctx.resolve(str(args.get(arg, ".")))), mode)]
    return accesses


def _rel(p: Path, ctx: ToolContext) -> str:
    return p.relative_to(ctx.workspace).as_posix() if p != ctx.workspace else "."


async def read_file(args: dict, ctx: ToolContext) -> ToolResult:
    p = ctx.resolve(args["path"])
    if not p.is_file():
        return ToolResult(f"ERROR: no such file: {args['path']}", True)
    lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
    offset, limit = int(args.get("offset", 0)), int(args.get("limit", 2000))
    ctx.session.state.mark_read(_rel(p, ctx))
    body = "\n".join(f"{i + 1:5}: {ln}" for i, ln in enumerate(lines[offset:offset + limit], start=offset))
    return ToolResult(body or "(empty file)", metadata={"path": _rel(p, ctx)})


async def write_file(args: dict, ctx: ToolContext) -> ToolResult:
    p = ctx.resolve(args["path"])
    rel = _rel(p, ctx)
    if p.exists() and rel not in ctx.session.state.files_read:
        return ToolResult(f"ERROR: {rel} exists and has not been read in this session; read it first.", True)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(args["content"], encoding="utf-8")
    ctx.session.state.mark_modified(rel)
    ctx.session.state.mark_read(rel)
    return ToolResult(f"wrote {len(args['content'])} chars to {rel}", metadata={"path": rel})


async def edit_file(args: dict, ctx: ToolContext) -> ToolResult:
    p = ctx.resolve(args["path"])
    rel = _rel(p, ctx)
    if not p.is_file():
        return ToolResult(f"ERROR: no such file: {rel}", True)
    if rel not in ctx.session.state.files_read:
        return ToolResult(f"ERROR: read {rel} before editing it.", True)
    text = p.read_text(encoding="utf-8")
    old, new = args["old_string"], args["new_string"]
    count = text.count(old)
    if count == 0:
        return ToolResult(f"ERROR: old_string not found in {rel}. Re-read the file; whitespace must match exactly.", True)
    if count > 1 and not args.get("replace_all", False):
        return ToolResult(
            f"ERROR: old_string occurs {count} times in {rel}. Add surrounding context to make it unique, "
            "or set replace_all=true.", True)
    p.write_text(text.replace(old, new) if args.get("replace_all") else text.replace(old, new, 1), encoding="utf-8")
    ctx.session.state.mark_modified(rel)
    return ToolResult(f"edited {rel} ({count if args.get('replace_all') else 1} replacement)", metadata={"path": rel})


def _walk(root: Path):
    for p in sorted(root.rglob("*")):
        if any(part in SKIP_DIRS for part in p.relative_to(root).parts):
            continue
        if p.is_file():
            yield p


async def list_files(args: dict, ctx: ToolContext) -> ToolResult:
    root = ctx.resolve(args.get("path", "."))
    pattern = args.get("pattern", "*")
    hits = [_rel(p, ctx) for p in _walk(root) if p.match(pattern)]
    return ToolResult("\n".join(hits[:500]) or "(no files)")


async def grep(args: dict, ctx: ToolContext) -> ToolResult:
    root = ctx.resolve(args.get("path", "."))
    try:
        rx = re.compile(args["pattern"])
    except re.error as e:
        return ToolResult(f"ERROR: bad regex: {e}", True)
    glob = args.get("glob", "*")
    out: list[str] = []
    for p in _walk(root):
        if not p.match(glob):
            continue
        try:
            for n, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
                if rx.search(line):
                    out.append(f"{_rel(p, ctx)}:{n}: {line.strip()}")
                    if len(out) >= MAX_GREP_RESULTS:
                        return ToolResult("\n".join(out) + f"\n...[capped at {MAX_GREP_RESULTS} results]")
        except (UnicodeDecodeError, OSError):
            continue
    return ToolResult("\n".join(out) or "(no matches)")


def _obj(props: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": props, "required": required, "additionalProperties": False}


S, I, B = {"type": "string"}, {"type": "integer"}, {"type": "boolean"}

FS_TOOLS = [
    Tool("read_file", "Read a text file from the workspace with line numbers.",
         _obj({"path": S, "offset": I, "limit": I}, ["path"]), read_file,
         PermissionLevel.READ, concurrency_safe=True, accesses=_path_access("r")),
    Tool("write_file", "Create a file, or overwrite one you have already read.",
         _obj({"path": S, "content": S}, ["path", "content"]), write_file,
         PermissionLevel.WRITE, accesses=_path_access("w")),
    Tool("edit_file", "Replace an exact, unique substring in a file you have read.",
         _obj({"path": S, "old_string": S, "new_string": S, "replace_all": B}, ["path", "old_string", "new_string"]),
         edit_file, PermissionLevel.WRITE, accesses=_path_access("w"),
         prompt_snippet="edit_file needs old_string to match exactly once; include surrounding lines."),
    Tool("list_files", "List workspace files matching a glob pattern.",
         _obj({"path": S, "pattern": S}, []), list_files,
         PermissionLevel.READ, concurrency_safe=True, accesses=_path_access("r")),
    Tool("grep", "Search file contents with a regular expression (max 100 hits).",
         _obj({"pattern": S, "path": S, "glob": S}, ["pattern"]), grep,
         PermissionLevel.READ, concurrency_safe=True, accesses=_path_access("r")),
]

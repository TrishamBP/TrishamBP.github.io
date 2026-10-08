"""Hierarchical Markdown context discovery, eager at the root and JIT below it.

Paper observations (§9.7, Recommendation 6):
* Codex concatenates AGENTS.md from the project root down to the working
  directory (nested content appended last).
* Mistral Vibe, OpenCode, Hermes and Gemini CLI surface *nested* context files
  just-in-time when a tool touches a file beneath them, appended to the tool
  result so the cached system prompt is untouched.
* Newer harnesses read their neighbours' filenames too (Hermes: own file,
  then AGENTS.md, CLAUDE.md, .cursorrules); first-found-wins per directory.
* Hermes scans every context file for injection patterns and blocks it.
"""

from __future__ import annotations

from pathlib import Path

from ..safety.untrusted import scan_injection

CONTEXT_FILENAMES = ("AGENTS.md", "CLAUDE.md")


def _render(path: Path, root: Path, text: str) -> str:
    rel = path.relative_to(root).as_posix() if root in path.parents or path == root else path.as_posix()
    return f'<context path="{rel}">\n{text.strip()}\n</context>'


class RepoContext:
    def __init__(self, workspace: Path, user_dir: Path | None = None,
                 filenames: tuple[str, ...] = CONTEXT_FILENAMES):
        self.workspace = workspace.resolve()
        self.user_dir = user_dir
        self.filenames = filenames
        self.injected: set[Path] = set()
        self.blocked: list[str] = []

    def _first_in(self, directory: Path) -> Path | None:
        for name in self.filenames:
            p = directory / name
            if p.is_file():
                return p
        return None

    def _load(self, p: Path) -> str | None:
        text = p.read_text(encoding="utf-8", errors="replace")
        hit = scan_injection(text)
        if hit:
            self.blocked.append(f"{p}: matched '{hit}'")
            return None
        self.injected.add(p.resolve())
        return _render(p, self.workspace, text)

    def startup(self) -> str:
        """User scope first, then the workspace root. Goes into the system prompt."""
        parts = []
        for d in ([self.user_dir] if self.user_dir else []) + [self.workspace]:
            p = self._first_in(d)
            if p is not None:
                rendered = self._load(p)
                if rendered:
                    parts.append(rendered)
        return "\n\n".join(parts)

    def on_file_touched(self, path: Path) -> str:
        """Context files between the root (exclusive) and the file's directory,
        root-to-leaf, each injected at most once per session."""
        path = path.resolve()
        if self.workspace not in path.parents:
            return ""
        chain, d = [], path.parent
        while d != self.workspace:
            chain.append(d)
            d = d.parent
        parts = []
        for directory in reversed(chain):
            p = self._first_in(directory)
            if p is not None and p.resolve() not in self.injected:
                rendered = self._load(p)
                if rendered:
                    parts.append(rendered)
        return "\n\n".join(parts)

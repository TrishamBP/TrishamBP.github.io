"""SKILL.md capability bundles with progressive disclosure.

Paper observations (§12.5, Observation 8):
* 9 of 11 systems implement agentskills.io-style skills: a directory with a
  SKILL.md carrying YAML frontmatter (name, description required).
* 8 of 9 adopters load only metadata eagerly and fetch bodies on demand.
* Conditional activation: Claude Code's `paths` frontmatter activates a skill
  when the model touches matching files; OpenHands' PathTrigger does the same;
  OpenClaw filters by declared runtime requirements.
* Pi needs no dedicated tool - the body is fetched with the ordinary read tool.

We parse a minimal frontmatter subset (key: value, lists as [a, b]) to stay
dependency-free.
"""

from __future__ import annotations

import fnmatch
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from ..tools.permissions import PermissionLevel
from ..tools.registry import Tool, ToolContext, ToolResult


@dataclass
class Skill:
    name: str
    description: str
    path: Path
    paths: list[str] = field(default_factory=list)      # conditional activation globs
    requires_bins: list[str] = field(default_factory=list)

    def body(self) -> str:
        text = self.path.read_text(encoding="utf-8")
        return text.split("---", 2)[2].strip() if text.startswith("---") else text


def parse_frontmatter(text: str) -> dict[str, object]:
    if not text.startswith("---"):
        return {}
    block = text.split("---", 2)[1]
    meta: dict[str, object] = {}
    for line in block.splitlines():
        if ":" not in line:
            continue
        key, value = (s.strip() for s in line.split(":", 1))
        if value.startswith("[") and value.endswith("]"):
            meta[key] = [v.strip().strip("'\"") for v in value[1:-1].split(",") if v.strip()]
        else:
            meta[key] = value.strip("'\"")
    return meta


class SkillRegistry:
    def __init__(self, dirs: list[Path]):
        self.skills: dict[str, Skill] = {}
        self._hinted: set[str] = set()
        for d in dirs:
            for md in sorted(d.glob("*/SKILL.md")) if d.is_dir() else []:
                meta = parse_frontmatter(md.read_text(encoding="utf-8"))
                if "name" not in meta or "description" not in meta:
                    continue  # spec requires both
                skill = Skill(str(meta["name"]), str(meta["description"]), md,
                              list(meta.get("paths", [])), list(meta.get("requires", [])))
                if any(shutil.which(b) is None for b in skill.requires_bins):
                    continue  # eligibility gating: never reaches the prompt
                self.skills.setdefault(skill.name, skill)  # first scope wins

    def index(self) -> str:
        if not self.skills:
            return ""
        rows = "\n".join(f"- {s.name}: {s.description}" for s in self.skills.values())
        return f"<available_skills>\n{rows}\nLoad one with load_skill before following it.\n</available_skills>"

    def on_file_touched(self, rel_path: str) -> str:
        hints = []
        for s in self.skills.values():
            if s.name not in self._hinted and any(fnmatch.fnmatch(rel_path, g) for g in s.paths):
                self._hinted.add(s.name)
                hints.append(f"<skill-hint>Skill '{s.name}' applies to {rel_path}: {s.description}</skill-hint>")
        return "\n".join(hints)

    def tool(self) -> Tool:
        async def load_skill(args: dict, ctx: ToolContext) -> ToolResult:
            skill = self.skills.get(args["name"])
            if skill is None:
                return ToolResult(f"ERROR: unknown skill '{args['name']}'", True)
            return ToolResult(f"<skill name=\"{skill.name}\">\n{skill.body()}\n</skill>")

        return Tool("load_skill", "Load the full instructions of a skill listed in <available_skills>.",
                    {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"],
                     "additionalProperties": False},
                    load_skill, PermissionLevel.META, concurrency_safe=True)

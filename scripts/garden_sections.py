"""Regenerate the `sections:` frontmatter of Digital Garden guide pages.

The docs sidebar (_layouts/garden.html) lists each page's subsections from
its `sections:` frontmatter. This script rebuilds that list from the page's
H2 headings, which must carry an explicit id on the next line:

    ## 1. What `use` actually does
    {: #mod-use}

Usage (from the repo root):
    python scripts/garden_sections.py _garden/rust-sandbox.md _garden/rust-sandbox/*.md
"""

import re
import sys


def yaml_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def sections_for(body):
    out, fenced, lines = [], False, body.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("```"):
            fenced = not fenced
            continue
        if fenced or not line.startswith("## "):
            continue
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        m = re.match(r"\{:\s*#([\w-]+)\s*\}", nxt.strip())
        if not m:
            sys.exit(f"H2 without an explicit id: {line!r}")
        title = line[3:].strip()
        # "2. Foo" would become an ordered list when the sidebar runs
        # markdownify on it; escape the dot so it stays plain text.
        title = re.sub(r"^(\d+)\. ", r"\1\\. ", title)
        out.append((m.group(1), title))
    return out


def update(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        sys.exit(f"{path}: no frontmatter")
    fm, body = m.group(1), text[m.end():]
    fm = re.sub(r"\nsections:\n(?:  .*\n?)*", "\n", fm + "\n").rstrip("\n")
    secs = sections_for(body)
    block = "sections:\n" + "".join(
        f"  - id: {sid}\n    title: {yaml_str(title)}\n" for sid, title in secs
    )
    open(path, "w", encoding="utf-8").write(f"---\n{fm}\n{block}---\n{body}")
    print(f"{path}: {len(secs)} sections")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        update(p)

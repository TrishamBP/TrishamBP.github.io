"""Renumber Rust Sandbox notes from slug order and rewrite linked "Note NN" text.

Usage: python scripts/garden_renumber_rust.py [--bump-frontmatter]
"""
import glob
import os
import re
import sys

ORDER = [
    "variables-mutability",
    "integers-floats-casting",
    "booleans-chars-strings",
    "ownership-borrowing",
    "structs-impl-display",
    "methods-constructors",
    "slices-lifetimes",
    "traits",
    "derive",
    "arrays-tuples-constants",
    "error-handling-result",
    "iterators-closures",
    "modules-use",
    "doc-comments-tests",
]
NUM = {slug: i + 1 for i, slug in enumerate(ORDER)}

files = glob.glob("_garden/rust-sandbox/*.md") + ["_garden/rust-sandbox.md"]
link_re = re.compile(r"\[Note (\d{2})\]\(/digital-garden/rust-sandbox/([a-z-]+)/")

for path in files:
    with open(path, encoding="utf-8") as f:
        text = f.read()
    orig = text
    slug = os.path.basename(path)[:-3]

    if "--bump-frontmatter" in sys.argv and slug in NUM:
        n = NUM[slug]
        text = re.sub(r"(?m)^order: \d+$", "order: %d" % n, text, count=1)
        text = re.sub(r'(?m)^note_no: "\d+"$', 'note_no: "%02d"' % n, text, count=1)

    def fix(m):
        target = m.group(2)
        if target not in NUM:
            return m.group(0)
        return "[Note %02d](/digital-garden/rust-sandbox/%s/" % (NUM[target], target)

    text = link_re.sub(fix, text)

    for i, line in enumerate(text.splitlines(), 1):
        stripped = link_re.sub("", line)
        if re.search(r"Notes? \d{2}", stripped):
            print("UNLINKED %s:%d: %s" % (path, i, line.strip()[:160]))

    if text != orig:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        print("updated", path)

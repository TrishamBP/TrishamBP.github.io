"""Flag Digital Garden pages where kramdown made a table out of a prose line
(any line with a | outside code fences can become one). Run after a build:
    python scripts/garden_check_tables.py
"""
import glob, os, re

bad = 0
for src in sorted(glob.glob("_garden/**/*.md", recursive=True)):
    text = open(src, encoding="utf-8").read()
    fm = re.match(r"---\n.*?\n---\n", text, re.S)
    body = text[fm.end():] if fm else text
    # count real markdown tables: a header-separator row outside code fences
    fenced, md_tables, pipe_prose = False, 0, []
    for n, line in enumerate(body.split("\n"), 1):
        if line.startswith("```"):
            fenced = not fenced
            continue
        if fenced:
            continue
        if re.match(r"^\|?\s*:?-{3,}", line):
            md_tables += 1
        elif "|" in line and not line.lstrip().startswith("|"):
            pipe_prose.append(n)
    rel = os.path.relpath(src, "_garden").replace(os.sep, "/")[:-3]
    out = os.path.join("_site", "digital-garden", rel, "index.html")
    if not os.path.exists(out):
        continue
    html = open(out, encoding="utf-8").read()
    article = html.split('class="post-content', 1)[1]
    html_tables = article.count("<table")
    flag = "" if html_tables == md_tables else "   <-- MISMATCH"
    if flag:
        bad += 1
    if flag or pipe_prose:
        print(f"{rel:55} md={md_tables} html={html_tables} prose-lines-with-pipes={pipe_prose}{flag}")
print("pages with stray tables:", bad)

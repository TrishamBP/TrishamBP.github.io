"""Hero banner for the "Document-to-Knowledge-to-Agents" signal post.

Three stages left to right:
  1. Document  - a stack of pages flowing through S3 -> SQS -> Lambda workers
  2. Knowledge - knowledge patches merging into an evidence-backed Wiki
                 (one fact row flagged as a recorded conflict)
  3. Agents    - a planner fanning out to specialist agents, synthesis at the
                 bottom, and a dashed write-back arrow to the Wiki

Original artwork. Opaque field-notes paper panel so it survives dark mode.

Usage: python scripts/d2k2a_hero.py [output_dir]
       (default: assets/blogs/document-to-knowledge-to-agents)
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Rectangle

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    HERE, "..", "assets", "blogs", "document-to-knowledge-to-agents")
os.makedirs(OUT, exist_ok=True)

# Field-notes palette (css/signals-field-notes.css).
PAPER, CARD, INK, SOFT, HAIR = "#f3f0e8", "#faf8f3", "#141b18", "#3a423d", "#d8d2c4"
GREEN, MINT, ORANGE, WHITE, PEACH = "#0d4a3e", "#d4ebe1", "#bf4a1a", "#ffffff", "#f2d3c4"
MONO = "DejaVu Sans Mono"
W, H = 12, 6

fig, ax = plt.subplots(figsize=(W, H))
fig.subplots_adjust(0, 0, 1, 1)
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.set_aspect("equal")
ax.axis("off")
ax.add_patch(Rectangle((0, 0), W, H, fc=PAPER, ec="none"))
for gx in range(1, 24):
    ax.plot([gx * 0.5, gx * 0.5], [0, H], color=INK, alpha=0.04, lw=0.6)
for gy in range(1, 12):
    ax.plot([0, W], [gy * 0.5, gy * 0.5], color=INK, alpha=0.04, lw=0.6)


def box(x, y, w, h, fc, ec, lw=1.2, r=0.08, ls="-"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0.0,rounding_size={r}",
                                fc=fc, ec=ec, lw=lw, ls=ls))


def arrow(p, q, color=INK, lw=1.4, rad=0.0, ms=12, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", linestyle=ls))


def label(x, y, s, size=8.5, color=INK, weight="normal", ha="left"):
    ax.text(x, y, s, fontsize=size, family=MONO, color=color, weight=weight, ha=ha, va="center")


ax.text(0.45, 5.5, "DOCUMENT  ->  KNOWLEDGE  ->  AGENTS", fontsize=12, family=MONO,
        weight="bold", color=GREEN)
ax.text(0.45, 5.15, "unstructured documents in, evidence-backed intelligence out",
        fontsize=9.5, family=MONO, color=SOFT)

# --- Stage 1: documents -> S3 -> SQS -> Lambda -------------------------------------
label(0.45, 4.6, "01 / DOCUMENT", 9, ORANGE, "bold")
for i in range(4):
    x, y = 0.45 + i * 0.09, 2.6 - i * 0.09
    box(x, y, 0.9, 1.25, CARD, INK, lw=1.0, r=0.04)
    if i == 3:
        for k in range(5):
            ax.plot([x + 0.12, x + 0.75 - (k % 2) * 0.2], [y + 1.02 - k * 0.19] * 2,
                    color=SOFT, lw=1.2)
label(0.45, 2.1, "pdf / docx / scans", 7.5, SOFT)

box(1.85, 3.55, 1.0, 0.55, MINT, GREEN)
label(2.35, 3.83, "S3 raw", 8, GREEN, "bold", "center")
box(1.85, 2.6, 1.0, 0.55, WHITE, INK)
label(2.35, 2.88, "SQS", 8, INK, "bold", "center")
for k in range(5):
    ax.add_patch(Rectangle((1.95 + k * 0.17, 2.66), 0.12, 0.1, fc=GREEN if k < 3 else HAIR,
                           ec="none"))
box(1.85, 1.65, 1.0, 0.55, PEACH, ORANGE)
label(2.35, 1.93, "DLQ", 8, ORANGE, "bold", "center")
arrow((1.45, 3.3), (1.85, 3.8))
arrow((2.35, 3.55), (2.35, 3.15))
arrow((2.35, 2.6), (2.35, 2.2), color=ORANGE, ls="--", lw=1.1)

for j in range(3):
    box(3.2, 3.6 - j * 0.6, 0.85, 0.42, GREEN, INK, r=0.06)
    label(3.625, 3.81 - j * 0.6, "lambda", 7.5, MINT, "bold", "center")
    arrow((2.85, 2.88), (3.2, 3.81 - j * 0.6), lw=1.0, ms=9)

# --- Stage 2: patches -> Wiki -----------------------------------------------------
label(4.45, 4.6, "02 / KNOWLEDGE", 9, ORANGE, "bold")
for j in range(3):
    box(4.45, 3.6 - j * 0.6, 0.85, 0.42, WHITE, GREEN, r=0.06)
    label(4.875, 3.81 - j * 0.6, "patch", 7.5, GREEN, "bold", "center")
    arrow((4.05, 3.81 - j * 0.6), (4.45, 3.81 - j * 0.6), lw=1.0, ms=9)
    arrow((5.3, 3.81 - j * 0.6), (5.65, 3.2), lw=1.0, ms=9)

box(5.65, 1.25, 2.3, 3.0, CARD, INK, lw=1.4, r=0.1)
label(5.8, 4.0, "WIKI  dynamodb + s3", 8, GREEN, "bold")
rows = [("REQ-0231", "mandatory", "p42", False), ("DATE-007", "deadline", "p3|p9", True),
        ("STK-012", "evaluator", "p5", False), ("SYS-004", "interface", "p61", False),
        ("CLS-019", "liability", "p77", False)]
for k, (eid, kind, ev, conflict) in enumerate(rows):
    y = 3.55 - k * 0.45
    fc = PEACH if conflict else (MINT if k % 2 == 0 else WHITE)
    ec = ORANGE if conflict else HAIR
    box(5.8, y - 0.17, 2.0, 0.36, fc, ec, lw=1.0, r=0.04)
    label(5.88, y, eid, 7, INK, "bold")
    label(6.75, y, kind, 6.8, SOFT)
    label(7.72, y, ev, 6.5, ORANGE if conflict else GREEN, "bold", "right")
label(5.8, 1.42, "every fact -> doc, page, span", 6.8, SOFT)

# --- Stage 3: planner + specialists -----------------------------------------------
label(8.35, 4.6, "03 / AGENTS", 9, ORANGE, "bold")
box(9.25, 3.65, 1.5, 0.5, GREEN, INK, r=0.08)
label(10.0, 3.9, "planner", 8.5, MINT, "bold", "center")
arrow((7.95, 3.4), (9.25, 3.85), lw=1.2)
names = ["reqs", "dates", "people", "risks", "comply"]
for k, n in enumerate(names):
    x = 8.35 + k * 0.7
    box(x, 2.55, 0.6, 0.45, WHITE, GREEN, r=0.06)
    label(x + 0.3, 2.775, n, 6.6, GREEN, "bold", "center")
    arrow((10.0, 3.65), (x + 0.3, 3.0), lw=0.9, ms=8)
    arrow((x + 0.3, 2.55), (10.0, 1.95), lw=0.9, ms=8)
box(9.15, 1.45, 1.7, 0.5, ORANGE, INK, r=0.08)
label(10.0, 1.7, "synthesis", 8.5, WHITE, "bold", "center")
arrow((9.15, 1.6), (7.95, 1.9), color=ORANGE, lw=1.2, ls="--", rad=-0.15)
label(8.0, 1.2, "new patches", 7, ORANGE, "bold")
arrow((10.85, 1.7), (11.45, 1.7), lw=1.2)
label(11.5, 1.7, "out", 7.5, GREEN, "bold")

ax.text(0.45, 0.55, "scale lives in lambda  /  truth lives in the wiki  /  reasoning lives in the agents",
        fontsize=8.5, family=MONO, color=SOFT)

path = os.path.join(OUT, "document-to-knowledge-to-agents-hero.png")
fig.savefig(path, dpi=160, facecolor=PAPER)
print(path)

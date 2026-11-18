"""Hero banner for the "Living Knowledge Base on AWS" signal post.

Left to right:
  1. Intake     - documents land in S3, buffer in SQS (with a DLQ under it)
  2. Process    - a Step Functions state machine fans a document out into
                  small-context chunk extractions (Distributed Map) and reduces
  3. Knowledge  - versioned facts in DynamoDB + S3, emitting change events
  4. Fan-out    - SNS topic -> per-consumer SQS queues (analytics, discovery,
                  processing), each with its own DLQ, plus a dashed feedback
                  loop back into the knowledge store

Original artwork. Opaque field-notes paper panel so it survives dark mode.

Usage: python scripts/living_knowledge_base_hero.py [output_dir]
       (default: assets/blogs/living-knowledge-base-aws)
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Rectangle

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    HERE, "..", "assets", "blogs", "living-knowledge-base-aws")
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


def arrow(p, q, color=INK, lw=1.3, rad=0.0, ms=11, ls="-"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", linestyle=ls))


def label(x, y, s, size=8.5, color=INK, weight="normal", ha="left"):
    ax.text(x, y, s, fontsize=size, family=MONO, color=color, weight=weight, ha=ha, va="center")


def queue(x, y, w, filled, title, fc=WHITE, ec=INK, tc=INK):
    box(x, y, w, 0.5, fc, ec)
    label(x + w / 2, y + 0.33, title, 7.4, tc, "bold", "center")
    n = 5
    step = (w - 0.2) / n
    for k in range(n):
        ax.add_patch(Rectangle((x + 0.1 + k * step, y + 0.07), step * 0.72, 0.1,
                               fc=GREEN if k < filled else HAIR, ec="none"))


def dlq(x, y, w=0.8):
    box(x, y, w, 0.34, PEACH, ORANGE, lw=1.0)
    label(x + w / 2, y + 0.17, "DLQ", 7, ORANGE, "bold", "center")


ax.text(0.45, 5.5, "THE LIVING KNOWLEDGE BASE  /  AWS", fontsize=12, family=MONO,
        weight="bold", color=GREEN)
ax.text(0.45, 5.15, "documents in, versioned knowledge out, every hop retried or parked",
        fontsize=9.5, family=MONO, color=SOFT)

# --- 01 intake -----------------------------------------------------------------
label(0.45, 4.6, "01 / INTAKE", 9, ORANGE, "bold")
for i in range(4):
    x, y = 0.45 + i * 0.08, 3.05 - i * 0.08
    box(x, y, 0.8, 1.1, CARD, INK, lw=1.0, r=0.04)
    if i == 3:
        for k in range(5):
            ax.plot([x + 0.1, x + 0.68 - (k % 2) * 0.18], [y + 0.9 - k * 0.17] * 2,
                    color=SOFT, lw=1.1)
label(0.45, 2.6, "bursty uploads", 7.2, SOFT)

box(1.65, 3.75, 0.95, 0.5, MINT, GREEN)
label(2.125, 4.0, "S3 raw", 7.8, GREEN, "bold", "center")
queue(1.65, 2.9, 0.95, 3, "SQS")
dlq(1.725, 2.25)
arrow((1.33, 3.6), (1.65, 3.95))
arrow((2.125, 3.75), (2.125, 3.4))
arrow((2.125, 2.9), (2.125, 2.59), color=ORANGE, ls="--", lw=1.0, ms=9)

# --- 02 process: step functions + distributed map ------------------------------
label(3.0, 4.6, "02 / PROCESS", 9, ORANGE, "bold")
box(3.0, 1.55, 2.75, 2.85, CARD, INK, lw=1.3, r=0.1)
label(3.12, 4.18, "step functions", 7.6, GREEN, "bold")
arrow((2.6, 3.15), (3.0, 3.6))

box(3.6, 3.65, 1.55, 0.36, GREEN, INK, r=0.05)
label(4.375, 3.83, "split pages", 7, MINT, "bold", "center")
label(5.63, 4.18, "map: chunk <= token budget", 6.4, SOFT, "normal", "right")
for k in range(5):
    x = 3.15 + k * 0.5
    box(x, 2.75, 0.4, 0.36, WHITE, GREEN, r=0.04)
    label(x + 0.2, 2.93, f"c{k + 1}", 6.6, GREEN, "bold", "center")
    arrow((4.375, 3.65), (x + 0.2, 3.11), lw=0.8, ms=7)
    arrow((x + 0.2, 2.75), (4.375, 2.3), lw=0.8, ms=7)
box(3.15, 2.75, 0.4, 0.36, PEACH, ORANGE, r=0.04)
label(3.35, 2.93, "c1", 6.6, ORANGE, "bold", "center")
box(3.6, 1.95, 1.55, 0.36, GREEN, INK, r=0.05)
label(4.375, 2.13, "reduce + card", 7, MINT, "bold", "center")
label(3.12, 1.72, "retry / catch / redrive", 6.4, ORANGE)

# --- 03 knowledge ----------------------------------------------------------------
label(6.1, 4.6, "03 / KNOWLEDGE", 9, ORANGE, "bold")
box(6.1, 1.55, 2.2, 2.85, CARD, INK, lw=1.3, r=0.1)
label(6.22, 4.18, "dynamodb + s3", 7.6, GREEN, "bold")
arrow((5.75, 2.13), (6.1, 2.9))
rows = [("fact#017", "v3", False), ("fact#017", "v2", True), ("ent#204", "v1", False),
        ("card#doc9", "v2", False), ("fact#311", "v4", False)]
for k, (eid, ver, old) in enumerate(rows):
    y = 3.72 - k * 0.42
    fc = HAIR if old else (MINT if k % 2 == 0 else WHITE)
    box(6.22, y - 0.16, 1.95, 0.33, fc, HAIR, lw=0.9, r=0.04)
    label(6.3, y, eid, 6.8, SOFT if old else INK, "bold")
    label(8.07, y, ver + (" superseded" if old else ""), 6.2,
          SOFT if old else GREEN, "bold", "right")
label(6.22, 1.72, "append versions, never overwrite", 6.2, SOFT)

# --- 04 fan-out ------------------------------------------------------------------
label(8.65, 4.6, "04 / FAN-OUT", 9, ORANGE, "bold")
box(8.65, 3.75, 0.9, 0.5, ORANGE, INK)
label(9.1, 4.0, "SNS", 8, WHITE, "bold", "center")
arrow((8.3, 3.6), (8.65, 3.95))
consumers = [("analytics", 2), ("discovery", 4), ("process", 1)]
for k, (name, filled) in enumerate(consumers):
    y = 3.05 - k * 0.78
    queue(9.85, y, 1.15, filled, "SQS")
    dlq(11.12, y + 0.08, 0.55)
    arrow((11.0, y + 0.25), (11.12, y + 0.25), color=ORANGE, ls="--", lw=0.9, ms=7)
    label(10.425, y - 0.12, name, 6.6, GREEN, "bold", "center")
    arrow((9.55, 3.95), (9.85, y + 0.25), lw=0.9, ms=8)
arrow((9.85, 1.6), (8.3, 1.75), color=ORANGE, ls="--", lw=1.2, rad=0.2)
label(8.7, 1.25, "feedback patches", 6.8, ORANGE, "bold")

ax.text(0.45, 0.55,
        "small context per call  /  at-least-once everywhere  /  a dead-letter queue at every hop",
        fontsize=8.5, family=MONO, color=SOFT)

path = os.path.join(OUT, "living-knowledge-base-aws-hero.png")
fig.savefig(path, dpi=160, facecolor=PAPER)
print(path)

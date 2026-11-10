"""Hero banner for the "From 1.1 million tokens to 78 thousand: taming a ReAct
planner" signal post.

Left: the ReAct loop (thought -> action -> observation). Centre: per-step
prompt size for the untamed planner, growing every iteration as the history
piles up (1.1M tokens total). Right: the tamed planner, with prompts kept
flat (78K tokens total). Bar heights are illustrative, not measured.

Original artwork. Opaque field-notes paper panel so it survives dark mode.

Usage: python scripts/taming_react_planner_hero.py <output_dir>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Rectangle

OUT = sys.argv[1] if len(sys.argv) > 1 else "."

# Field-notes palette (css/signals-field-notes.css).
PAPER, INK, SOFT, HAIR = "#f3f0e8", "#141b18", "#3a423d", "#d8d2c4"
GREEN, MINT, ORANGE, WHITE = "#0d4a3e", "#d4ebe1", "#bf4a1a", "#ffffff"
PEACH = "#f2d3c4"
MONO = "DejaVu Sans Mono"
W, H = 12, 6

fig, ax = plt.subplots(figsize=(W, H))
fig.subplots_adjust(0, 0, 1, 1)
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.set_aspect("equal")
ax.axis("off")
ax.add_patch(Rectangle((0, 0), W, H, fc=PAPER, ec="none"))


def box(x, y, w, h, fc, ec, lw=1.2, r=0.08):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0.0,rounding_size={r}",
                                fc=fc, ec=ec, lw=lw))


def arrow(p, q, color=INK, lw=1.4, rad=0.0, ms=12):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=ms, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}"))


ax.text(0.45, 5.45, "TAMING A REACT PLANNER  /  TOKEN BUDGET", fontsize=11, family=MONO,
        weight="bold", color=GREEN)
ax.text(0.45, 5.1, "thought -> action -> observation, repeated: what each step sends to the model",
        fontsize=9.5, family=MONO, color=SOFT)

# --- ReAct loop -------------------------------------------------------------------
lx, ly, lw_, lh = 0.45, 1.25, 2.6, 3.5
box(lx, ly, lw_, lh, GREEN, INK, lw=1.4, r=0.12)
ax.text(lx + 0.2, ly + lh - 0.32, "REACT LOOP", fontsize=9, family=MONO, color=MINT,
        weight="bold")
nodes = [("thought", MINT, GREEN), ("action", WHITE, GREEN), ("observation", ORANGE, WHITE)]
ny = [ly + lh - 1.05, ly + lh - 1.95, ly + lh - 2.85]
for (label, fc, tc), y in zip(nodes, ny):
    box(lx + 0.3, y, lw_ - 0.6, 0.48, fc, MINT if fc != ORANGE else ORANGE, lw=0.9, r=0.06)
    ax.text(lx + lw_ / 2, y + 0.24, label, ha="center", va="center", fontsize=8.5,
            family=MONO, color=tc, weight="bold")
for a, b in zip(ny[:-1], ny[1:]):
    arrow((lx + lw_ / 2, a - 0.02), (lx + lw_ / 2, b + 0.5), color=MINT, lw=1.2, ms=9)
arrow((lx + lw_ - 0.32, ny[2] + 0.24), (lx + lw_ - 0.32, ny[0] + 0.24), color=MINT, lw=1.2,
      rad=0.35, ms=9)
ax.text(lx + 0.2, ly + 0.14, "repeat until done", fontsize=7, family=MONO, color=MINT)


# --- Per-step prompt size panels --------------------------------------------------
def panel(x, title, color, fill, heights, total, sub):
    pw, ph = 4.0, 3.5
    box(x, 1.25, pw, ph, WHITE, INK, lw=1.4, r=0.12)
    ax.text(x + 0.2, 1.25 + ph - 0.32, title, fontsize=9, family=MONO, color=color,
            weight="bold")
    base, n = 1.95, len(heights)
    bw = (pw - 0.6) / n
    ax.plot([x + 0.25, x + pw - 0.25], [base, base], color=HAIR, lw=1)
    for i, hgt in enumerate(heights):
        bx = x + 0.3 + i * bw
        # stacked history: older layers faded, newest step on top
        layers = max(1, int(round(hgt / 0.22)))
        lh = hgt / layers
        for k in range(layers):
            fc = color if k == layers - 1 else fill
            ax.add_patch(Rectangle((bx, base + k * lh), bw * 0.72, lh * 0.9, fc=fc,
                                   ec="none"))
    ax.text(x + 0.25, base - 0.22, "step 1", fontsize=6.5, family=MONO, color=SOFT)
    ax.text(x + pw - 0.25, base - 0.22, f"step {n}", fontsize=6.5, family=MONO, color=SOFT,
            ha="right")
    ax.text(x + 0.2, 1.25 + ph - 0.6, total, fontsize=20, family=MONO,
            color=color, weight="bold", va="top")
    ax.text(x + 0.2, 1.25 + ph - 1.1, "tokens per run", fontsize=8, family=MONO,
            color=SOFT, va="top")
    ax.text(x + 0.2, 1.42, sub, fontsize=7.5, family=MONO, color=SOFT)


steps = 12
grow = [0.18 + i * 0.125 for i in range(steps)]
flat = [0.2, 0.26, 0.22, 0.28, 0.24, 0.26, 0.22, 0.28, 0.24, 0.26, 0.22, 0.26]
panel(3.45, "BEFORE  /  history piles up", ORANGE, PEACH, grow, "1.1M",
      "every step resends everything so far")
panel(7.85 - 0.3 + 0.15, "AFTER  /  tamed planner", GREEN, MINT, flat, "78K",
      "each step sends only what it needs")
arrow((3.07, 3.0), (3.43, 3.0), color=INK, lw=1.4)
arrow((7.47, 3.0), (7.68, 3.0), color=GREEN, lw=2.0, ms=14)

# --- Bottom strip -------------------------------------------------------------------
ax.text(0.45, 0.62, "1,100,000  ->  78,000", fontsize=13, family=MONO, color=INK,
        weight="bold")
ax.text(4.6, 0.66, "~14x fewer tokens per run   |   ~93% cut", fontsize=9.5, family=MONO,
        color=GREEN, weight="bold")
ax.text(11.55, 0.3, "bar heights illustrative", ha="right", fontsize=7, family=MONO,
        color=SOFT)

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "taming-react-planner-token-reduction-hero.png")
fig.savefig(path, dpi=200, facecolor=PAPER)
plt.close(fig)
print("wrote", path)

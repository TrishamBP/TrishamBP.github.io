"""FireRouter with Opus cost diagram for the Tech Radar section (26 Oct 2026 newsletter).

Left: how FireRouter splits Claude Code turns between Opus and open models.
Right: cost per session, Opus alone vs FireRouter with Opus (Fireworks' own figures).
Opaque white PNG so it survives dark-mode email clients.

Usage: python scripts/firerouter_opus_cost_diagram.py <output_dir>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
INK, SOFT, GRID = "#1e1e1e", "#475569", "#d4d4d4"
OPUS, OPEN = "#b8399a", "#028a4b"  # validated pair: magenta = Opus, green = open models

fig = plt.figure(figsize=(12, 5.6))
fig.text(0.5, 0.95, "FireRouter with Opus: same Claude Code work, less than half the bill",
         ha="center", fontsize=16, weight="bold", color=INK)

# --- Left: routing flow -------------------------------------------------------
ax = fig.add_axes([0.02, 0.12, 0.52, 0.76])
ax.set_xlim(0, 10)
ax.set_ylim(0, 8)
ax.axis("off")


def box(x, y, w, h, title, body, colour):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                                fc="white", ec=colour, lw=2.2))
    ax.text(x + w / 2, y + h - 0.45, title, ha="center", va="top", fontsize=12.5,
            weight="bold", color=colour)
    ax.text(x + w / 2, y + 0.35, body, ha="center", va="bottom", fontsize=10, color=INK)


def arrow(a, b):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=16, color=INK, lw=1.6))


box(0.2, 5.6, 4.0, 2.0, "Claude Code", "your existing harness,\nno new tools", INK)
box(5.6, 5.6, 4.2, 2.0, "FireRouter", "scores every turn,\ncache-aware routing", INK)
box(0.2, 0.6, 4.4, 2.6, "Claude Opus", "turns that need\nfrontier reasoning", OPUS)
box(5.4, 0.6, 4.4, 2.6, "GLM-5.3 / 5.3 Flash", "routine turns on\nlower-cost open models", OPEN)
arrow((4.25, 6.6), (5.55, 6.6))
arrow((7.0, 5.55), (2.6, 3.25))
arrow((7.9, 5.55), (7.6, 3.25))
ax.text(4.2, 4.3, "hard turns", ha="right", fontsize=10.5, style="italic", color=OPUS)
ax.text(7.95, 4.3, "routine turns", ha="left", fontsize=10.5, style="italic", color=OPEN)

# --- Right: cost per session -------------------------------------------------
bx = fig.add_axes([0.62, 0.2, 0.34, 0.62])
labels = ["Opus alone", "FireRouter\nwith Opus"]
costs = [15.36, 6.63]
bars = bx.bar(labels, costs, width=0.55, color=[OPUS, OPEN], edgecolor="white", linewidth=2)
for bar, cost in zip(bars, costs):
    bx.text(bar.get_x() + bar.get_width() / 2, cost + 0.35, f"${cost:.2f}", ha="center",
            fontsize=13, weight="bold", color=INK)
bx.annotate("", xy=(1, 6.63 + 1.6), xytext=(1, 15.36), arrowprops=dict(arrowstyle="-|>",
            color=INK, lw=1.4, linestyle=(0, (3, 2))))
bx.text(1.08, 12.2, "-57%", fontsize=15, weight="bold", color=OPEN)
bx.set_ylim(0, 18)
bx.set_title("Cost per session", fontsize=12.5, weight="bold", color=INK, pad=10)
bx.set_yticks([0, 5, 10, 15])
bx.set_yticklabels(["$0", "$5", "$10", "$15"], color=SOFT, fontsize=10)
bx.tick_params(axis="x", colors=INK, labelsize=11, length=0)
bx.tick_params(axis="y", length=0)
bx.grid(axis="y", color=GRID, lw=0.8)
bx.set_axisbelow(True)
for side in ("top", "right", "left"):
    bx.spines[side].set_visible(False)
bx.spines["bottom"].set_color(SOFT)

fig.text(0.5, 0.04, "Prompt cache hit 94.2% (vs 97.8% on Opus)   ·   Accuracy 98.1% of Opus quality "
         "(78.7% vs 80.2%)   ·   Source: Fireworks AI", ha="center", fontsize=10.5,
         style="italic", color=SOFT)

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "firerouter-opus-claude-code-cost-savings.png")
fig.savefig(path, dpi=200, facecolor="white", bbox_inches="tight", pad_inches=0.25)
plt.close(fig)
print("wrote", path)

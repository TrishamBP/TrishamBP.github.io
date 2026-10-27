"""Hero banner for the "Modern AI Security: software supply chain -> AI model
supply chain" blog post (27 Oct 2026): the classic software chain on top,
the AI model chain below it, each with one poisoned link.

Original artwork (no logos). Opaque paper panel so it survives the site's
dark mode.

Usage: python scripts/ai_model_supply_chain_hero.py <output_dir>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Rectangle

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
PAPER, INK, RED, GREEN, WHITE = "#e5e5e5", "#1e1e1e", "#c8102e", "#028a4b", "#ffffff"
MONO = "DejaVu Sans Mono"
W, H = 12, 6

fig, ax = plt.subplots(figsize=(W, H))
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")
ax.add_patch(Rectangle((0, 0), W, H, fc=PAPER, ec="none", zorder=0))

# Title block (left).
ax.text(0.6, 4.9, "MODERN AI SECURITY", fontsize=18, color=INK, family=MONO, weight="bold")
ax.text(0.6, 4.05, "Software", fontsize=34, color=INK, weight="bold")
ax.text(0.6, 3.25, "Supply Chain", fontsize=34, color=INK, weight="bold")
ax.text(0.6, 2.5, "→ AI Model", fontsize=34, color=RED, weight="bold")
ax.text(0.6, 1.7, "Supply Chain", fontsize=34, color=RED, weight="bold")
ax.add_patch(Rectangle((0.62, 1.4), 4.3, 0.09, fc=RED, ec="none"))
ax.text(0.6, 0.85, "The attack moved from your code", fontsize=11, color=INK, family=MONO,
        alpha=0.75)
ax.text(0.6, 0.5, "to your weights.", fontsize=11, color=INK, family=MONO, alpha=0.75)

# Two chains (right), each a row of links with one poisoned.
CHAINS = [
    (4.15, "software supply chain", "then", [
        ("source", False), ("package", False), ("build", True), ("install", False)]),
    (1.55, "ai model supply chain", "now", [
        ("data", True), ("weights", True), ("hub", False), ("agent", False)]),
]
x0, bw, bh, gap = 6.0, 1.15, 0.85, 0.28
for y, label, tag, links in CHAINS:
    ax.text(x0, y + bh + 0.25, label, fontsize=11, color=INK, family=MONO, weight="bold")
    ax.text(x0 + 4 * bw + 3 * gap, y + bh + 0.25, tag, fontsize=10, color=INK, family=MONO,
            alpha=0.6, ha="right")
    for i, (name, poisoned) in enumerate(links):
        x = x0 + i * (bw + gap)
        colour = RED if poisoned else INK
        ax.add_patch(FancyBboxPatch((x + 0.06, y - 0.06), bw, bh,
                                    boxstyle="round,pad=0,rounding_size=0.08",
                                    fc=INK, ec="none", zorder=1))
        ax.add_patch(FancyBboxPatch((x, y), bw, bh, boxstyle="round,pad=0,rounding_size=0.08",
                                    fc=RED if poisoned else WHITE, ec=colour, lw=2.2, zorder=2))
        ax.text(x + bw / 2, y + bh / 2, name, ha="center", va="center", fontsize=10.5,
                family=MONO, weight="bold", color=WHITE if poisoned else INK, zorder=3)
        if i < len(links) - 1:
            ax.plot([x + bw, x + bw + gap], [y + bh / 2] * 2, color=INK, lw=2.5, zorder=1)

# Evolution arrow between the chains.
ax.add_patch(FancyArrowPatch((x0 + 2.75, 4.0), (x0 + 2.75, 2.85), arrowstyle="-|>",
                             mutation_scale=22, lw=2.5, color=RED, zorder=3))
ax.text(x0 + 2.95, 3.35, "same playbook,\nnew artifact", fontsize=9.5, color=INK,
        va="center", alpha=0.8)

# Legend.
ax.add_patch(Rectangle((x0, 0.62), 0.22, 0.22, fc=RED, ec="none"))
ax.text(x0 + 0.35, 0.65, "poisoned link", fontsize=10, color=INK, family=MONO)
ax.add_patch(Rectangle((x0 + 2.4, 0.62), 0.22, 0.22, fc=GREEN, ec="none"))
ax.text(x0 + 2.75, 0.65, "verify every hop", fontsize=10, color=INK, family=MONO)

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "hero.png")
fig.savefig(path, dpi=110, bbox_inches="tight", pad_inches=0, facecolor=PAPER)
print(path)

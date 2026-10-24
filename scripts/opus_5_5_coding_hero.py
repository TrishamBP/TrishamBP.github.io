"""Hero banner for the "Coding with Claude Opus 5.5" blog post (24 Oct 2026):
an editor window showing the four workflow files (discussion, decisions.md,
flow.md, task.md) feeding a "definition of done" check.

Original artwork (no Anthropic logos). Opaque paper panel so it survives
the site's dark mode.

Usage: python scripts/opus_5_5_coding_hero.py <output_dir>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Rectangle

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
PAPER, INK, GREEN, MAGENTA, WHITE = "#e5e5e5", "#1e1e1e", "#028a4b", "#b8399a", "#ffffff"
MONO = "DejaVu Sans Mono"
W, H = 12, 6

fig, ax = plt.subplots(figsize=(W, H))
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")
ax.add_patch(Rectangle((0, 0), W, H, fc=PAPER, ec="none", zorder=0))

# Title block (left).
ax.text(0.6, 4.75, "CODING WITH", fontsize=20, color=INK, family=MONO, weight="bold")
ax.text(0.6, 3.75, "Opus 5.5", fontsize=50, color=INK, weight="bold")
ax.add_patch(Rectangle((0.62, 3.45), 3.9, 0.09, fc=GREEN, ec="none"))
ax.text(0.6, 2.85, "Say what you want.", fontsize=15, color=INK)
ax.text(0.6, 2.4, "Define done. Say when to stop.", fontsize=15, color=INK)
ax.text(0.6, 1.95, "Then let it work.", fontsize=15, color=GREEN, weight="bold")
ax.text(0.6, 0.65, "effort: medium   thinking: always on", fontsize=11, color=INK,
        family=MONO, alpha=0.75)

# Editor window (right).
x0, y0, ww, wh = 6.0, 0.55, 5.45, 4.9
ax.add_patch(FancyBboxPatch((x0 + 0.12, y0 - 0.12), ww, wh, boxstyle="round,pad=0,rounding_size=0.12",
                            fc=INK, ec="none", zorder=1))
ax.add_patch(FancyBboxPatch((x0, y0), ww, wh, boxstyle="round,pad=0,rounding_size=0.12",
                            fc=WHITE, ec=INK, lw=2.5, zorder=2))
ax.add_patch(Rectangle((x0, y0 + wh - 0.5), ww, 0.5, fc=INK, ec="none", zorder=3))
for i, c in enumerate((MAGENTA, "#f5c400", GREEN)):
    ax.add_patch(plt.Circle((x0 + 0.3 + i * 0.28, y0 + wh - 0.25), 0.08, fc=c, ec="none", zorder=4))
ax.text(x0 + 1.3, y0 + wh - 0.33, "~/project  (claude code)", fontsize=10, color=WHITE,
        family=MONO, zorder=4)

files = [
    ("01", "discuss", "architecture talk first", MAGENTA),
    ("02", "decisions.md", "what it decided + what done means", GREEN),
    ("03", "flow.md", "mermaid map of every change", GREEN),
    ("04", "task.md", "why this, not the alternatives", GREEN),
]
for i, (_, name, note, colour) in enumerate(files):
    y = y0 + wh - 1.15 - i * 0.8
    ax.add_patch(Rectangle((x0 + 0.3, y - 0.22), 0.14, 0.5, fc=colour, ec="none", zorder=4))
    ax.text(x0 + 0.6, y + 0.07, name, fontsize=14, color=INK, family=MONO, weight="bold", zorder=4)
    ax.text(x0 + 0.6, y - 0.22, note, fontsize=9.5, color=INK, alpha=0.75, zorder=4)

# "Done" check at the bottom of the window.
ax.add_patch(FancyBboxPatch((x0 + 0.3, y0 + 0.25), ww - 0.6, 0.55,
                            boxstyle="round,pad=0,rounding_size=0.08", fc=GREEN, ec="none", zorder=4))
ax.text(x0 + 0.5, y0 + 0.44, "✓ tests pass  ✓ checklist closed → done",
        fontsize=10, color=WHITE, family=MONO, weight="bold", zorder=5)

ax.add_patch(FancyArrowPatch((5.05, 2.6), (5.85, 2.6), arrowstyle="-|>", mutation_scale=22,
                             lw=2.5, color=INK, zorder=3))

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "hero.png")
fig.savefig(path, dpi=110, bbox_inches="tight", pad_inches=0, facecolor=PAPER)
print(path)

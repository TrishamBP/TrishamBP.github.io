"""Hero banner for the "Cybersecurity Armageddon" newsletter section (26 Oct 2026 issue):
a nuclear-warning placard with hazard stripes and a radiation trefoil.

Opaque PNG (yellow panel) so it survives dark-mode email clients.

Usage: python scripts/cybergeddon_warning_hero.py <output_dir>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Polygon, Rectangle, Wedge

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
YELLOW, BLACK, RED = "#f5c400", "#111111", "#c8102e"
W, H = 12, 6


def hazard_band(ax, y, h):
    ax.add_patch(Rectangle((0, y), W, h, fc=YELLOW, ec="none", zorder=1))
    x = -h
    while x < W + h:
        ax.add_patch(Polygon([(x, y), (x + 0.35, y), (x + 0.35 + h, y + h), (x + h, y + h)],
                             closed=True, fc=BLACK, ec="none", zorder=2))
        x += 0.7


def trefoil(ax, cx, cy, r):
    # Standard radiation symbol: centre disc radius r, blades from 1.5r to 5r, 60 degrees each.
    ax.add_patch(Circle((cx, cy), 5.4 * r, fc=YELLOW, ec=BLACK, lw=4, zorder=3))
    ax.add_patch(Circle((cx, cy), r, fc=BLACK, ec="none", zorder=4))
    for mid in (90, 210, 330):
        ax.add_patch(Wedge((cx, cy), 5 * r, mid - 30, mid + 30, width=3.5 * r,
                           fc=BLACK, ec="none", zorder=4))


fig, ax = plt.subplots(figsize=(W, H))
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")
ax.add_patch(Rectangle((0, 0), W, H, fc=YELLOW, ec="none", zorder=0))
hazard_band(ax, 5.35, 0.65)
hazard_band(ax, 0, 0.65)

trefoil(ax, 2.35, 3.0, 0.36)

ax.add_patch(Rectangle((4.5, 3.95), 2.35, 0.5, fc=RED, ec="none", zorder=3))
ax.text(5.675, 4.2, "WARNING", ha="center", va="center", fontsize=17,
        family="Arial Black", color="white", zorder=4)
ax.text(4.5, 3.2, "CYBERSECURITY", ha="left", va="center", fontsize=40,
        family="Impact", color=BLACK, zorder=4)
ax.text(4.5, 2.25, "ARMAGEDDON", ha="left", va="center", fontsize=52,
        family="Impact", color=RED, zorder=4)
ax.text(4.5, 1.25, "THREAT LEVEL: CRITICAL  //  ALL INFRASTRUCTURE", ha="left",
        va="center", fontsize=13, family="Consolas", weight="bold", color=BLACK, zorder=4)

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "cybersecurity-armageddon-cybergeddon-warning.png")
fig.savefig(path, dpi=150, facecolor=YELLOW, bbox_inches="tight", pad_inches=0)
plt.close(fig)
print("wrote", path)

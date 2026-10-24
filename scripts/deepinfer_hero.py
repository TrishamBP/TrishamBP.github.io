"""Hero banner for the DeepInfer signal post (24 Oct 2026): a top-down,
stylized NVIDIA SM100 (Blackwell) accelerator board, with two compute dies
joined by the die-to-die link, eight HBM3e stacks, power stages and board
traces, plus the DeepSeek whale mark.

Original artwork (no NVIDIA logos). The board is illustrative, not a
floor plan. Opaque field-notes paper panel so it survives the site's dark
mode. Seeded, so reruns are identical.

Usage: python scripts/deepinfer_hero.py <output_dir>
"""
import os
import random
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyBboxPatch, Rectangle

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, "..", "assets", "blogs", "deepinfer", "deepseek-logo.png")

# Field-notes palette (css/signals-field-notes.css).
PAPER, INK, SOFT, HAIR = "#f3f0e8", "#141b18", "#3a423d", "#d8d2c4"
GREEN, MINT, ORANGE, WHITE = "#0d4a3e", "#d4ebe1", "#bf4a1a", "#ffffff"
PCB, PCB_EDGE, TRACE, GOLD = "#0f3a31", "#082820", "#2f7a63", "#c9a24a"
DIE, HBM, SUBSTRATE = "#1d2421", "#2c3430", "#5b4a2e"
MONO = "DejaVu Sans Mono"
W, H = 12, 6
random.seed(7)

fig, ax = plt.subplots(figsize=(W, H))
fig.subplots_adjust(0, 0, 1, 1)
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.set_aspect("equal")
ax.set_autoscale_on(False)
ax.axis("off")
ax.add_patch(Rectangle((0, 0), W, H, fc=PAPER, ec="none", zorder=0))

# Faint grid paper.
for x in range(1, W * 2):
    ax.plot([x / 2, x / 2], [0, H], color=HAIR, lw=0.4, alpha=0.6, zorder=0)
for y in range(1, H * 2):
    ax.plot([0, W], [y / 2, y / 2], color=HAIR, lw=0.4, alpha=0.6, zorder=0)

# ---------------------------------------------------------------- title block
ax.text(0.6, 4.95, "FIG. 04 / SIGNAL DOSSIER", fontsize=10, color=ORANGE,
        family=MONO, weight="bold")
ax.text(0.55, 3.85, "DeepInfer", fontsize=46, color=INK, weight="bold")
ax.add_patch(Rectangle((0.6, 3.62), 3.55, 0.1, fc=GREEN, ec="none"))
ax.text(0.6, 3.05, "by DeepSeek", fontsize=19, color=SOFT)
ax.text(0.6, 2.35, "Open-source inference engine", fontsize=13, color=INK)
ax.text(0.6, 1.97, "for DeepSeek-V4.1-Flash", fontsize=13, color=INK)

ax.add_patch(FancyBboxPatch((0.6, 0.78), 1.05, 1.05, boxstyle="round,pad=0,rounding_size=0.08",
                            fc=WHITE, ec=HAIR, lw=1.2, zorder=3))
logo = plt.imread(LOGO)
ax.imshow(logo, extent=(0.72, 1.53, 0.9, 1.71), interpolation="lanczos", zorder=4)
ax.text(1.95, 1.42, "SM100  /  Ascend 950", fontsize=10.5, color=INK, family=MONO)
ax.text(1.95, 1.05, "EP + EPLB  /  DSpark", fontsize=10.5, color=SOFT, family=MONO)

# ---------------------------------------------------------------- the board
BX, BY, BW, BH = 5.35, 0.45, 6.2, 5.1
ax.add_patch(FancyBboxPatch((BX, BY), BW, BH, boxstyle="round,pad=0,rounding_size=0.18",
                            fc=PCB, ec=PCB_EDGE, lw=2, zorder=1))

# Mounting holes.
for hx, hy in [(BX + 0.3, BY + 0.3), (BX + BW - 0.3, BY + 0.3),
               (BX + 0.3, BY + BH - 0.3), (BX + BW - 0.3, BY + BH - 0.3)]:
    ax.add_patch(Circle((hx, hy), 0.13, fc=PAPER, ec=GOLD, lw=2, zorder=2))

# Package geometry (centered on the board).
PX, PY, PW, PH = BX + 1.25, BY + 1.0, 3.7, 3.1
cx, cy = PX + PW / 2, PY + PH / 2


def trace(points, lw=1.1, color=TRACE, alpha=0.9):
    xs, ys = zip(*points)
    ax.plot(xs, ys, color=color, lw=lw, alpha=alpha, solid_capstyle="round", zorder=2)


# Fan-out traces: from the package edge out to the board edge, with 45-degree jogs.
for i in range(13):
    y = PY + 0.15 + i * (PH - 0.3) / 12
    jog = random.uniform(0.15, 0.35)
    trace([(PX, y), (PX - 0.35, y), (PX - 0.35 - jog, y + random.choice([-1, 1]) * jog),
           (BX + 0.12, y + random.choice([-1, 1]) * jog)])
    trace([(PX + PW, y), (PX + PW + 0.25, y),
           (PX + PW + 0.25 + jog, y + random.choice([-1, 1]) * jog * 0.6),
           (BX + BW - 0.55, y + random.choice([-1, 1]) * jog * 0.6)])
for i in range(9):
    x = PX + 0.3 + i * (PW - 0.6) / 8
    trace([(x, PY), (x, PY - 0.3), (x + random.uniform(-0.25, 0.25), BY + 0.5)], lw=1.0)

# Edge connector (NVLink / host) on the right: gold fingers.
for i in range(16):
    fy = BY + 0.7 + i * 0.235
    ax.add_patch(Rectangle((BX + BW - 0.42, fy), 0.32, 0.13, fc=GOLD, ec="none", zorder=3))

# Power stages (VRMs) and capacitors along the top edge.
for i in range(10):
    vx = PX - 0.2 + i * 0.42
    ax.add_patch(Rectangle((vx, BY + BH - 0.72), 0.3, 0.3, fc="#2a2f2c", ec="#4e5651",
                           lw=0.8, zorder=3))
    ax.add_patch(Circle((vx + 0.15, BY + BH - 0.22), 0.09, fc="#9aa3a0", ec="#5c6562",
                        lw=0.8, zorder=3))
# Scattered SMD passives.
for _ in range(70):
    sx = random.uniform(BX + 0.5, BX + BW - 0.7)
    sy = random.uniform(BY + 0.4, BY + BH - 0.85)
    if PX - 0.15 < sx < PX + PW + 0.15 and PY - 0.15 < sy < PY + PH + 0.15:
        continue
    horiz = random.random() < 0.5
    w, h = (0.12, 0.06) if horiz else (0.06, 0.12)
    ax.add_patch(Rectangle((sx, sy), w, h, fc=random.choice(["#b98b52", "#3c3f3d", "#c7c2b4"]),
                           ec="none", zorder=3))

# Package substrate.
ax.add_patch(FancyBboxPatch((PX, PY), PW, PH, boxstyle="round,pad=0,rounding_size=0.06",
                            fc=SUBSTRATE, ec=GOLD, lw=1.4, zorder=4))
ax.add_patch(Rectangle((PX + 0.12, PY + 0.12), PW - 0.24, PH - 0.24, fc="none",
                       ec="#7d6a45", lw=0.8, ls=(0, (2, 2)), zorder=4))

# Two compute dies.
DW, DH, GAP = 1.25, 1.75, 0.12
d1x = cx - GAP / 2 - DW
d2x = cx + GAP / 2
dy = cy - DH / 2
for dx, label in [(d1x, "DIE 0"), (d2x, "DIE 1")]:
    ax.add_patch(Rectangle((dx, dy), DW, DH, fc=DIE, ec="#59645e", lw=1.2, zorder=5))
    # SM tiles.
    for r in range(6):
        for c in range(4):
            ax.add_patch(Rectangle((dx + 0.1 + c * 0.27, dy + 0.12 + r * 0.26), 0.22, 0.2,
                                   fc=GREEN, ec=TRACE, lw=0.5, alpha=0.95, zorder=6))
    ax.text(dx + DW / 2, dy - 0.17, label, fontsize=7, color=MINT, family=MONO,
            ha="center", va="center", zorder=7)

# Die-to-die link.
ax.add_patch(Rectangle((cx - GAP / 2, dy + 0.25), GAP, DH - 0.5, fc=ORANGE, ec="none", zorder=6))

# Eight HBM3e stacks: two per die per side.
HW, HH = 0.42, 0.62
for dx, side in [(d1x, -1), (d2x, 1)]:
    hx = dx - 0.12 - HW if side < 0 else dx + DW + 0.12
    for k in range(2):
        hy = cy + (0.08 if k == 0 else -0.08 - HH)
        ax.add_patch(Rectangle((hx, hy), HW, HH, fc=HBM, ec="#6b746f", lw=1, zorder=5))
        for s in range(4):
            ax.plot([hx + 0.06, hx + HW - 0.06], [hy + 0.14 + s * 0.11] * 2,
                    color="#59645e", lw=0.8, zorder=6)
for k, (tx, ty) in enumerate([(PX + 0.36, PY + PH - 0.2), (PX + PW - 0.36, PY + PH - 0.2)]):
    ax.text(tx, ty, "HBM3e", fontsize=6.5, color="#d9c89c", family=MONO,
            ha="center", va="center", zorder=7)

# Silkscreen.
ax.text(PX + PW / 2, PY + 0.28, "SM100  ·  2 DIES + D2D LINK  ·  8× HBM3e", fontsize=7.5,
        color="#e6d9b4", family=MONO, ha="center", va="center", zorder=7)
ax.text(BX + 0.55, BY + 0.62, "BLACKWELL CLASS  /  ILLUSTRATIVE", fontsize=7,
        color=MINT, family=MONO, alpha=0.8, zorder=3)

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "deepinfer-deepseek-sm100-hero.png")
fig.savefig(path, dpi=150, facecolor=PAPER)
print(path)

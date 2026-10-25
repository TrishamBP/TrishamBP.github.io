"""Hero banner for the Mamba-2 CUDA Tile signal post: the SSD chunked scan
mapped to GPU tiles.

Left: a token sequence cut into chunks. Centre: the lower-triangular SSD
(semiseparable) matrix, where diagonal blocks are dense intra-chunk tiles
(tensor-core matmuls) and off-diagonal blocks are low-rank, reached through
chunk states. Bottom: the inter-chunk state scan h0 -> h1 -> ... Right: the
diagonal blocks laid onto a grid of GPU tiles.

Original artwork (no NVIDIA logos). Opaque field-notes paper panel so it
survives the site's dark mode.

Usage: python scripts/mamba2_cuda_tile_hero.py <output_dir>
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
MONO = "DejaVu Sans Mono"
W, H = 12, 6
CHUNKS, PER = 4, 4  # 4 chunks of 4 tokens

fig, ax = plt.subplots(figsize=(W, H))
fig.subplots_adjust(0, 0, 1, 1)
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.set_aspect("equal")
ax.axis("off")
ax.add_patch(Rectangle((0, 0), W, H, fc=PAPER, ec="none"))

ax.text(0.45, 5.45, "MAMBA-2  /  SSD CHUNKED SCAN  ->  CUDA TILE", fontsize=11, family=MONO,
        weight="bold", color=GREEN)
ax.text(0.45, 5.1, "y = M x,   M = lower-triangular semiseparable matrix", fontsize=9.5,
        family=MONO, color=SOFT)

# --- Token sequence, cut into chunks --------------------------------------
seq_x, seq_y, cell = 0.45, 4.35, 0.22
for t in range(CHUNKS * PER):
    c = t // PER
    x = seq_x + t * cell + c * 0.12
    ax.add_patch(Rectangle((x, seq_y), cell * 0.86, cell * 0.86,
                           fc=GREEN if c % 2 == 0 else MINT, ec=GREEN, lw=0.8))
ax.text(seq_x, seq_y - 0.25, "x_1 ... x_T  split into chunks of length Q", fontsize=8,
        family=MONO, color=SOFT)

# --- SSD matrix -------------------------------------------------------------
mx, my, size = 0.75, 0.75, 2.9
b = size / CHUNKS
for i in range(CHUNKS):          # row block (output chunk)
    for j in range(i + 1):       # column block (input chunk)
        x0, y0 = mx + j * b, my + (CHUNKS - 1 - i) * b
        if i == j:
            ax.add_patch(Rectangle((x0, y0), b, b, fc=WHITE, ec=HAIR, lw=0.8))
            s = b / PER          # dense lower-triangular tile
            for r in range(PER):
                for k in range(r + 1):
                    ax.add_patch(Rectangle((x0 + k * s + 0.01, y0 + (PER - 1 - r) * s + 0.01),
                                           s - 0.02, s - 0.02, fc=GREEN, ec="none"))
        else:
            ax.add_patch(Rectangle((x0, y0), b, b, fc=MINT, ec=HAIR, lw=0.8, hatch="////"))
ax.add_patch(Rectangle((mx, my), size, size, fc="none", ec=INK, lw=1.4))
ax.text(mx + size + 0.15, my + size - 0.2, "diagonal blocks", fontsize=8.5, family=MONO,
        weight="bold", color=GREEN)
ax.text(mx + size + 0.15, my + size - 0.45, "dense, intra-chunk\n-> tensor-core matmul",
        fontsize=8, family=MONO, color=SOFT, va="top")
ax.text(mx + size + 0.15, my + 1.05, "off-diagonal blocks", fontsize=8.5, family=MONO,
        weight="bold", color=SOFT)
ax.text(mx + size + 0.15, my + 0.8, "low-rank, reached\nthrough chunk states",
        fontsize=8, family=MONO, color=SOFT, va="top")

# --- Inter-chunk state scan ------------------------------------------------
sy = 0.3
for c in range(CHUNKS + 1):
    x = mx + c * b - 0.16
    ax.add_patch(FancyBboxPatch((x, sy - 0.13), 0.32, 0.26, boxstyle="round,pad=0.01,rounding_size=0.05",
                                fc=ORANGE if c else WHITE, ec=ORANGE, lw=1.2))
    ax.text(x + 0.16, sy, f"h{c}", ha="center", va="center", fontsize=7.5, family=MONO,
            color=WHITE if c else ORANGE, weight="bold")
    if c < CHUNKS:
        ax.add_patch(FancyArrowPatch((x + 0.34, sy), (x + b - 0.02, sy), arrowstyle="-|>",
                                     mutation_scale=9, color=ORANGE, lw=1.2))
ax.text(mx + size + 0.5, sy, "inter-chunk state scan", fontsize=8.5, family=MONO,
        color=ORANGE, va="center", weight="bold")

# --- GPU tile grid -----------------------------------------------------------
gx, gy, gw, gh = 7.3, 0.75, 4.25, 3.65
ax.add_patch(FancyBboxPatch((gx, gy), gw, gh, boxstyle="round,pad=0.02,rounding_size=0.12",
                            fc=GREEN, ec=INK, lw=1.4))
ax.text(gx + 0.2, gy + gh - 0.3, "GPU  /  one tile program per (chunk, head)", fontsize=9,
        family=MONO, color=MINT, weight="bold")
cols, rows, lm = 4, 3, 0.55
tw, th = (gw - lm - 0.2) / cols, (gh - 0.85) / rows
for r in range(rows):
    y_row = gy + 0.25 + (rows - 1 - r) * th
    ax.text(gx + 0.12, y_row + th / 2, f"#{r + 1}", fontsize=7.5, family=MONO, color=MINT,
            va="center", weight="bold")
    for c in range(cols):
        x0, y0 = gx + lm + c * tw, y_row
        ax.add_patch(FancyBboxPatch((x0 + 0.05, y0 + 0.05), tw - 0.1, th - 0.1,
                                    boxstyle="round,pad=0.0,rounding_size=0.05",
                                    fc=WHITE, ec=MINT, lw=1))
        s = (tw - 0.3) / PER  # the chunk's dense tile, drawn in miniature
        for i in range(PER):
            for k in range(i + 1):
                ax.add_patch(Rectangle((x0 + 0.15 + k * s, y0 + 0.14 + (PER - 1 - i) * s * 0.62),
                                       s * 0.9, s * 0.55, fc=GREEN, ec="none"))
        if r == 0:
            ax.text(x0 + tw / 2, gy + gh - 0.62, f"chunk {c + 1}", ha="center", fontsize=7.5,
                    family=MONO, color=MINT, weight="bold")
ax.text(gx + 0.12, gy + 0.08, "rows = SSD heads (like attention heads)", fontsize=6.5, family=MONO, color=MINT)
ax.add_patch(FancyArrowPatch((mx + size + 2.1, my + size - 0.6), (gx - 0.08, my + size - 0.3),
                             arrowstyle="-|>", mutation_scale=14, color=INK, lw=1.4,
                             connectionstyle="arc3,rad=-0.2"))

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "mamba-2-ssd-chunked-scan-cuda-tile-hero.png")
fig.savefig(path, dpi=200, facecolor=PAPER)
plt.close(fig)
print("wrote", path)

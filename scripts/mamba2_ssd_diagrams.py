"""Diagrams for section 02 of the Mamba-2 CUDA Tile signal post.

1. mamba-2-ssd-state-jump.png: jumping the state across a whole chunk with
   one matmul, h_{t+T} = h_t + B^T X (decay ignored).
2. mamba-2-ssd-decay-mask.png: the causal decay mask L = exp(g_i - g_j),
   kept only for i >= j, where every kept exponent is <= 0.

Original artwork in the field-notes palette. Opaque paper panel so the
images survive the site's dark mode. Deterministic.

Usage: python scripts/mamba2_ssd_diagrams.py <output_dir>
"""
import math
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
PAPER, INK, SOFT, HAIR = "#f3f0e8", "#141b18", "#3a423d", "#d8d2c4"
GREEN, MINT, ORANGE, WHITE = "#0d4a3e", "#d4ebe1", "#bf4a1a", "#ffffff"
MONO = "DejaVu Sans Mono"
os.makedirs(OUT, exist_ok=True)


def canvas(w, h):
    fig, ax = plt.subplots(figsize=(w, h))
    fig.subplots_adjust(0, 0, 1, 1)
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.add_patch(Rectangle((0, 0), w, h, fc=PAPER, ec="none"))
    return fig, ax


def matrix(ax, x, y, w, h, label, dims, fc, rows=0, cols=0):
    ax.add_patch(Rectangle((x, y), w, h, fc=fc, ec=INK, lw=1.4))
    for r in range(1, rows):
        ax.plot([x, x + w], [y + r * h / rows] * 2, color=HAIR if fc != GREEN else "#2f7a63", lw=0.8)
    for c in range(1, cols):
        ax.plot([x + c * w / cols] * 2, [y, y + h], color=HAIR if fc != GREEN else "#2f7a63", lw=0.8)
    ax.text(x + w / 2, y + h / 2, label, ha="center", va="center", fontsize=15, family=MONO,
            weight="bold", color=WHITE if fc == GREEN else INK)
    ax.text(x + w / 2, y - 0.3, dims, ha="center", va="top", fontsize=9, family=MONO, color=SOFT)


def op(ax, x, y, s):
    ax.text(x, y, s, ha="center", va="center", fontsize=20, family=MONO, color=INK, weight="bold")


# --- 1. State jump -------------------------------------------------------------
fig, ax = canvas(12, 4.6)
ax.text(0.4, 4.15, "JUMP THE STATE ACROSS A CHUNK WITH ONE MATMUL", fontsize=11, family=MONO,
        weight="bold", color=GREEN)
ax.text(0.4, 3.8, "decay ignored for now:  h_{t+T} = h_t + b_{t+1}x_{t+1}^T + ... + b_{t+T}x_{t+T}^T",
        fontsize=9, family=MONO, color=SOFT)
cy = 1.0
matrix(ax, 0.6, cy, 1.6, 1.9, "h_t+T", "(S, H)", MINT, 4, 4)
op(ax, 2.65, cy + 0.95, "=")
matrix(ax, 3.1, cy, 1.6, 1.9, "h_t", "(S, H)", WHITE, 4, 4)
op(ax, 5.15, cy + 0.95, "+")
matrix(ax, 5.6, cy + 0.15, 2.4, 1.6, "B^T", "(S, T)", GREEN, 4, 6)
op(ax, 8.35, cy + 0.95, "x")
matrix(ax, 8.75, cy - 0.25, 1.6, 2.4, "X", "(T, H)", WHITE, 6, 4)
ax.text(10.75, cy + 1.6, "T tokens of\nb_i x_i^T outer\nproducts, summed\nby the inner\ndimension T",
        fontsize=8.5, family=MONO, color=SOFT, va="top")
ax.text(0.4, 0.25, "One Tensor Core matmul replaces T sequential state updates.", fontsize=9.5,
        family=MONO, color=ORANGE, weight="bold")
path = os.path.join(OUT, "mamba-2-ssd-state-jump.png")
fig.savefig(path, dpi=200, facecolor=PAPER)
plt.close(fig)
print("wrote", path)

# --- 2. Causal decay mask --------------------------------------------------------
fig, ax = canvas(12, 5.6)
ax.text(0.4, 5.15, "CAUSAL DECAY MASK  L[i, j] = exp(g_i - g_j)", fontsize=11, family=MONO,
        weight="bold", color=GREEN)
ax.text(0.4, 4.8, "g = cumulative sum of a_t inside the chunk; every a_t < 0, so g only falls",
        fontsize=9, family=MONO, color=SOFT)
a = [-0.35, -0.2, -0.5, -0.15, -0.3, -0.4]  # illustrative negative a_t values
g = [sum(a[: i + 1]) for i in range(len(a))]
n, cell, mx, my = len(a), 0.6, 0.9, 0.55
for i in range(n):
    for j in range(n):
        x0, y0 = mx + j * cell, my + (n - 1 - i) * cell
        if j <= i:
            v = math.exp(g[i] - g[j])  # in (0, 1]
            shade = tuple(int(int(MINT[k:k + 2], 16) * (1 - v) + int(GREEN[k:k + 2], 16) * v)
                          for k in (1, 3, 5))
            ax.add_patch(Rectangle((x0, y0), cell, cell, fc="#%02x%02x%02x" % shade, ec=PAPER, lw=1.5))
            ax.text(x0 + cell / 2, y0 + cell / 2, f"{v:.2f}", ha="center", va="center", fontsize=7,
                    family=MONO, color=WHITE if v > 0.55 else INK)
        else:
            ax.add_patch(Rectangle((x0, y0), cell, cell, fc=PAPER, ec=HAIR, lw=1, hatch="////"))
ax.add_patch(Rectangle((mx, my), n * cell, n * cell, fc="none", ec=INK, lw=1.4))
ax.text(mx + n * cell / 2, my + n * cell + 0.15, "j  (source token)", ha="center", fontsize=8.5,
        family=MONO, color=SOFT)
ax.text(mx - 0.15, my + n * cell / 2, "i  (output token)", ha="right", va="center", rotation=90,
        fontsize=8.5, family=MONO, color=SOFT)

tx = 5.3
ax.add_patch(FancyBboxPatch((tx, 2.85), 6.2, 1.55, boxstyle="round,pad=0.02,rounding_size=0.1",
                            fc=WHITE, ec=GREEN, lw=1.6))
ax.text(tx + 0.25, 4.1, "KEPT  (i >= j, on or below the diagonal)", fontsize=9.5, family=MONO,
        weight="bold", color=GREEN)
ax.text(tx + 0.25, 3.75, "g_i - g_j = a_{j+1} + ... + a_i <= 0\nexp(...) is in (0, 1]: decay, never blow-up",
        fontsize=8.5, family=MONO, color=INK, va="top")
ax.add_patch(FancyBboxPatch((tx, 0.85), 6.2, 1.55, boxstyle="round,pad=0.02,rounding_size=0.1",
                            fc=WHITE, ec=ORANGE, lw=1.6))
ax.text(tx + 0.25, 2.1, "MASKED  (i < j, the future)", fontsize=9.5, family=MONO, weight="bold",
        color=ORANGE)
ax.text(tx + 0.25, 1.75, "g_i - g_j > 0 here, so exp(...) could overflow,\nbut the causal mask throws these away",
        fontsize=8.5, family=MONO, color=INK, va="top")
ax.text(tx, 0.35, "Numbers use illustrative a_t values, not model weights.", fontsize=8, family=MONO,
        color=SOFT, style="italic")
path = os.path.join(OUT, "mamba-2-ssd-decay-mask.png")
fig.savefig(path, dpi=200, facecolor=PAPER)
plt.close(fig)
print("wrote", path)

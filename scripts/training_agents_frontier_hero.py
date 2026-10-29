"""Hero banner for the "Training Agents at the Frontier of AI Industry" signal
post: the agentic RL training loop.

Left: the policy model emitting a multi-turn trajectory of thoughts, tool
calls and observations. Centre: a grid of sandboxed environments (terminal,
browser, repo, API) running rollouts in parallel. Right: verifiers / graders
turning finished trajectories into rewards. Bottom: the policy-update arc
that closes the loop, plus the pretrain -> SFT -> agentic RL stage strip.

Original artwork (no lab logos). Opaque field-notes paper panel so it
survives the site's dark mode.

Usage: python scripts/training_agents_frontier_hero.py <output_dir>
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


ax.text(0.45, 5.45, "TRAINING AGENTS  /  THE AGENTIC RL LOOP", fontsize=11, family=MONO,
        weight="bold", color=GREEN)
ax.text(0.45, 5.1, "policy -> rollouts in sandboxed environments -> verifier reward -> update",
        fontsize=9.5, family=MONO, color=SOFT)

# --- Policy model + trajectory ---------------------------------------------
px, py, pw, ph = 0.45, 1.45, 3.0, 3.3
box(px, py, pw, ph, GREEN, INK, lw=1.4, r=0.12)
ax.text(px + 0.2, py + ph - 0.32, "POLICY  /  LLM agent", fontsize=9, family=MONO,
        color=MINT, weight="bold")
steps = [("think", MINT, GREEN), ("tool_call", WHITE, GREEN), ("observe", ORANGE, WHITE),
         ("think", MINT, GREEN), ("tool_call", WHITE, GREEN), ("observe", ORANGE, WHITE),
         ("answer", WHITE, ORANGE)]
for i, (label, fc, tc) in enumerate(steps):
    y = py + ph - 0.78 - i * 0.36
    box(px + 0.25, y, pw - 0.5, 0.28, fc, MINT if fc != ORANGE else ORANGE, lw=0.8, r=0.05)
    ax.text(px + 0.37, y + 0.14, f"t{i + 1}", fontsize=7, family=MONO, color=tc, va="center",
            weight="bold")
    ax.text(px + 0.75, y + 0.14, label, fontsize=7.5, family=MONO, color=tc, va="center")
ax.text(px + 0.2, py + 0.12, "multi-turn trajectory", fontsize=7, family=MONO, color=MINT)

# --- Sandboxed environments --------------------------------------------------
ex, ey, ew, eh = 4.25, 1.45, 3.6, 3.3
box(ex, ey, ew, eh, WHITE, INK, lw=1.4, r=0.12)
ax.text(ex + 0.2, ey + eh - 0.32, "ENVIRONMENTS  /  parallel rollouts", fontsize=9,
        family=MONO, color=GREEN, weight="bold")
envs = ["$ terminal", "browser", "git repo", "API / tools", "$ terminal", "spreadsheet"]
cw, chh = (ew - 0.5) / 2, (eh - 0.9) / 3
for k, name in enumerate(envs):
    c, r = k % 2, k // 2
    x0, y0 = ex + 0.2 + c * (cw + 0.1), ey + 0.38 + (2 - r) * chh
    box(x0, y0, cw - 0.05, chh - 0.12, MINT, GREEN, lw=0.9, r=0.06)
    ax.add_patch(Rectangle((x0, y0 + chh - 0.32), cw - 0.05, 0.2, fc=GREEN, ec="none"))
    for d in range(3):
        ax.add_patch(Rectangle((x0 + 0.08 + d * 0.12, y0 + chh - 0.26), 0.07, 0.07,
                               fc=MINT, ec="none"))
    ax.text(x0 + 0.12, y0 + (chh - 0.32) / 2, name, fontsize=7.5, family=MONO, color=GREEN,
            va="center", weight="bold")
    for ln in range(2):  # faint log lines
        ax.add_patch(Rectangle((x0 + cw - 0.5, y0 + 0.14 + ln * 0.14), 0.36 - ln * 0.12, 0.05,
                               fc=GREEN, ec="none", alpha=0.35))

# --- Verifier / reward ---------------------------------------------------------
vx, vy, vw, vh = 8.65, 2.55, 2.9, 2.2
box(vx, vy, vw, vh, PAPER, ORANGE, lw=1.6, r=0.12)
ax.text(vx + 0.2, vy + vh - 0.32, "VERIFIERS  /  graders", fontsize=9, family=MONO,
        color=ORANGE, weight="bold")
checks = [("unit tests pass", True), ("task state matches", True), ("rubric / judge", False)]
for i, (label, ok) in enumerate(checks):
    y = vy + vh - 0.8 - i * 0.42
    box(vx + 0.22, y, 0.26, 0.26, ORANGE if ok else WHITE, ORANGE, lw=1, r=0.04)
    ax.text(vx + 0.35, y + 0.13, "+" if ok else "~", ha="center", va="center", fontsize=9,
            family=MONO, color=WHITE if ok else ORANGE, weight="bold")
    ax.text(vx + 0.62, y + 0.13, label, fontsize=7.5, family=MONO, color=INK, va="center")

rx, ry = vx + 0.55, 1.45
box(rx, ry, 1.8, 0.7, ORANGE, INK, lw=1.4, r=0.1)
ax.text(rx + 0.9, ry + 0.35, "reward  r", ha="center", va="center", fontsize=10,
        family=MONO, color=WHITE, weight="bold")
arrow((vx + vw / 2, vy - 0.02), (vx + vw / 2, ry + 0.72), color=ORANGE)

# --- Loop arrows ---------------------------------------------------------------
arrow((px + pw + 0.02, py + ph - 1.0), (ex - 0.02, ey + eh - 1.0))
ax.text((px + pw + ex) / 2, py + ph - 0.82, "act", ha="center", fontsize=7.5, family=MONO,
        color=INK)
arrow((ex - 0.02, ey + 1.0), (px + pw + 0.02, py + 1.0), color=ORANGE)
ax.text((px + pw + ex) / 2, py + 1.12, "obs", ha="center", fontsize=7.5, family=MONO,
        color=ORANGE)
arrow((ex + ew + 0.02, ey + eh - 1.2), (vx - 0.02, vy + vh - 1.0))
ax.text((ex + ew + vx) / 2, ey + eh - 0.95, "trajectory", ha="center", fontsize=7.5,
        family=MONO, color=INK)
arrow((rx + 0.9, ry - 0.03), (px + pw / 2, py - 0.03), color=GREEN, lw=1.8, rad=-0.18, ms=14)
ax.text(5.95, 1.02, "policy update  (RL: advantage-weighted gradient step)", ha="center",
        fontsize=8.5, family=MONO, color=GREEN, weight="bold")

# --- Stage strip -----------------------------------------------------------------
stages = [("pretrain", WHITE, SOFT), ("SFT", MINT, GREEN), ("agentic RL", GREEN, WHITE)]
sx = 0.45
for i, (label, fc, tc) in enumerate(stages):
    x = sx + i * 1.25
    box(x, 0.2, 1.05, 0.3, fc, GREEN, lw=0.9, r=0.05)
    ax.text(x + 0.525, 0.35, label, ha="center", va="center", fontsize=7, family=MONO,
            color=tc, weight="bold")
    if i < len(stages) - 1:
        arrow((x + 1.07, 0.35), (x + 1.23, 0.35), color=GREEN, lw=1, ms=8)
ax.text(11.55, 0.3, "frontier post-training", ha="right", fontsize=7.5, family=MONO, color=SOFT)

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "training-agents-frontier-agentic-rl-loop-hero.png")
fig.savefig(path, dpi=200, facecolor=PAPER)
plt.close(fig)
print("wrote", path)

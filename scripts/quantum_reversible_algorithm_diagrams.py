"""Diagrams for the reversible-algorithm, modular-inversion and DQI sections of the
AI-driven quantum circuit optimization signal post. Numbers come from Anthropic's
"Designing efficient quantum circuits" post and Gu et al. (arXiv:2610.22367).

  1. the two reversibility constraints: no branching, no erasing
  2. elliptic-curve point addition: Toffoli vs qubit Pareto frontier
  3. divsteps branch history: store everything vs decode vs hybrid (illustrative)
  4. optimal polynomial intersection (OPI) over a small finite field
  5. Reed-Solomon locator step: three designs

Usage: python scripts/quantum_reversible_algorithm_diagrams.py <output_dir>
"""
import os
import sys

import numpy as np
import matplotlib
import matplotlib.ticker

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyBboxPatch, FancyArrowPatch, Rectangle

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
INK, GREY, LIGHT, BLUE, RED, GREEN, AMBER = (
    "#0f172a", "#94a3b8", "#e2e8f0", "#2563eb", "#dc2626", "#16a34a", "#d97706")


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, facecolor="white", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("wrote", path)


def box(ax, x, y, w, h, text, color, fs=11):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.03",
                                fc=color, ec=INK, lw=1.3, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK, zorder=4)


def wire(ax, y, x0, x1, label=None):
    ax.plot([x0, x1], [y, y], color=INK, lw=1.4, zorder=1)
    if label:
        ax.text(x0 - 0.12, y, label, ha="right", va="center", fontsize=11, color=INK)


# --- 1. the two reversibility constraints ---------------------------------------------
fig, (a1, a2) = plt.subplots(1, 2, figsize=(14, 4.6))
for a in (a1, a2):
    a.axis("off")
    a.set_aspect("equal")

a1.set_title("Constraint 1: no branching. Both paths are always built", fontsize=12, color=INK)
wire(a1, 2, 0, 6.2, r"$|b\rangle$")
wire(a1, 0.8, 0, 6.2, r"$|x\rangle$")
a1.add_patch(Circle((1.6, 2), 0.11, color=INK, zorder=4))
a1.plot([1.6, 1.6], [2, 1.15], color=INK, lw=1.4, zorder=2)
box(a1, 1.6, 0.8, 1.2, 0.7, "path A", "#e0e7ff")
a1.add_patch(Circle((3.9, 2), 0.11, fc="white", ec=INK, lw=1.4, zorder=4))
a1.plot([3.9, 3.9], [1.9, 1.15], color=INK, lw=1.4, zorder=2)
box(a1, 3.9, 0.8, 1.2, 0.7, "path B", "#fef3c7")
a1.text(3.1, -0.25, "filled dot: run if b = 1    open dot: run if b = 0\n"
        "On a superposition of b, the circuit pays for A and B every time.",
        ha="center", fontsize=10, color=INK)
a1.set_xlim(-0.8, 6.6)
a1.set_ylim(-0.9, 2.6)

a2.set_title("Constraint 2: no erasing. Compute, copy, uncompute", fontsize=12, color=INK)
wire(a2, 2.2, 0, 7.4, r"$|x\rangle$")
wire(a2, 1.4, 0, 7.4, r"$|0\rangle$")
wire(a2, 0.6, 0, 7.4, r"$|0\rangle$")
box(a2, 1.5, 1.8, 1.8, 1.25, "compute\nf", "#e0e7ff")
a2.text(2.6, 1.55, "scratch", fontsize=9, color=RED)
a2.add_patch(Circle((3.7, 1.4), 0.11, color=INK, zorder=4))
a2.plot([3.7, 3.7], [1.4, 0.43], color=INK, lw=1.4, zorder=2)
a2.add_patch(Circle((3.7, 0.6), 0.17, fc="white", ec=INK, lw=1.4, zorder=4))
a2.plot([3.53, 3.87], [0.6, 0.6], color=INK, lw=1.4, zorder=5)
a2.plot([3.7, 3.7], [0.43, 0.77], color=INK, lw=1.4, zorder=5)
box(a2, 5.7, 1.8, 2.0, 1.25, "uncompute\nf$^{-1}$", "#fee2e2")
a2.text(7.5, 1.4, r"$|0\rangle$ clean", va="center", fontsize=10, color=GREEN)
a2.text(7.5, 0.6, r"$|f(x)\rangle$", va="center", fontsize=11, color=INK)
a2.text(3.7, -0.25, "Scratch work can't be deleted. It must be run backwards to zero,\n"
        "which roughly doubles the gates. Keeping it instead costs qubits.",
        ha="center", fontsize=10, color=INK)
a2.set_xlim(-0.8, 8.6)
a2.set_ylim(-0.9, 2.6)
save(fig, "quantum-circuit-reversibility-constraints-uncompute.png")


# --- 2. point-addition Pareto frontier -------------------------------------------------
designs = [  # (name, approach, Toffoli, qubits, by Claude)
    ("Schrottenloher (2026)", "binary GCD + recorded history", 1.9e6, 1446, False),
    ("Claude: divsteps", "divsteps with decoding", 4.0e6, 935, True),
    ("Claude: specialized Euclidean", "specialized packed walk", 2.1e7, 843, True),
    ("Luo et al. (2026)", "packed Euclidean walk", 7.0e7, 838, False),
]
luo, div = designs[3], designs[1]
print(f"divsteps vs Luo: {div[3] / luo[3] - 1:.1%} more qubits, {luo[2] / div[2]:.1f}x fewer Toffolis")

fig, ax = plt.subplots(figsize=(10, 5.4))
prev = sorted([d for d in designs if not d[4]], key=lambda d: d[3])
new = sorted(designs, key=lambda d: d[3])
for pts, color, ls, lab in [(prev, GREY, "--", "frontier before"), (new, RED, "-", "frontier with Claude's designs")]:
    xs, ys = [], []
    for i, d in enumerate(pts):
        xs.append(d[3]); ys.append(d[2])
        if i + 1 < len(pts):
            xs.append(pts[i + 1][3]); ys.append(d[2])
    ax.plot(xs, ys, color=color, ls=ls, lw=1.8, label=lab, zorder=1)
for name, appr, t, q, ours in designs:
    ax.scatter(q, t, s=110, marker="o" if ours else "X", color=RED if ours else INK, zorder=3)
    dx = 18 if q < 1400 else -18
    ax.annotate(f"{name}\n{appr}: {t / 1e6:g}M Toffolis, {q:,} qubits", (q, t),
                xytext=(dx, 6), textcoords="offset points", ha="left" if dx > 0 else "right",
                fontsize=9.5, color=RED if ours else INK, weight="bold" if ours else "normal")
ax.set_yscale("log")
ax.set_xlim(780, 1520)
ax.set_ylim(1e6, 2e8)
ax.set_xlabel("Qubits", color=INK)
ax.set_ylabel("Toffoli gates (log scale)", color=INK)
ax.set_title("Elliptic-curve point addition: Claude's designs push out the Pareto frontier",
             fontsize=12, color=INK)
ax.legend(frameon=False, loc="upper right")
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
save(fig, "elliptic-curve-point-addition-pareto-frontier-qubits-toffoli.png")


# --- 3. divsteps branch history (illustrative) -----------------------------------------
rng = np.random.default_rng(7)
ROUNDS = 16
ambiguous = rng.random(ROUNDS) < 0.3
fig, axes = plt.subplots(3, 1, figsize=(12, 5.8))
rows = [
    ("Naive reversible divsteps: store every branch decision", np.ones(ROUNDS, bool), GREY),
    ("Claude's decoding: infer every decision from the updated pair (f, g)", np.zeros(ROUNDS, bool), GREEN),
    ("Hybrid family: decode the easy cases, store only the hard ones", ambiguous, AMBER),
]
for ax, (title, stored, color) in zip(axes, rows):
    ax.axis("off")
    ax.set_title(title, fontsize=11, color=INK, loc="left")
    for i in range(ROUNDS):
        ax.add_patch(Rectangle((i * 0.75, 0.55), 0.6, 0.4, fc="#e0e7ff", ec=INK, lw=1))
        if stored[i]:
            ax.add_patch(Rectangle((i * 0.75 + 0.15, 0.0), 0.3, 0.3, fc=color, ec=INK, lw=1))
            ax.plot([i * 0.75 + 0.3] * 2, [0.55, 0.3], color=INK, lw=0.8)
    n = int(stored.sum())
    ax.text(ROUNDS * 0.75 + 0.2, 0.75, "divstep rounds", va="center", fontsize=10, color=INK)
    ax.text(ROUNDS * 0.75 + 0.2, 0.15, f"history qubits: {n}/{ROUNDS} rounds", va="center",
            fontsize=10, color=INK)
    ax.set_xlim(-0.1, ROUNDS * 0.75 + 3.6)
    ax.set_ylim(-0.1, 1.05)
fig.suptitle("Where the branch record lives (illustrative, 16 rounds)", fontsize=12, color=INK, y=1.01)
fig.tight_layout()
save(fig, "divsteps-modular-inversion-branch-history-decoding.png")


# --- 4. optimal polynomial intersection over F_13 --------------------------------------
P, N_COLS, K_ACCEPT = 13, 10, 3
xs = np.arange(1, N_COLS + 1)
f = (3 * xs ** 2 + 5 * xs + 2) % P
rng = np.random.default_rng(3)
hit = np.ones(N_COLS, bool)
hit[[3, 7]] = False  # two columns where f misses every acceptable value
accept = []
for x, fx, h in zip(xs, f, hit):
    others = [y for y in range(P) if y != fx]
    picks = list(rng.choice(others, K_ACCEPT - 1 if h else K_ACCEPT, replace=False))
    accept.append(picks + ([fx] if h else []))

fig, ax = plt.subplots(figsize=(11, 5))
for x, acc in zip(xs, accept):
    ax.plot([x, x], [-0.5, P - 0.5], color=LIGHT, lw=1, zorder=0)
    for y in acc:
        ax.add_patch(FancyBboxPatch((x - 0.18, y - 0.38), 0.36, 0.76, boxstyle="round,pad=0.02",
                                    fc="#cbd5e1", ec="none", zorder=1))
ax.plot(xs, f, color=RED, lw=1, ls=":", zorder=2)
for x, fx, h in zip(xs, f, hit):
    ax.scatter(x, fx, s=90, zorder=3, color=RED if h else "white", edgecolor=RED, lw=1.8)
ax.set_xticks(xs)
ax.set_yticks(range(0, P, 2))
ax.set_xlabel("x", color=INK)
ax.set_ylabel(r"y in $\mathbb{F}_{13}$", color=INK)
ax.set_title(rf"Optimal polynomial intersection: $f(x) = 3x^2 + 5x + 2 \ \mathrm{{mod}}\ 13$ hits {hit.sum()} of {N_COLS} columns",
             fontsize=12, color=INK)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
save(fig, "optimal-polynomial-intersection-dqi-finite-field.png")


# --- 5. Reed-Solomon locator step: three designs ----------------------------------------
fig, (l, r) = plt.subplots(1, 2, figsize=(12, 3.8), gridspec_kw={"width_ratios": [1.3, 1]})
names = ["(a) Extended Euclidean\n(Khattar et al., 2025)", "(b) Berlekamp-Massey,\nstores its history",
         "(c) Berlekamp-Massey,\nClaude's design"]
toff = [1.9e6, 1.41e5, 1.41e5]
cols = [GREY, BLUE, RED]
l.barh(range(3), toff, color=cols, height=0.55)
for i, t in enumerate(toff):
    l.text(t * 1.02, i, f"{t:,.0f}", va="center", fontsize=10, color=INK)
l.set_yticks(range(3))
l.set_yticklabels(names, color=INK)
l.set_ylim(2.5, -0.5)
l.set_xlim(0, 2.4e6)
l.set_xlabel("Toffoli gates", color=INK)
l.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v / 1e6:g}M"))
l.set_title("Gates: switching algorithm gives ~13x", fontsize=11, color=INK)

stored = [840, 19]
r.barh([1, 2], stored, color=cols[1:], height=0.55)
r.text(840 * 1.02, 1, "840 (12 qubits x 70 rounds)", va="center", fontsize=10, color=INK)
r.text(19 + 15, 2, "19 (one saved value)", va="center", fontsize=10, color=INK)
r.text(15, 0, "n/a (different algorithm)", va="center", fontsize=10, color=GREY)
r.set_yticks(range(3))
r.set_yticklabels([])
r.set_ylim(2.5, -0.5)
r.set_xlim(0, 1400)
r.set_xlabel("Qubits reserved for stored history", color=INK)
r.set_title("Memory: reconstructing history gives 840 -> 19", fontsize=11, color=INK)
for a in (l, r):
    for s in ("top", "right"):
        a.spines[s].set_visible(False)
fig.tight_layout()
save(fig, "reed-solomon-decoder-berlekamp-massey-quantum-circuit-designs.png")

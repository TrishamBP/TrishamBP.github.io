"""Diagrams for the "How LLMs Can Break the Quantum Bottleneck" section.

  1. Table 1 of Gu et al. (arXiv:2610.22367): improvement in Toffoli x qubit cost
     G_TQ = (T*Q)_baseline / (T*Q)_discovered, per task
  2. SFT -> RL pipeline with a correctness-gated, cost-scaled reward

Usage: python scripts/quantum_llm_results_diagrams.py <output_dir>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
INK, GREY, BLUE, RED, GREEN, AMBER = "#0f172a", "#94a3b8", "#2563eb", "#dc2626", "#16a34a", "#d97706"


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, facecolor="white", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("wrote", path)


# --- 1. Table 1 results ------------------------------------------------------------
# (task, domain, baseline (T, Q), discovered (T, Q)) copied from Table 1 of the paper.
# Excluded: Hermitian DQI decoder (baseline is a whole benchmark circuit, no G_TQ given)
# and prime-field modular inversion (no prior reversible construction to compare to).
TABLE = [
    ("Fixed-point Gaussian", "numerical", (2.4e4, 362), (1583, 139)),
    ("HHL rotation angle", "numerical", (1.6e4, 300), (1348, 115)),
    ("Reed-Solomon DQI decoder", "optimization", (5.1e6, 1938), (4.4e5, 1837)),
    ("Coulomb potential", "chemistry", (6355, 252), (1140, 142)),
    ("Non-abelian lattice gauge", "physics simulation", (1.3e6, 1927), (1.7e5, 1859)),
    ("Fe2S2 alias-sampling Select", "chemistry", (5.5e4, 139), (1.5e4, 126)),
]
PAPER_G = {"Fixed-point Gaussian": 39, "HHL rotation angle": 32, "Reed-Solomon DQI decoder": 12,
           "Coulomb potential": 9.9, "Non-abelian lattice gauge": 7.7, "Fe2S2 alias-sampling Select": 4.1}
COLORS = {"numerical": BLUE, "optimization": AMBER, "chemistry": GREEN, "physics simulation": RED}

rows = []
for name, dom, (tb, qb), (td, qd) in TABLE:
    g = (tb * qb) / (td * qd)
    # Inputs are rounded in the table, so allow ~15% slack against the published ratio.
    assert abs(g / PAPER_G[name] - 1) < 0.15, (name, g, PAPER_G[name])
    rows.append((name, dom, PAPER_G[name]))
    print(f"{name:30s} recomputed G_TQ={g:6.1f}  paper={PAPER_G[name]}")

rows.sort(key=lambda r: r[2])
fig, ax = plt.subplots(figsize=(10, 4.8))
ys = range(len(rows))
ax.barh(ys, [r[2] for r in rows], color=[COLORS[r[1]] for r in rows], height=0.6)
ax.set_yticks(list(ys))
ax.set_yticklabels([r[0] for r in rows], color=INK)
ax.set_xscale("log")
ax.set_xlim(1, 100)
ax.axvline(10, color=GREY, ls="--", lw=1)
ax.text(10.4, -0.55, "10x", color=GREY, fontsize=10)
for y, r in zip(ys, rows):
    ax.text(r[2] * 1.08, y, f"{r[2]:g}x", va="center", fontsize=11, color=INK,
            bbox=dict(fc="white", ec="none", pad=1))
ax.set_xlabel("Improvement in Toffoli x qubit cost vs best published circuit (log scale)", color=INK)
ax.set_title("Claude-discovered quantum circuits vs state of the art (Gu et al., 2026, Table 1)",
             fontsize=12, color=INK)
handles = [plt.Rectangle((0, 0), 1, 1, color=c) for c in COLORS.values()]
ax.legend(handles, COLORS.keys(), loc="lower right", frameon=False, fontsize=10)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
save(fig, "claude-quantum-circuit-optimization-results-toffoli-qubit-cost.png")


# --- 2. SFT -> RL pipeline -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13, 5.2))
ax.axis("off")


def node(x, y, w, h, text, color, fs=11):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.05",
                                fc=color, ec=INK, lw=1.3))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=INK)


def arrow(p0, p1, color=INK, rad=0.0):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=18, color=color, lw=1.6,
                                 connectionstyle=f"arc3,rad={rad}"))


ax.text(1.6, 4.55, "Stage 1: SFT", ha="center", fontsize=13, color=INK, weight="bold")
node(1.6, 3.6, 2.8, 1.0, "Corpus: Qiskit / Cirq code,\npapers, baseline circuits", "#f1f5f9")
node(1.6, 1.9, 2.8, 1.0, "Fine-tuned model writes\nvalid, reversible circuits", "#e0e7ff")
arrow((1.6, 3.05), (1.6, 2.45))

ax.text(8.0, 4.55, "Stage 2: RL against a verifier", ha="center", fontsize=13, color=INK, weight="bold")
node(5.0, 1.9, 2.3, 1.0, "Policy samples\ncandidate circuits", "#e0e7ff")
node(8.0, 1.9, 2.4, 1.0, "Correct on\nall test inputs?", "#fef3c7")
node(11.4, 3.2, 2.4, 1.0, "Reward scales with\n1 / (Toffoli x qubits)", "#dcfce7")
node(11.4, 0.6, 2.4, 1.0, "Reward = 0", "#fee2e2")
arrow((3.05, 1.9), (3.8, 1.9))
arrow((6.2, 1.9), (6.75, 1.9))
arrow((9.25, 2.2), (10.15, 3.0), GREEN)
arrow((9.25, 1.6), (10.15, 0.8), RED)
ax.text(9.5, 2.85, "yes", color=GREEN, fontsize=11)
ax.text(9.5, 0.9, "no", color=RED, fontsize=11)
arrow((11.4, 3.75), (5.0, 2.45), BLUE, rad=0.35)
ax.text(7.9, 3.3, "PPO update / best-of-N selection", color=BLUE, fontsize=11, ha="center")
ax.set_xlim(0, 12.9)
ax.set_ylim(-0.1, 4.9)
save(fig, "sft-rl-quantum-gate-optimization-reward-pipeline.png")

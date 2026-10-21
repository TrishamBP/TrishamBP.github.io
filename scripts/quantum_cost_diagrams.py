"""Diagrams for "The Quantum Bottleneck" section of the AI-driven quantum circuit
optimization signal post.

  1. bit vs qubit
  2. Toffoli gate and its Clifford+T decomposition (verified numerically below)
  3. quantum phase estimation, the algorithm behind ground-state energies
  4. FeMoco Toffoli-count reduction (2017 estimate vs current estimate)
  5. the propose -> evaluate -> evolve loop used to optimize circuits

Usage: python scripts/quantum_cost_diagrams.py <output_dir>
"""
import os
import sys

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyBboxPatch, FancyArrowPatch

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
INK, GREY, BLUE, RED, GREEN, AMBER = "#0f172a", "#94a3b8", "#2563eb", "#dc2626", "#16a34a", "#d97706"


# --- Toffoli decomposition check -------------------------------------------
# Standard 7-T decomposition (Nielsen & Chuang, Fig. 4.9). Qubits: a, b controls; c target.
TOFFOLI_SEQ = [
    ("H", "c"), ("CX", "b", "c"), ("Tdg", "c"), ("CX", "a", "c"), ("T", "c"),
    ("CX", "b", "c"), ("Tdg", "c"), ("CX", "a", "c"), ("T", "b"), ("T", "c"),
    ("H", "c"), ("CX", "a", "b"), ("T", "a"), ("Tdg", "b"), ("CX", "a", "b"),
]
IDX = {"a": 0, "b": 1, "c": 2}
ONE = {
    "H": np.array([[1, 1], [1, -1]]) / np.sqrt(2),
    "T": np.diag([1, np.exp(1j * np.pi / 4)]),
    "Tdg": np.diag([1, np.exp(-1j * np.pi / 4)]),
}


def op_matrix(gate):
    if gate[0] == "CX":
        ctrl, tgt = IDX[gate[1]], IDX[gate[2]]
        m = np.zeros((8, 8))
        for s in range(8):
            bits = [(s >> (2 - k)) & 1 for k in range(3)]
            if bits[ctrl]:
                bits[tgt] ^= 1
            m[bits[0] * 4 + bits[1] * 2 + bits[2], s] = 1
        return m
    mats = [np.eye(2)] * 3
    mats[IDX[gate[1]]] = ONE[gate[0]]
    return np.kron(np.kron(mats[0], mats[1]), mats[2])


u = np.eye(8, dtype=complex)
for g in TOFFOLI_SEQ:
    u = op_matrix(g) @ u
toffoli = np.eye(8)
toffoli[[6, 7]] = toffoli[[7, 6]]
assert np.allclose(u, toffoli), "decomposition is not a Toffoli"
n_t = sum(g[0] in ("T", "Tdg") for g in TOFFOLI_SEQ)
n_cx = sum(g[0] == "CX" for g in TOFFOLI_SEQ)
print(f"Toffoli decomposition verified: {n_t} T gates, {n_cx} CNOTs")


# --- drawing helpers ---------------------------------------------------------
def wire(ax, y, x0, x1, label=None):
    ax.plot([x0, x1], [y, y], color=INK, lw=1.4, zorder=1)
    if label:
        ax.text(x0 - 0.15, y, label, ha="right", va="center", fontsize=12, color=INK)


def box(ax, x, y, text, color="white", w=0.62, h=0.56, fs=11, tc=INK):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02",
                                fc=color, ec=INK, lw=1.3, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=tc, zorder=4)


def control(ax, x, y):
    ax.add_patch(Circle((x, y), 0.09, color=INK, zorder=4))


def target(ax, x, y, r=0.2):
    ax.add_patch(Circle((x, y), r, fc="white", ec=INK, lw=1.4, zorder=4))
    ax.plot([x - r, x + r], [y, y], color=INK, lw=1.4, zorder=5)
    ax.plot([x, x], [y - r, y + r], color=INK, lw=1.4, zorder=5)


def vline(ax, x, y0, y1):
    ax.plot([x, x], [y0, y1], color=INK, lw=1.4, zorder=2)


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, facecolor="white", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("wrote", path)


# --- 1. bit vs qubit -----------------------------------------------------------
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.6), gridspec_kw={"width_ratios": [1, 1.25]})
for a in (a1, a2):
    a.set_aspect("equal")
    a.axis("off")

a1.set_title("Classical bit: exactly one value", fontsize=13, color=INK)
for x, v, on in [(0.6, "0", True), (2.0, "1", False)]:
    a1.add_patch(Circle((x, 1.2), 0.5, fc=BLUE if on else "white", ec=INK, lw=1.5))
    a1.text(x, 1.2, v, ha="center", va="center", fontsize=22, color="white" if on else INK)
a1.text(1.3, 0.2, "either 0  or  1", ha="center", fontsize=12, color=INK)
a1.set_xlim(-0.2, 2.8)
a1.set_ylim(-0.3, 2.2)

a2.set_title(r"Qubit: $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$", fontsize=13, color=INK)
a2.add_patch(Circle((0, 0), 1, fc="#eff6ff", ec=INK, lw=1.5))
t = np.linspace(0, 2 * np.pi, 200)
a2.plot(np.cos(t), 0.28 * np.sin(t), color=GREY, lw=1, ls="--")
a2.plot([0, 0], [-1, 1], color=GREY, lw=1, ls=":")
a2.text(0, 1.12, r"$|0\rangle$", ha="center", fontsize=14, color=INK)
a2.text(0, -1.25, r"$|1\rangle$", ha="center", fontsize=14, color=INK)
a2.add_patch(FancyArrowPatch((0, 0), (0.62, 0.55), arrowstyle="-|>", mutation_scale=18, color=RED, lw=2.2))
a2.text(0.68, 0.62, r"$|\psi\rangle$", fontsize=14, color=RED)
a2.text(1.35, 0.25, r"measure $\rightarrow$ 0 with prob. $|\alpha|^2$", fontsize=11, color=INK)
a2.text(1.35, -0.2, r"measure $\rightarrow$ 1 with prob. $|\beta|^2$", fontsize=11, color=INK)
a2.text(1.35, -0.75, r"$n$ qubits $\rightarrow$ $2^n$ amplitudes", fontsize=11, color=BLUE)
a2.set_xlim(-1.3, 4.3)
a2.set_ylim(-1.5, 1.4)
save(fig, "classical-bit-vs-qubit-superposition.png")


# --- 2. Toffoli gate and its Clifford+T decomposition --------------------------
fig, (l, r) = plt.subplots(1, 2, figsize=(14, 3.6), gridspec_kw={"width_ratios": [2.8, 10.3]})
for a in (l, r):
    a.axis("off")
    a.set_aspect("equal")
ys = {"a": 2, "b": 1, "c": 0}

for q, lab in zip("abc", [r"$a$", r"$b$", r"$c$"]):
    wire(l, ys[q], 0, 1.6, lab)
control(l, 0.8, 2)
control(l, 0.8, 1)
vline(l, 0.8, 0, 2)
target(l, 0.8, 0)
l.text(0.8, -0.85, r"Toffoli: $c \oplus (a \wedge b)$", ha="center", fontsize=11, color=INK)
l.text(2.05, 1, "=", ha="center", va="center", fontsize=26, color=INK)
l.set_xlim(-0.5, 2.3)
l.set_ylim(-1.1, 2.5)

x = 0.6
for q, lab in zip("abc", [r"$a$", r"$b$", r"$c$"]):
    wire(r, ys[q], 0, 0.6 * len(TOFFOLI_SEQ) + 0.8, lab)
for g in TOFFOLI_SEQ:
    if g[0] == "CX":
        control(r, x, ys[g[1]])
        vline(r, x, ys[g[1]], ys[g[2]])
        target(r, x, ys[g[2]], 0.17)
    else:
        is_t = g[0] != "H"
        text = {"H": "H", "T": "T", "Tdg": r"T$^\dagger$"}[g[0]]
        box(r, x, ys[g[1]], text, color="#fee2e2" if is_t else "#e0e7ff", w=0.46, h=0.46, fs=10)
    x += 0.6
r.text(x / 2, -0.85,
       f"{n_t} T gates (red) + {n_cx} CNOTs + 2 H.  In a fault-tolerant machine the T gates dominate the cost.",
       ha="center", fontsize=11, color=INK)
r.set_xlim(-0.4, x + 0.3)
r.set_ylim(-1.1, 2.5)
save(fig, "toffoli-gate-clifford-t-decomposition-circuit.png")


# --- 3. quantum phase estimation --------------------------------------------------
fig, ax = plt.subplots(figsize=(12, 5))
ax.axis("off")
anc = [3.6, 2.8, 2.0]
sysy = 0.6
labels = [r"$|0\rangle$", r"$|0\rangle$", r"$|0\rangle$"]
for y, lab in zip(anc, labels):
    wire(ax, y, 0, 9.6, lab)
ax.plot([0, 9.6], [sysy + 0.08, sysy + 0.08], color=INK, lw=1.4)
ax.plot([0, 9.6], [sysy - 0.08, sysy - 0.08], color=INK, lw=1.4)
ax.text(-0.15, sysy, r"$|\psi\rangle$", ha="right", va="center", fontsize=12, color=INK)
ax.text(-0.75, 2.8, "clock\nqubits", ha="right", va="center", fontsize=10, color=GREY)
ax.text(-0.75, sysy, "molecule\nregister", ha="right", va="center", fontsize=10, color=GREY)

for y in anc:
    box(ax, 0.8, y, "H", color="#e0e7ff")
powers = [r"$U^{4}$", r"$U^{2}$", r"$U^{1}$"]
for i, (y, p) in enumerate(zip(anc, powers)):
    xx = 2.0 + 1.3 * i
    control(ax, xx, y)
    vline(ax, xx, sysy + 0.35, y)
    box(ax, xx, sysy, p, color="#fef3c7", w=0.9, h=0.7, fs=12)
ax.add_patch(FancyBboxPatch((6.1, 1.7), 1.5, 2.2, boxstyle="round,pad=0.02", fc="#dcfce7", ec=INK, lw=1.3, zorder=3))
ax.text(6.85, 2.8, "inverse\nQFT", ha="center", va="center", fontsize=12, color=INK, zorder=4)
for y in anc:
    box(ax, 8.5, y, "M", color="white", w=0.55, h=0.5)
ax.text(9.75, 2.8, r"$\rightarrow$ bits of $E_0$", va="center", fontsize=12, color=INK)
ax.annotate("", xy=(2.0, -0.35), xytext=(4.6, -0.35),
            arrowprops=dict(arrowstyle="<->", color=AMBER, lw=1.6))
ax.text(3.3, -0.75,
        r"controlled $U = e^{-iHt}$ (or a qubitization walk): nearly all the Toffoli gates live here",
        ha="center", fontsize=11, color=AMBER)
ax.set_title("Quantum phase estimation: read a molecule's ground-state energy off a phase",
             fontsize=13, color=INK)
ax.set_xlim(-1.6, 11.6)
ax.set_ylim(-1.1, 4.2)
save(fig, "quantum-phase-estimation-circuit-ground-state-energy.png")


# --- 4. FeMoco Toffoli-count reduction ---------------------------------------------
fig, ax = plt.subplots(figsize=(9, 4.8))
labels = ["2017 estimate", "Current best estimate"]
counts = [5e13, 3.4e8]
bars = ax.bar(labels, counts, color=[GREY, BLUE], width=0.5)
ax.set_yscale("log")
ax.set_ylim(1e7, 1e15)
ax.set_ylabel("Toffoli gates (log scale)", color=INK)
for b, c, t in zip(bars, counts, ["~50 trillion", "~340 million"]):
    ax.text(b.get_x() + b.get_width() / 2, c * 2.2, t, ha="center", fontsize=13, color=INK)
ax.annotate("~150,000x fewer gates\nfrom better algorithms, not better hardware",
            xy=(0.85, 2e9), xytext=(0.62, 2e12), ha="center", fontsize=11, color=RED,
            arrowprops=dict(arrowstyle="-|>", color=RED, lw=1.6))
ax.set_title("Cost of computing FeMoco's ground-state energy on a quantum computer", fontsize=13, color=INK)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
save(fig, "femoco-toffoli-gate-count-reduction.png")


# --- 5. propose -> evaluate -> evolve loop -------------------------------------------
fig, ax = plt.subplots(figsize=(12, 4.2))
ax.axis("off")
nodes = [
    (1.2, 2, "Plain-language\nspec", "#f1f5f9"),
    (4.2, 2, "Claude proposes\na circuit", "#e0e7ff"),
    (7.2, 2, "Evaluator checks\ncorrectness", "#fef3c7"),
    (10.2, 2, "Score: Toffoli\n+ qubit count", "#dcfce7"),
]
for x, y, t, c in nodes:
    ax.add_patch(FancyBboxPatch((x - 1.1, y - 0.6), 2.2, 1.2, boxstyle="round,pad=0.05", fc=c, ec=INK, lw=1.3))
    ax.text(x, y, t, ha="center", va="center", fontsize=12, color=INK)
for (x0, *_), (x1, *_) in zip(nodes, nodes[1:]):
    ax.add_patch(FancyArrowPatch((x0 + 1.15, 2), (x1 - 1.15, 2), arrowstyle="-|>", mutation_scale=18, color=INK, lw=1.6))
ax.add_patch(FancyArrowPatch((10.2, 1.35), (4.2, 1.35), connectionstyle="arc3,rad=-0.35",
                             arrowstyle="-|>", mutation_scale=18, color=RED, lw=1.8))
ax.text(7.2, 0.0, "top-scoring designs seed the next round of proposals", ha="center", fontsize=11, color=RED)
ax.set_xlim(-0.2, 11.6)
ax.set_ylim(-0.4, 3.0)
ax.set_title("Evolutionary loop for AI-driven quantum circuit optimization", fontsize=13, color=INK)
save(fig, "ai-driven-quantum-circuit-optimization-evolutionary-loop.png")

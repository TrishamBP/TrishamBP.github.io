"""SWAP routing on a 2D nearest-neighbour superconducting grid.

Qubits 1..50 sit on a 5 x 10 grid. Qubit 1 must interact with qubit 50, so its
state is SWAPped along a shortest path until the two are neighbours. Each SWAP
compiles to 3 CNOTs; the panel title reports the resulting fidelity hit.
"""
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROWS, COLS = 5, 10
CNOT_ERROR = 0.005  # 0.5% two-qubit gate error, mid-range of the 0.1-1% band

out = sys.argv[1] if len(sys.argv) > 1 else "quantum-swap-routing-2d-grid.png"

def pos(q):
    r, c = divmod(q - 1, COLS)
    return c, ROWS - 1 - r

# Shortest path from q1 (top-left) to q50 (bottom-right): across, then down.
path = [1 + c for c in range(COLS)] + [COLS * r + COLS for r in range(1, ROWS)]
swaps = len(path) - 2          # stop once q1's state is adjacent to q50
cnots = 3 * swaps
fidelity = (1 - CNOT_ERROR) ** cnots

fig, ax = plt.subplots(figsize=(10, 5.6), dpi=150)
fig.patch.set_facecolor("white")

for q in range(1, ROWS * COLS + 1):
    x, y = pos(q)
    if x + 1 < COLS:
        ax.plot([x, x + 1], [y, y], color="#cbd5e1", lw=2, zorder=1)
    if y - 1 >= 0:
        ax.plot([x, x], [y, y - 1], color="#cbd5e1", lw=2, zorder=1)

for a, b in zip(path[:-2], path[1:-1]):
    (x0, y0), (x1, y1) = pos(a), pos(b)
    ax.annotate("", xy=(x1, y1), xytext=(x0, y0),
                arrowprops=dict(arrowstyle="-|>", color="#dc2626", lw=2.5,
                                shrinkA=13, shrinkB=13), zorder=2)

for q in range(1, ROWS * COLS + 1):
    x, y = pos(q)
    if q in (1, 50):
        color = "#2563eb"
    elif q in path[1:-1]:
        color = "#fca5a5"
    else:
        color = "#e2e8f0"
    ax.scatter(x, y, s=520, color=color, edgecolor="#334155", lw=1.2, zorder=3)
    ax.text(x, y, str(q), ha="center", va="center", fontsize=9,
            color="white" if q in (1, 50) else "#0f172a", zorder=4)

ax.set_title(
    f"Routing qubit 1 to qubit 50 on a 2D grid: {swaps} SWAPs = {cnots} extra CNOTs\n"
    f"At {CNOT_ERROR:.1%} error per CNOT, routing alone leaves "
    f"{fidelity:.1%} fidelity before the real gate runs",
    fontsize=12, color="#0f172a")
ax.set_xlim(-0.7, COLS - 0.3)
ax.set_ylim(-0.7, ROWS - 0.3)
ax.set_aspect("equal")
ax.axis("off")
fig.tight_layout()
fig.savefig(out, facecolor="white")
print(f"swaps={swaps} cnots={cnots} fidelity={fidelity:.4f} -> {out}")

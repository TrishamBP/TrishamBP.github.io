"""Supply chain attack flow for the LiteLLM story (26 Oct 2026 newsletter).

Opaque white PNG so it survives dark-mode email clients.

Usage: python scripts/litellm_supply_chain_diagram.py <output_dir>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
INK, RED, GREEN, SOFT = "#1e1e1e", "#c8102e", "#028a4b", "#475569"
STEPS = [
    ("1. Steal tokens", "Leaked GitHub OAuth\ntokens from an exposed\ninternal deployment", RED),
    ("2. Poison release", "litellm 1.107.0 pushed\nto PyPI, Docker Hub\nand GHCR", RED),
    ("3. You install it", "pip install litellm\npulls the trusted name,\nnot a strange package", INK),
    ("4. Malware runs", "Startup hooks fire on\nPython start, even if\nlitellm is never imported", RED),
]

fig, ax = plt.subplots(figsize=(12, 4.4))
ax.set_xlim(0, 12)
ax.set_ylim(0, 4.4)
ax.axis("off")
ax.text(6, 4.1, "How the LiteLLM supply chain attack reached users", ha="center",
        fontsize=16, weight="bold", color=INK)
for i, (title, body, colour) in enumerate(STEPS):
    x = 0.25 + i * 3.0
    ax.add_patch(FancyBboxPatch((x, 0.75), 2.5, 2.8, boxstyle="round,pad=0.02,rounding_size=0.08",
                                fc="white", ec=colour, lw=2.2))
    ax.text(x + 1.25, 3.1, title, ha="center", fontsize=13, weight="bold", color=colour)
    ax.text(x + 1.25, 1.95, body, ha="center", va="center", fontsize=10.5, color=INK)
    if i < 3:
        ax.add_patch(FancyArrowPatch((x + 2.55, 2.15), (x + 2.95, 2.15), arrowstyle="-|>",
                                     mutation_scale=18, color=INK, lw=1.8))
ax.text(6, 0.3, "Attackers didn't hack each company. They hacked what every company trusted.",
        ha="center", fontsize=11, style="italic", color=SOFT)

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "litellm-supply-chain-attack-flow.png")
fig.savefig(path, dpi=200, facecolor="white", bbox_inches="tight", pad_inches=0.25)
plt.close(fig)
print("wrote", path)

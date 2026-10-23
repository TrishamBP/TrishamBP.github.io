"""Diagrams for the "Anatomy of a Security Test" section of the Firefox
security tests blog post.

  1. the three Firefox test types (mochitest, reftest, crashtest) and how each passes
  2. one crashtest read two ways: what CI sees vs what an attacker sees
  3. distance to an exploit: patch alone vs patch + test case

The test code drawn here is schematic (no real bug), for illustration only.

Usage: python scripts/firefox_security_test_diagrams.py <output_dir>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
INK, GREY, BLUE, RED, GREEN, AMBER = "#0f172a", "#94a3b8", "#2563eb", "#dc2626", "#16a34a", "#d97706"
LIGHT = {"blue": "#dbeafe", "red": "#fee2e2", "green": "#dcfce7", "amber": "#fef3c7", "grey": "#f1f5f9"}
MONO = "DejaVu Sans Mono"


def card(ax, x, y, w, h, fc="white", ec=INK, lw=1.4):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                                fc=fc, ec=ec, lw=lw, zorder=2))


def arrow(ax, x0, y0, x1, y1, color=INK, lw=1.6):
    ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle="-|>", mutation_scale=16,
                                 color=color, lw=lw, zorder=3))


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=200, facecolor="white", bbox_inches="tight", pad_inches=0.25)
    plt.close(fig)
    print("wrote", path)


# --- 1. three test types -----------------------------------------------------
def test_types():
    fig, ax = plt.subplots(figsize=(12, 5.2))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 5.2)
    ax.axis("off")
    ax.text(6, 4.95, "Three Firefox test types, three ways to pass", ha="center",
            fontsize=16, weight="bold", color=INK)

    cols = [
        ("Mochitest", "blue", "Runs JavaScript in a web page\nand checks the result",
         'ok(el.isConnected, "…");\nis(value, 42, "…");\nSimpleTest.finish();',
         "PASS if every assertion\nholds"),
        ("Reftest", "green", "Renders two pages and\ncompares the pixels",
         "== test.html ref.html\n!= test.html other.html",
         "PASS if the screenshots\nmatch (==) or differ (!=)"),
        ("Crashtest", "red", "Just loads a page",
         "load 1234567-1.html",
         "PASS if the browser\ndoesn't crash, assert or leak"),
    ]
    for i, (name, tone, what, code, verdict) in enumerate(cols):
        x = 0.3 + i * 3.95
        card(ax, x, 0.3, 3.65, 4.25, fc=LIGHT[tone], ec={"blue": BLUE, "green": GREEN, "red": RED}[tone])
        ax.text(x + 1.82, 4.15, name, ha="center", fontsize=15, weight="bold", color=INK, zorder=4)
        ax.text(x + 1.82, 3.5, what, ha="center", va="center", fontsize=11, color=INK, zorder=4)
        card(ax, x + 0.2, 1.75, 3.25, 1.2, fc=INK, ec=INK)
        ax.text(x + 0.35, 2.35, code, ha="left", va="center", fontsize=9.5, family=MONO,
                color="#e2e8f0", zorder=4)
        ax.text(x + 1.82, 1.0, verdict, ha="center", va="center", fontsize=11, weight="bold",
                color=INK, zorder=4)
    save(fig, "firefox-test-types-mochitest-reftest-crashtest.png")


# --- 2. one crashtest, two readers ---------------------------------------------
def two_readers():
    fig, ax = plt.subplots(figsize=(12, 6.2))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.2)
    ax.axis("off")
    ax.text(6, 5.95, "The same security test, read two ways", ha="center",
            fontsize=16, weight="bold", color=INK)

    # the test file in the middle
    card(ax, 3.55, 0.35, 4.9, 5.0, fc=INK, ec=INK)
    ax.text(3.75, 5.05, "crashtests/1234567-1.html   (schematic)", fontsize=9.5, family=MONO,
            color=GREY, va="center", zorder=4)
    lines = [
        ("<script>", "#e2e8f0"),
        ("  // 1. build the exact object", "#64748b"),
        ("  let node = makeTarget();", "#e2e8f0"),
        ("  // 2. register a callback", "#64748b"),
        ("  watch(node, () => {", "#e2e8f0"),
        ("    node.remove();  // freed", "#fca5a5"),
        ("  });", "#e2e8f0"),
        ("  // 3. trigger it mid-operation", "#64748b"),
        ("  node.update();", "#e2e8f0"),
        ("  // 4. touch the freed memory", "#64748b"),
        ("  node.read();       // boom", "#fca5a5"),
        ("</script>", "#e2e8f0"),
    ]
    for k, (txt, c) in enumerate(lines):
        ax.text(3.75, 4.6 - k * 0.35, txt, fontsize=10, family=MONO, color=c, va="center", zorder=4)

    # left: what CI sees
    card(ax, 0.2, 1.4, 2.9, 2.9, fc=LIGHT["green"], ec=GREEN)
    ax.text(1.65, 3.9, "What CI sees", ha="center", fontsize=13, weight="bold", color=INK, zorder=4)
    ax.text(1.65, 2.75, "Page loaded.\nNo crash.\n\nPASS: the fix\nstill works", ha="center",
            va="center", fontsize=11, color=INK, zorder=4)
    arrow(ax, 3.5, 2.85, 3.15, 2.85, color=GREEN)

    # right: what an attacker sees
    card(ax, 8.9, 0.6, 2.9, 4.5, fc=LIGHT["red"], ec=RED)
    ax.text(10.35, 4.7, "What an attacker sees", ha="center", fontsize=11.5, weight="bold",
            color=INK, zorder=4)
    notes = ["Which component\nis broken", "The exact steps\nto reach the bug",
             "The memory bug\n(use-after-free)", "Proof it fires:\nthe crash"]
    for k, n in enumerate(notes):
        ax.text(10.35, 3.85 - k * 0.9, n, ha="center", va="center", fontsize=10.5, color=INK, zorder=4)
    arrow(ax, 8.5, 2.85, 8.85, 2.85, color=RED)
    save(fig, "security-test-case-ci-vs-attacker-view.png")


# --- 3. distance to an exploit -------------------------------------------------
def distance_to_exploit():
    steps = ["Find the\nbroken code", "Understand\nthe bug", "Build an input\nthat triggers it",
             "Turn the crash\ninto control"]
    rows = [
        ("Patch only", [True, False, False, False]),
        ("Patch + test case", [True, True, True, False]),
    ]
    fig, ax = plt.subplots(figsize=(12, 4.6))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 4.6)
    ax.axis("off")
    ax.text(6, 4.35, "How much work is left for an attacker?", ha="center",
            fontsize=16, weight="bold", color=INK)
    for j, s in enumerate(steps):
        ax.text(3.6 + j * 2.15, 3.55, s, ha="center", va="center", fontsize=11, color=INK)
    for i, (label, done) in enumerate(rows):
        y = 2.35 - i * 1.25
        ax.text(2.3, y, label, ha="right", va="center", fontsize=12.5, weight="bold", color=INK)
        for j, d in enumerate(done):
            x = 2.65 + j * 2.15
            card(ax, x, y - 0.38, 1.9, 0.76, fc=LIGHT["green"] if d else LIGHT["red"],
                 ec=GREEN if d else RED)
            ax.text(x + 0.95, y, "given away" if d else "still to do", ha="center", va="center",
                    fontsize=11, weight="bold", color=GREEN if d else RED, zorder=4)
    ax.text(6, 0.2, "A security test hands over the middle steps for free. Only weaponizing the crash is left.",
            ha="center", fontsize=11, style="italic", color="#475569")
    save(fig, "patch-vs-test-case-exploit-distance.png")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    test_types()
    two_readers()
    distance_to_exploit()

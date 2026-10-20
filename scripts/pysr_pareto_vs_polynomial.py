"""PySR overfitting experiments: Pareto front vs polynomial regression.

Generates the figures and numbers used in the PySR signal post
(_signals/pysr-symbolic-regression-discover-mathematical-laws-from-data.md):

    python scripts/pysr_pareto_vs_polynomial.py

Needs numpy, matplotlib and pysr (PySR downloads Julia on first import).
Writes three PNGs to assets/blogs/pysr/ and prints every table.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from numpy.polynomial import Polynomial  # noqa: E402
from pysr import PySRRegressor  # noqa: E402

SEED = 0
NOISE = 0.2
MAXSIZE = 40
CAP_DEMO = 20  # maxsize value shaded in figure 1
OUT_DIR = Path(__file__).resolve().parents[1] / "assets/blogs/pysr"

# Palette: categorical slots 1-3 of the dataviz reference palette (validated).
S1, S2, S3 = "#2a78d6", "#eb6834", "#1baf7a"
INK, MUTED, GRID, SURFACE = "#1e1e1e", "#52514e", "#dcdcd8", "#fcfcfb"


def truth(x):
    return 2.5 * np.cos(x) + 0.5 * x**2


rng = np.random.default_rng(SEED)
x_train = rng.uniform(-3, 3, 40)
y_train = truth(x_train) + rng.normal(0, NOISE, x_train.size)
x_val = rng.uniform(-3, 3, 500)
y_val = truth(x_val) + rng.normal(0, NOISE, x_val.size)
X_train, X_val = x_train.reshape(-1, 1), x_val.reshape(-1, 1)


def mse(pred, y):
    return float(np.mean((pred - y) ** 2))


def run_pysr(**kw):
    model = PySRRegressor(
        niterations=80,
        maxsize=MAXSIZE,
        random_state=SEED,
        deterministic=True,
        parallelism="serial",
        progress=False,
        verbosity=0,
        temp_equation_file=True,
        **kw,
    )
    model.fit(X_train, y_train, variable_names=["x"])
    rows = []
    for i, row in model.equations_.iterrows():
        rows.append(
            dict(
                idx=i,
                cx=int(row["complexity"]),
                train=mse(model.predict(X_train, index=i), y_train),
                val=mse(model.predict(X_val, index=i), y_val),
                eq=row["equation"],
            )
        )
    return model, rows


def print_front(name, model, rows):
    print(f"\n{name}")
    print("complexity  train_mse  val_mse  equation")
    for r in rows:
        print(f"{r['cx']:10d}  {r['train']:9.3f}  {r['val']:9.3f}  {r['eq']}")
    print("model_selection='best' picks:", model.sympy())


def style(ax, title, xlabel):
    ax.set_facecolor(SURFACE)
    ax.set_title(title, color=INK, loc="left", fontweight="bold")
    ax.set_xlabel(xlabel, color=INK)
    ax.grid(True, color=GRID, lw=0.8)
    ax.set_axisbelow(True)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(MUTED)
    ax.tick_params(colors=MUTED)


def save(fig, name):
    fig.tight_layout()
    path = OUT_DIR / name
    fig.savefig(path, dpi=150, facecolor=SURFACE)
    plt.close(fig)
    print(f"wrote {path}")


plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11})
OUT_DIR.mkdir(parents=True, exist_ok=True)
print(f"noise floor (sigma^2) = {NOISE**2:.3f}")
print(f"true law: train_mse {mse(truth(x_train), y_train):.3f}  val_mse {mse(truth(x_val), y_val):.3f}")

# --- 1. Polynomial regression: one fit per degree. -------------------------
degrees = np.arange(1, 21)
poly = [Polynomial.fit(x_train, y_train, d) for d in degrees]
poly_train = [mse(p(x_train), y_train) for p in poly]
poly_val = [mse(p(x_val), y_val) for p in poly]
print("\nPolynomial regression")
print("degree  train_mse  val_mse")
for d, a, b in zip(degrees, poly_train, poly_val):
    print(f"{d:6d}  {a:9.3f}  {b:9.3f}")

# --- 2. PySR: one search returns the best equation at every complexity. -----
base_model, base = run_pysr(binary_operators=["+", "-", "*"], unary_operators=["cos"])
print_front("PySR Pareto front (+, -, *, cos)", base_model, base)
# Same rule as model_selection="best": highest score among equations whose
# loss is within 1.5x of the most accurate one.
eqs = base_model.equations_
chosen = eqs.query(f"loss <= {1.5 * eqs['loss'].min()}")["score"].idxmax()
picked = list(eqs.index).index(chosen)
# The elbow: the equation with the lowest validation error.
elbow = int(np.argmin([r["val"] for r in base]))
print("validation elbow:", base[elbow]["cx"], base_model.sympy(index=base[elbow]["idx"]))

# --- 3. Operator restriction: the same search with a much wider operator set.
free_model, free = run_pysr(
    binary_operators=["+", "-", "*", "/", "^"], unary_operators=["cos", "exp"]
)
print_front("PySR, wide operator set (+, -, *, /, ^, cos, exp)", free_model, free)

# --- Figure 1: error vs complexity, side by side, shared log y-axis. -------
fig, axes = plt.subplots(1, 2, figsize=(12, 4.8), sharey=True, facecolor=SURFACE)
for ax, xs, tr, va, xlabel, title in [
    (axes[0], degrees, poly_train, poly_val, "Polynomial degree", "Polynomial regression"),
    (axes[1], [r["cx"] for r in base], [r["train"] for r in base], [r["val"] for r in base],
     "Equation complexity (nodes)", "PySR Pareto front"),
]:
    style(ax, title, xlabel)
    ax.plot(xs, tr, color=S1, lw=2, marker="o", ms=5, label="Training error")
    ax.plot(xs, va, color=S2, lw=2, marker="o", ms=5, label="Validation error")
    ax.axhline(NOISE**2, color=MUTED, lw=1, ls="--")
    ax.set_yscale("log")
axes[0].set_ylabel("Mean squared error (log scale)", color=INK)
axes[0].set_xticks(range(2, 21, 2))
axes[1].axvspan(CAP_DEMO + 0.5, MAXSIZE + 1, color=GRID, alpha=0.5, lw=0)
axes[1].text(CAP_DEMO + 1.2, 0.36, f"never built with\nmaxsize={CAP_DEMO}", color=MUTED, fontsize=9, va="top")
axes[0].text(degrees[-1], NOISE**2 * 0.85, "noise floor", color=MUTED, ha="right", va="top", fontsize=9)
pick, elb = base[picked], base[elbow]
axes[1].annotate(
    f"default pick\n(complexity {pick['cx']})", xy=(pick["cx"], pick["val"]),
    xytext=(pick["cx"] + 5, 0.12), color=INK, fontsize=9,
    arrowprops=dict(arrowstyle="->", color=MUTED),
)
axes[1].annotate(
    f"elbow\n(complexity {elb['cx']})", xy=(elb["cx"], elb["val"]),
    xytext=(elb["cx"] - 3, 0.12), color=INK, fontsize=9, ha="center",
    arrowprops=dict(arrowstyle="->", color=MUTED),
)
axes[0].legend(frameon=False, loc="upper center", labelcolor=INK)
save(fig, "pysr-pareto-front-vs-polynomial-regression-overfitting.png")

# --- Figure 2: the fitted curves, with a little extrapolation. -------------
xs = np.linspace(-4, 4, 600)
fig, ax = plt.subplots(figsize=(12, 5), facecolor=SURFACE)
style(ax, "What the models learned", "x")
ax.axvspan(-4, -3, color=GRID, alpha=0.5, lw=0)
ax.axvspan(3, 4, color=GRID, alpha=0.5, lw=0)
ax.text(-3.5, -3.9, "outside\ntraining range", color=MUTED, ha="center", fontsize=9)
ax.text(3.5, -3.9, "outside\ntraining range", color=MUTED, ha="center", fontsize=9)
ax.plot(xs, truth(xs), color=MUTED, lw=1.5, ls="--", label="True law: 2.5 cos(x) + 0.5x²")
ax.plot(xs, poly[14](xs), color=S2, lw=2, label="Polynomial, degree 15")
ax.plot(xs, base_model.predict(xs.reshape(-1, 1), index=pick["idx"]), color=S1, lw=2,
        label=f"PySR default pick, complexity {pick['cx']}")
ax.plot(xs, base_model.predict(xs.reshape(-1, 1), index=elb["idx"]), color=S3, lw=2.5,
        label=f"PySR elbow, complexity {elb['cx']}")
ax.scatter(x_train, y_train, s=36, color=INK, zorder=3, edgecolor=SURFACE, lw=1.5, label="Training data")
ax.set_ylim(-4.5, 12)
ax.set_ylabel("y", color=INK)
ax.legend(frameon=False, loc="upper center", labelcolor=INK, fontsize=9, ncol=3)
save(fig, "pysr-symbolic-regression-vs-polynomial-fit-extrapolation.png")

# --- Figure 3: a wider operator set overfits more at high complexity. -----
fig, ax = plt.subplots(figsize=(12, 4.8), facecolor=SURFACE)
style(ax, "Validation error on the Pareto front", "Equation complexity (nodes)")
for rows, color, label in [
    (free, S2, "Wide operators: + - * / ^ cos exp"),
    (base, S1, "Restricted operators: + - * cos"),
]:
    ax.plot([r["cx"] for r in rows], [r["val"] for r in rows], color=color, lw=2,
            marker="o", ms=5, label=label)
ax.axhline(NOISE**2, color=MUTED, lw=1, ls="--")
ax.text(40, NOISE**2 * 0.93, "noise floor", color=MUTED, ha="right", va="top", fontsize=9)
ax.set_yscale("log")
ax.set_ylim(0.03, 0.5)
ax.set_ylabel("Validation MSE (log scale)", color=INK)
ax.legend(frameon=False, loc="upper right", labelcolor=INK)
save(fig, "pysr-operator-constraints-pareto-front-validation.png")

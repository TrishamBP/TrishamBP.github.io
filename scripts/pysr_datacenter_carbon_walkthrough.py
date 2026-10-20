"""PySR walkthrough on real datacenter telemetry: power -> energy -> carbon.

Generates the numbers and figures for the "Walkthrough of a Real-Life Physics
Problem" section of the PySR signal post:

    python scripts/pysr_datacenter_carbon_walkthrough.py

Reads raw_data/green_ai_datacenter_region_NA.csv (kept local, build-excluded),
fits on 100 sampled rows, validates on every other row, and writes two PNGs to
assets/blogs/pysr/.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from pysr import PySRRegressor  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "raw_data/green_ai_datacenter_region_NA.csv"
OUT_DIR = ROOT / "assets/blogs/pysr"
SEED = 0
N_TRAIN = 100

S1, S2 = "#2a78d6", "#eb6834"
INK, MUTED, GRID, SURFACE = "#1e1e1e", "#52514e", "#dcdcd8", "#fcfcfb"

# --- Step 1: load the telemetry and pick physically meaningful columns. ----
COLUMNS = {
    "power_consumption_kw": "E_it",          # IT power draw, kW (becomes energy below)
    "pue": "PUE",                          # facility power / IT power, dimensionless
    "carbon_intensity_gco2_kwh": "CI",     # grid carbon intensity, gCO2 per kWh
    "renewable_energy_ratio": "r",         # share of energy from renewables, 0-1
    "ambient_temperature_c": "T_amb",      # decoy: outside air temperature
    "cpu_utilization": "u_cpu",            # decoy: CPU load, percent
}
df = pd.read_csv(CSV)
data = df[list(COLUMNS)].rename(columns=COLUMNS)
# Each row is one hour of operation, so IT energy E_it = P x 1 h, in kWh.
HOURS = 1.0
data["E_it"] = data["E_it"] * HOURS
target = df["carbon_emission_kg"]

# --- Step 2: a small training sample; everything else is held out. ---------
train = data.sample(N_TRAIN, random_state=SEED)
X_train, y_train = train, target.loc[train.index]
X_test, y_test = data.drop(train.index), target.drop(train.index)
print(f"train rows: {len(X_train)}, held-out rows: {len(X_test)}")
ratio = y_train / (X_train.E_it * X_train.PUE * X_train.CI * (1 - X_train.r) / 1000)
print(f"training rows off the law by >1%: {(abs(ratio - 1) > 0.01).sum()}")

# --- Step 3: units for every column (DynamicQuantities.jl syntax). ---------
X_units = ["kW*hr", "", "g/(kW*hr)", "", "K", ""]
y_units = "kg"


# The loss from the PySR physics example: relative error in log space, plus a
# penalty when the sign is wrong (the log term alone can't see sign). It is an
# L1-style penalty, so the ~1.5% of rows that break the law pull far less than
# they would under squared error.
LOG_RATIO_LOSS = """function loss_fnc(prediction, target)
    scatter_loss = abs(log((abs(prediction) + 1f-20) / (abs(target) + 1f-20)))
    sign_loss = 10 * (sign(prediction) - sign(target))^2
    return scatter_loss + sign_loss
end
"""


def make_model(**kw):
    return PySRRegressor(
        binary_operators=["+", "-", "*", "/"],
        elementwise_loss=LOG_RATIO_LOSS,
        maxsize=20,
        niterations=300,
        populations=50,
        random_state=SEED,
        deterministic=True,
        parallelism="serial",
        progress=False,
        verbosity=0,
        temp_equation_file=True,
        **kw,
    )


def report(name, model):
    """Print the hall of fame with held-out accuracy for every equation."""
    print(f"\n=== {name} ===")
    print("complexity  train_loss  holdout_median_rel_err  holdout_within_1%  equation")
    best_i, best_err = 0, np.inf
    for i, row in model.equations_.iterrows():
        rel = np.abs(model.predict(X_test, index=i) - y_test) / y_test
        med = float(np.median(rel))
        if med < best_err:
            best_i, best_err = i, med
        print(f"{int(row['complexity']):10d}  {row['loss']:10.4g}  {med:22.5f}  {(rel < 0.01).mean():17.4f}  "
              f"{row['equation']}")
    pred = model.predict(X_test)
    rel = np.abs(pred - y_test) / y_test
    print("model_selection='best' picks:", model.sympy())
    print(f"  held-out median |rel err| = {np.median(rel):.5f}, within 1% = {(rel < 0.01).mean():.4f}")
    print("best on held-out data:", model.sympy(index=best_i))
    return pred, best_i


# --- Step 4: search without units. ------------------------------------------
plain = make_model()
plain.fit(X_train, y_train)
_, plain_best = report("no units", plain)

# --- Step 5: the same search, now dimensionally constrained. ----------------
units = make_model(dimensional_constraint_penalty=10**5, dimensionless_constants_only=True)
units.fit(X_train, y_train, X_units=X_units, y_units=y_units)
pred, _ = report("with units", units)

# --- Step 6: the physics baseline written by hand. ---------------------------
law = X_test.E_it * X_test.PUE * X_test.CI * (1 - X_test.r) / 1000
rel = np.abs(law - y_test) / y_test
off_law = (rel > 0.01).to_numpy()
print(f"\nhand-written law: within 1% = {(rel < 0.01).mean():.4f}")
print(f"held-out rows off the law: {off_law.sum()} "
      f"(measured / law: median {np.median((y_test / law)[off_law]):.3f}; "
      f"mean power {X_test.E_it[off_law].mean():.0f} vs {X_test.E_it[~off_law].mean():.0f} kWh)")

# --- Figures ---------------------------------------------------------------
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11})


def style(ax, title, xlabel, ylabel):
    ax.set_facecolor(SURFACE)
    ax.set_title(title, color=INK, loc="left", fontweight="bold")
    ax.set_xlabel(xlabel, color=INK)
    ax.set_ylabel(ylabel, color=INK)
    ax.grid(True, color=GRID, lw=0.8)
    ax.set_axisbelow(True)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(MUTED)
    ax.tick_params(colors=MUTED)


def save(fig, name):
    fig.tight_layout()
    fig.savefig(OUT_DIR / name, dpi=150, facecolor=SURFACE)
    plt.close(fig)
    print(f"wrote {name}")


# Figure A: predicted vs measured on held-out rows.
fig, ax = plt.subplots(figsize=(9, 6.6), facecolor=SURFACE)
style(ax, "PySR equation vs measured emissions, 28,701 held-out rows",
      "Measured carbon emissions (kg)", "PySR prediction (kg)")
lim = [0, float(max(y_test.max(), pred.max())) * 1.03]
ax.plot(lim, lim, color=MUTED, lw=1, ls="--")
ax.scatter(y_test[~off_law], pred[~off_law], s=7, color=S1, alpha=0.4, lw=0,
           label=f"Follows the law ({(~off_law).mean():.1%} of rows)")
ax.scatter(y_test[off_law], pred[off_law], s=12, color=S2, alpha=0.7, lw=0,
           label=f"Breaks the law ({off_law.mean():.1%} of rows)")
ax.set_xlim(lim)
ax.set_ylim(lim)
ax.text(lim[1] * 0.98, lim[1] * 0.93, "perfect\nprediction", color=MUTED, ha="right", va="top", fontsize=9)
ax.legend(frameon=False, loc="upper left", labelcolor=INK, markerscale=2.5)
save(fig, "pysr-datacenter-carbon-emissions-predicted-vs-actual.png")

# Figure B: training loss vs complexity for both searches.
fig, ax = plt.subplots(figsize=(12, 4.6), facecolor=SURFACE)
style(ax, "Pareto front: with and without units", "Equation complexity (nodes)",
      "Training loss, log-ratio (log scale)")
for model, color, label in [(plain, S2, "No units"), (units, S1, "With units")]:
    eq = model.equations_
    ax.plot(eq["complexity"], eq["loss"], color=color, lw=2, marker="o", ms=5, label=label)
first = units.equations_.iloc[0]
ax.annotate("a lone constant can't be in kg:\ndimensional penalty", xy=(first["complexity"], first["loss"]),
            xytext=(2.4, 2e3), color=INK, fontsize=9, arrowprops=dict(arrowstyle="->", color=MUTED))
ax.set_xticks(range(1, 21, 2))
ax.set_yscale("log")
ax.legend(frameon=False, loc="upper right", labelcolor=INK)
save(fig, "pysr-datacenter-carbon-pareto-front-units.png")

# Figure C: what the no-units equation misses. Law-following rows only.
fig, ax = plt.subplots(figsize=(12, 4.8), facecolor=SURFACE)
style(ax, "Prediction error vs grid carbon intensity", "Grid carbon intensity (gCO₂ per kWh)",
      "Relative error (%)")
ok = ~off_law
for p_, color, label in [
    (plain.predict(X_test, index=plain_best), S2, f"No units: {plain.sympy(index=plain_best)}"),
    (pred, S1, "With units: recovered law"),
]:
    err = 100 * (p_ - y_test) / y_test
    ax.scatter(X_test.CI[ok], err[ok], s=5, color=color, alpha=0.3, lw=0, label=label)
ax.axhline(0, color=MUTED, lw=1, ls="--")
ax.legend(frameon=False, loc="upper right", labelcolor=INK, markerscale=3, fontsize=9)
save(fig, "pysr-datacenter-carbon-error-vs-carbon-intensity.png")

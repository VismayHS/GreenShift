"""Build the savings report tables and figures from the backtest (TEAM_PLAN R11).

Reads   results/backtest.parquet (+ backtest_meta.json)   when the measured backtest exists,
else    results/validation_placeholder/backtest.parquet   (labelled PLACEHOLDER everywhere).

Writes  report/results_tables.md        Tables 1-3 (+ season, weekday, SCI)
        report/figures/res_*.png        six result figures
        results/report_summary.json     the same numbers, read by export_site_data.py

Rules followed:
* Emissions are always the backtest's actual-CI emissions; nothing is rescored here.
* % saved = 1 - sum(policy g) / sum(P0 g), pooled over jobs and nights.
* 95% CIs: percentile bootstrap over nights (2,000 resamples, seed 0).
  Noisy-forecast rows are first averaged over the 10 seeds within each night.
* Grams and kg/year are only printed when job sizes come from RAPL measurements.
  Fleet-scaled numbers are labelled "projection".

Usage:  python scripts/build_report.py [--backtest DIR]
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR  # noqa: E402
from carbonsched.carbon.clean import load_national  # noqa: E402

FIG = PROJECT_ROOT / "report" / "figures"
TABLES = PROJECT_ROOT / "report" / "results_tables.md"
SUMMARY = RESULTS_DIR / "report_summary.json"
TZ = "Europe/London"
N_BOOT = 2000

# Wiesner et al. 2021, Scenario I, GB, non-interrupting, 2020 data, noisy forecast.
# Only the two figures quoted in the paper's text are used; other windows are not invented.
PAPER_GB = {2.0: 4.3, 8.0: 7.4}

POLICY_NAME = {"P0": "P0 cron baseline", "P2": "P2 best window", "P3": "P3 interruptible",
               "P4": "P4 multi-job greedy"}
MODE_NAME = {"api": "API forecast", "noisy": "noisy (Wiesner)", "oracle": "oracle"}
MODES = ["api", "noisy", "oracle"]
COLOURS = {"api": "#1f6f5c", "noisy": "#c08a1e", "oracle": "#5b5f97", "P0": "#9a3b3b"}
SEASONS = {12: "Winter", 1: "Winter", 2: "Winter", 3: "Spring", 4: "Spring", 5: "Spring",
           6: "Summer", 7: "Summer", 8: "Summer", 9: "Autumn", 10: "Autumn", 11: "Autumn"}

plt.rcParams.update({"figure.dpi": 150, "savefig.bbox": "tight", "axes.spines.top": False,
                     "axes.spines.right": False, "axes.grid": True, "grid.alpha": 0.25,
                     "font.size": 9})


# --------------------------------------------------------------------------- loading
def locate(explicit: Path | None) -> tuple[Path, str]:
    if explicit:
        return explicit, "measured" if explicit.resolve() == RESULTS_DIR.resolve() else "placeholder"
    if (RESULTS_DIR / "backtest.parquet").exists():
        return RESULTS_DIR, "measured"
    return RESULTS_DIR / "validation_placeholder", "placeholder"


def load(folder: Path) -> tuple[pd.DataFrame, dict]:
    frame = pd.read_parquet(folder / "backtest.parquet")
    meta = json.loads((folder / "backtest_meta.json").read_text())
    frame["night"] = pd.to_datetime(frame["night"])
    return frame, meta


def _read_json(path: Path) -> dict | None:
    return json.loads(path.read_text()) if path.exists() else None


def per_night(frame: pd.DataFrame, keys: list[str]) -> pd.DataFrame:
    """Sum policy and baseline grams per night (jobs pooled), seeds averaged."""
    by_seed = frame.groupby(keys + ["night", "seed"])[["emissions_g", "baseline_emissions_g"]].sum()
    return by_seed.groupby(keys + ["night"]).mean().reset_index()


def pct(e, b) -> float:
    return float(100 * (1 - np.sum(e) / np.sum(b)))


def boot_ci(e: np.ndarray, b: np.ndarray, rng: np.random.Generator) -> tuple[float, float]:
    idx = rng.integers(0, len(e), size=(N_BOOT, len(e)))
    s = 100 * (1 - e[idx].sum(1) / b[idx].sum(1))
    return float(np.percentile(s, 2.5)), float(np.percentile(s, 97.5))


# --------------------------------------------------------------------------- tables
def table1(nightly: pd.DataFrame, measured: bool, meta: dict) -> list[dict]:
    rng = np.random.default_rng(0)
    keys = ["capacity_k", "policy", "forecast_mode"]
    nights = per_night(nightly, keys)
    scale = (meta.get("SCALE") or 1) * (meta.get("PUE") or 1)
    rows = []
    for (k, pol, mode), g in nights.groupby(keys):
        if pol == "P0":
            continue
        rows_ = nightly[(nightly.capacity_k == k) & (nightly.policy == pol) & (nightly.forecast_mode == mode)]
        e, b = g.emissions_g.to_numpy(), g.baseline_emissions_g.to_numpy()
        lo, hi = boot_ci(e, b, rng)
        saved_per_night_g = float(np.mean(b - e))
        n_jobs = rows_.job.nunique()
        rows.append({
            "capacity_k": int(k), "policy": pol, "forecast_mode": mode,
            "saved_pct": round(pct(e, b), 2), "ci_low": round(lo, 2), "ci_high": round(hi, 2),
            "nights": int(len(g)),
            "delay_median_min": float(rows_.delay_min.median()),
            "delay_p95_min": float(rows_.delay_min.quantile(0.95)),
            "delay_mean_min": round(float(rows_.delay_min.mean()), 1),
            "deadline_misses": int((~rows_.deadline_met).sum()),
            "interrupted_share": round(float(rows_.interrupted.mean()), 3),
            # Measured runs only: laptop grams per job, fleet projection per year.
            "laptop_g_saved_per_job": round(saved_per_night_g / n_jobs / scale, 4) if measured else None,
            "fleet_kg_saved_per_year": round(saved_per_night_g * 365 / 1000, 2) if measured else None,
        })
    return rows


def table2(wiesner: pd.DataFrame) -> list[dict]:
    rng = np.random.default_rng(0)
    keys = ["window_h", "policy", "forecast_mode"]
    nights = per_night(wiesner, keys)
    rows = []
    for (w, pol, mode), g in nights.groupby(keys):
        if pol == "P0":
            continue
        rows_ = wiesner[(wiesner.window_h == w) & (wiesner.policy == pol) & (wiesner.forecast_mode == mode)]
        e, b = g.emissions_g.to_numpy(), g.baseline_emissions_g.to_numpy()
        lo, hi = boot_ci(e, b, rng)
        rows.append({"window_h": float(w), "forecast_mode": mode, "saved_pct": round(pct(e, b), 2),
                     "ci_low": round(lo, 2), "ci_high": round(hi, 2), "nights": int(len(g)),
                     "mean_abs_shift_min": round(float(rows_.delay_min.abs().mean()), 1),
                     "paper_gb_pct": PAPER_GB.get(float(w))})
    return rows


def table3(t1: list[dict]) -> list[dict]:
    """Forecast regret: share of the oracle's saving that a real forecast achieves."""
    idx = {(r["capacity_k"], r["policy"], r["forecast_mode"]): r["saved_pct"] for r in t1}
    out = []
    for (k, pol, mode), v in idx.items():
        if mode != "oracle":
            o = idx[(k, pol, "oracle")]
            out.append({"capacity_k": k, "policy": pol, "forecast_mode": mode, "saved_pct": v,
                        "oracle_pct": o, "ratio": round(v / o, 3) if o else None})
    return out


def breakdown(nightly: pd.DataFrame, k: int, pol: str, by: str) -> list[dict]:
    sub = nightly[(nightly.capacity_k == k) & (nightly.policy.isin([pol, "P0"]))]
    nights = per_night(sub[sub.policy == pol], ["forecast_mode"])
    if by == "season":
        nights["group"] = nights.night.dt.month.map(SEASONS)
        order = ["Winter", "Spring", "Summer", "Autumn"]
    else:
        nights["group"] = np.where(nights.night.dt.weekday >= 5, "Sat/Sun night", "Mon-Fri night")
        order = ["Mon-Fri night", "Sat/Sun night"]
    rng = np.random.default_rng(0)
    out = []
    for grp in order:
        for mode in MODES:
            g = nights[(nights.group == grp) & (nights.forecast_mode == mode)]
            e, b = g.emissions_g.to_numpy(), g.baseline_emissions_g.to_numpy()
            lo, hi = boot_ci(e, b, rng)
            out.append({"group": grp, "forecast_mode": mode, "saved_pct": round(pct(e, b), 2),
                        "ci_low": round(lo, 2), "ci_high": round(hi, 2), "nights": int(len(g))})
    return out


def intensity(nightly: pd.DataFrame, k: int, pol: str) -> list[dict]:
    """Energy-weighted carbon intensity each policy actually ran at (gCO2/kWh)."""
    out = []
    sub = nightly[nightly.capacity_k == k]
    for p in ["P0", pol]:
        for mode in (["api"] if p == "P0" else MODES):
            g = sub[(sub.policy == p) & (sub.forecast_mode == mode)]
            out.append({"policy": p, "forecast_mode": mode,
                        "g_per_kwh": round(float(g.emissions_g.sum() / g.energy_kwh.sum()), 1)})
    return out


# --------------------------------------------------------------------------- figures
def fig_window(t2: list[dict]) -> None:
    fig, ax = plt.subplots(figsize=(6, 3.6))
    df = pd.DataFrame(t2)
    for mode in MODES:
        g = df[df.forecast_mode == mode].sort_values("window_h")
        ax.plot(g.window_h, g.saved_pct, "o-", color=COLOURS[mode], label=f"GreenShift, {MODE_NAME[mode]}")
        ax.fill_between(g.window_h, g.ci_low, g.ci_high, color=COLOURS[mode], alpha=0.15, lw=0)
    ax.scatter(list(PAPER_GB), list(PAPER_GB.values()), marker="*", s=160, color="black", zorder=5,
               label="Wiesner et al. 2021, GB 2020 (noisy)")
    ax.set_xscale("log", base=2)
    ax.set_xticks([0.5, 1, 2, 4, 8], ["±0.5", "±1", "±2", "±4", "±8"])
    ax.set_xlabel("Flexibility window around 01:00 UK (hours)")
    ax.set_ylabel("CO₂ saved vs fixed 01:00 start (%)")
    ax.set_title("Paper replication: one 30 min job per night, 2024-25")
    ax.legend(frameon=False, fontsize=8)
    fig.savefig(FIG / "res_savings_vs_window.png")
    plt.close(fig)


def fig_delay(t1: list[dict]) -> None:
    fig, ax = plt.subplots(figsize=(6, 3.6))
    markers = {"P2": "o", "P3": "s", "P4": "^"}
    for r in t1:
        ax.scatter(r["delay_median_min"] / 60, r["saved_pct"], marker=markers[r["policy"]],
                   s=70 if r["capacity_k"] == 1 else 40, facecolor=COLOURS[r["forecast_mode"]] if r["capacity_k"] == 1 else "white",
                   edgecolor=COLOURS[r["forecast_mode"]], lw=1.4)
    for p, m in markers.items():
        ax.scatter([], [], marker=m, color="grey", label=POLICY_NAME[p])
    for mode in MODES:
        ax.scatter([], [], marker="o", color=COLOURS[mode], label=MODE_NAME[mode])
    ax.scatter([], [], marker="o", facecolor="grey", edgecolor="grey", label="filled: capacity k=1")
    ax.scatter([], [], marker="o", facecolor="white", edgecolor="grey", label="hollow: capacity k=2")
    ax.scatter([0], [0], marker="X", s=90, color=COLOURS["P0"], label="P0 cron at 22:00")
    ax.set_xlabel("Median added delay per job vs P0 completion (hours)")
    ax.set_ylabel("CO₂ saved vs P0 (%)")
    ax.set_title("Savings vs added delay, nightly batch 2024-25 (deadline 07:00 always met)")
    ax.legend(frameon=False, fontsize=7, ncol=2, loc="lower right")
    ax.set_xlim(left=-0.2)
    ax.set_ylim(bottom=-0.5)
    fig.savefig(FIG / "res_savings_vs_delay.png")
    plt.close(fig)


def fig_breakdown(season: list[dict], week: list[dict], k: int, pol: str) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(8, 3.3), gridspec_kw={"width_ratios": [2, 1]}, sharey=True)
    for ax, rows, title in [(axes[0], season, "By season"), (axes[1], week, "By night of week")]:
        df = pd.DataFrame(rows)
        groups = list(dict.fromkeys(df.group))
        x = np.arange(len(groups))
        for i, mode in enumerate(MODES):
            g = df[df.forecast_mode == mode].set_index("group").loc[groups]
            ax.bar(x + (i - 1) * 0.27, g.saved_pct, 0.27, color=COLOURS[mode], label=MODE_NAME[mode],
                   yerr=[g.saved_pct - g.ci_low, g.ci_high - g.saved_pct], capsize=2, error_kw={"lw": 0.8})
        ax.set_xticks(x, groups)
        ax.set_title(title)
    axes[0].set_ylabel(f"CO₂ saved vs P0 (%), {pol}, k={k}")
    axes[0].legend(frameon=False, fontsize=8)
    fig.suptitle("Where the savings come from (95% bootstrap CI over nights)", fontsize=10)
    fig.savefig(FIG / "res_savings_by_season_weekday.png")
    plt.close(fig)


def nightly_pct(nightly: pd.DataFrame, k: int, pol: str, mode: str) -> pd.DataFrame:
    n = per_night(nightly[(nightly.capacity_k == k) & (nightly.policy == pol) & (nightly.forecast_mode == mode)], [])
    n["saved_pct"] = 100 * (1 - n.emissions_g / n.baseline_emissions_g)
    return n


def fig_distribution(nightly: pd.DataFrame, k: int, pol: str) -> dict:
    fig, ax = plt.subplots(figsize=(6, 3.4))
    stats = {}
    bins = np.linspace(-10, 45, 56)
    for mode in ["api", "oracle"]:
        n = nightly_pct(nightly, k, pol, mode)
        ax.hist(n.saved_pct.clip(-10, 45), bins=bins, alpha=0.55, color=COLOURS[mode], label=MODE_NAME[mode])
        counts, _ = np.histogram(n.saved_pct.clip(-10, 45), bins=bins)
        stats[mode] = {"median": round(float(n.saved_pct.median()), 2),
                       "mean": round(float(n.saved_pct.mean()), 2),
                       "bins_from": float(bins[0]), "bin_width": float(bins[1] - bins[0]),
                       "counts": [int(c) for c in counts],
                       "share_nights_worse": round(float((n.saved_pct < 0).mean()), 4),
                       "share_nights_zero": round(float((n.saved_pct.abs() < 1e-9).mean()), 4)}
    ax.axvline(0, color="black", lw=0.8)
    ax.set_xlabel(f"Nightly CO₂ saved vs P0 (%), {pol}, k={k}")
    ax.set_ylabel("Number of nights")
    ax.set_title("Distribution of nightly savings, 2024-25")
    ax.legend(frameon=False)
    fig.savefig(FIG / "res_nightly_distribution.png")
    plt.close(fig)
    return stats


def fig_example(nightly: pd.DataFrame, k: int, pol: str) -> dict:
    """The night whose API saving is closest to the median: CI curve with P0 and policy blocks."""
    n = nightly_pct(nightly, k, pol, "api")
    target = n.saved_pct.median()
    night = n.iloc[(n.saved_pct - target).abs().argsort().iloc[0]].night
    rows = nightly[(nightly.night == night) & (nightly.capacity_k == k) & (nightly.forecast_mode == "api")
                   & (nightly.policy.isin(["P0", pol]))]
    rel, dl = rows.release_utc.iloc[0], rows.deadline_utc.iloc[0]
    nat = load_national()
    ci = nat.loc[rel - pd.Timedelta(hours=2): dl + pd.Timedelta(hours=1) - pd.Timedelta(minutes=30)]
    series = [{"t": t.isoformat(), "actual": None if pd.isna(a) else float(a),
               "forecast": None if pd.isna(f) else float(f)} for t, a, f in zip(ci.index, ci["actual"], ci["forecast"])]
    loc = ci.index.tz_convert(TZ)
    jobs = list(dict.fromkeys(rows.job))
    fig, (ax, gx) = plt.subplots(2, 1, figsize=(7, 4.6), sharex=True, gridspec_kw={"height_ratios": [2, 1.4]})
    ax.step(loc, ci["actual"], where="post", color="black", lw=1.2, label="actual")
    ax.step(loc, ci["forecast"], where="post", color=COLOURS["api"], lw=1.0, ls="--", label="API forecast")
    ax.axvspan(rel.tz_convert(TZ), dl.tz_convert(TZ), color="grey", alpha=0.08, label="22:00-07:00 window")
    ax.set_ylabel("Carbon intensity (gCO₂/kWh)")
    ax.legend(frameon=False, fontsize=8, ncol=3)
    ax.set_title(f"Example night {night.date()} (median API saving): {POLICY_NAME[pol]}, k={k}")
    for i, job in enumerate(jobs):
        for j, (p, colour) in enumerate([("P0", COLOURS["P0"]), (pol, COLOURS["api"])]):
            r = rows[(rows.job == job) & (rows.policy == p)].iloc[0]
            gx.barh(i * 2.4 + j, (r.end_utc - r.start_utc), left=r.start_utc.tz_convert(TZ), height=0.85, color=colour,
                    label=(POLICY_NAME[p] if i == 0 else None))
    gx.set_yticks([i * 2.4 + 0.5 for i in range(len(jobs))], jobs, fontsize=7)
    gx.set_xlabel("Time (UK local)")
    gx.legend(frameon=False, fontsize=7, loc="lower right")
    import matplotlib.dates as mdates
    gx.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M", tz=TZ))
    fig.savefig(FIG / "res_example_night.png")
    plt.close(fig)
    sel = rows[rows.policy == pol]
    return {"night": str(night.date()), "saved_pct": round(float(n.set_index("night").saved_pct[night]), 2),
            "release_utc": rel.isoformat(), "deadline_utc": dl.isoformat(), "series": series,
            "jobs": [{"job": r.job, "p0_start_utc": rows[(rows.job == r.job) & (rows.policy == "P0")].start_utc.iloc[0].isoformat(),
                      "p0_end_utc": rows[(rows.job == r.job) & (rows.policy == "P0")].end_utc.iloc[0].isoformat(),
                      "start_utc": r.start_utc.isoformat(), "end_utc": r.end_utc.isoformat(),
                      "delay_min": float(r.delay_min)} for r in sel.itertuples()]}


def fig_seeds(nightly: pd.DataFrame, k: int) -> list[dict]:
    fig, ax = plt.subplots(figsize=(6, 3.2))
    out = []
    for i, pol in enumerate(["P2", "P3", "P4"]):
        sub = nightly[(nightly.capacity_k == k) & (nightly.policy == pol)]
        noisy = sub[sub.forecast_mode == "noisy"].groupby("seed")[["emissions_g", "baseline_emissions_g"]].sum()
        s = 100 * (1 - noisy.emissions_g / noisy.baseline_emissions_g)
        ax.scatter(np.full(len(s), i) + np.linspace(-0.12, 0.12, len(s)), s, color=COLOURS["noisy"], s=18,
                   label="noisy, one per seed" if i == 0 else None)
        for mode, mk in [("api", "D"), ("oracle", "*")]:
            g = sub[sub.forecast_mode == mode]
            ax.scatter(i + 0.3, pct(g.emissions_g, g.baseline_emissions_g), marker=mk, s=60, color=COLOURS[mode],
                       label=MODE_NAME[mode] if i == 0 else None)
        out.append({"policy": pol, "seeds": [round(float(v), 3) for v in s], "noisy_min": round(float(s.min()), 2), "noisy_max": round(float(s.max()), 2),
                    "noisy_sd": round(float(s.std()), 3)})
    ax.set_xticks([0, 1, 2], [POLICY_NAME[p] for p in ["P2", "P3", "P4"]])
    ax.set_ylabel(f"CO₂ saved vs P0 (%), k={k}")
    ax.set_title("Noisy forecast: spread across 10 seeds")
    ax.legend(frameon=False, fontsize=8)
    fig.savefig(FIG / "res_noisy_seed_spread.png")
    plt.close(fig)
    return out


# --------------------------------------------------------------------------- markdown
def md_table(rows: list[dict], cols: list[tuple[str, str]]) -> str:
    head = "| " + " | ".join(h for h, _ in cols) + " |\n|" + "---|" * len(cols) + "\n"

    def cell(v):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return "n/a"
        return f"{v:g}" if isinstance(v, float) else str(v)
    return head + "".join("| " + " | ".join(cell(r.get(c)) if not callable(c) else c(r) for _, c in cols) + " |\n"
                          for r in rows)


def write_markdown(s: dict) -> None:
    measured = s["status"] == "measured"
    banner = ("" if measured else
              "> **PLACEHOLDER JOB SIZES.** These tables come from `results/validation_placeholder/`. "
              "Job durations are the documented placeholders (1-4 slots) and every job has the same synthetic "
              "energy, so the % figures are valid scheduler results for that job mix but are **not** the "
              "measured-workload result, and no grams or kg are reported. Re-run `python scripts/run_all.py` "
              "after the RAPL campaign to replace them.\n\n")
    ci = lambda r: f"{r['saved_pct']:.2f} [{r['ci_low']:.2f}, {r['ci_high']:.2f}]"  # noqa: E731
    t1cols = [("k", "capacity_k"), ("Policy", "policy"), ("Forecast", "forecast_mode"),
              ("% CO₂ saved [95% CI]", ci), ("Median delay (min)", "delay_median_min"),
              ("p95 delay (min)", "delay_p95_min"), ("Deadline misses", "deadline_misses"),
              ("Laptop g saved / job", "laptop_g_saved_per_job"),
              ("Fleet kg saved / yr (projection)", "fleet_kg_saved_per_year")]
    t2cols = [("Window", lambda r: f"±{r['window_h']:g} h"), ("Forecast", "forecast_mode"),
              ("% CO₂ saved [95% CI]", ci), ("Mean |shift| (min)", "mean_abs_shift_min"),
              ("Wiesner et al. GB 2020", lambda r: f"{r['paper_gb_pct']}%" if r["paper_gb_pct"] else "not quoted")]
    t3cols = [("k", "capacity_k"), ("Policy", "policy"), ("Forecast", "forecast_mode"),
              ("% saved", "saved_pct"), ("Oracle % saved", "oracle_pct"), ("Share of oracle saving", "ratio")]
    bcols = [("Group", "group"), ("Forecast", "forecast_mode"), ("% CO₂ saved [95% CI]", ci), ("Nights", "nights")]
    hk, hp = s["headline"]["capacity_k"], s["headline"]["policy"]
    text = f"""# GreenShift results tables

Generated by `scripts/build_report.py` on {s['generated_utc']} from `{s['source_dir']}`
(backtest SHA-256 `{s['backtest_sha256'][:16]}…`, {s['rows']:,} rows). Do not edit by hand.

{banner}All emissions are scored with the **actual** national carbon intensity; the scheduler only saw the
forecast named in each row. % saved = 1 − Σ policy g / Σ P0 g over all jobs and nights. Brackets are
95% percentile-bootstrap intervals over nights ({N_BOOT} resamples). Delay = job completion minus the
same job's P0 completion. Nights used: {s['nights_nightly']} nightly, {s['nights_wiesner']} replication
(skipped nights and reasons: `backtest_meta.json`). Deadline misses across all rows: **{s['deadline_misses_total']}**.

## Table 1. Nightly batch (5 jobs, release 22:00, deadline 07:00 UK): CO₂ saved vs P0 cron

{md_table(s['table1'], t1cols)}
## Table 2. Paper replication (Wiesner et al. 2021 Scenario I): one 30 min job, baseline 01:00 UK

{md_table(s['table2'], t2cols)}
Our numbers use GB 2024-25 data; the paper used GB 2020. They are comparable in method, not a reproduction.

## Table 3. Forecast regret: how much of the perfect-forecast saving a real forecast achieves

{md_table(s['table3'], t3cols)}
## Table 4. Savings by season and by night of the week ({POLICY_NAME[hp]}, k={hk})

{md_table(s['by_season'] + s['by_weekday'], bcols)}
Season is the month of the night's 22:00 release; "Sat/Sun night" means a release on Saturday or Sunday.

## Table 5. Carbon intensity the batch actually ran at (k={hk}), energy-weighted, gCO₂/kWh

{md_table(s['intensity'], [("Policy", "policy"), ("Forecast", "forecast_mode"), ("gCO₂/kWh", "g_per_kwh")])}
This is the operational term `I` of the SCI (`SCI = (E × I + M) / R`, R = one nightly batch).
E per batch: {'see the measurement table' if measured else '**pending the RAPL campaign**'}; M (embodied) is not changed by
time shifting and is out of scope.

## Figures

| File | Shows |
|---|---|
| `figures/res_savings_vs_window.png` | Replication: % saved vs window, with the paper's GB points |
| `figures/res_savings_vs_delay.png` | Nightly: % saved vs median added delay, every policy × forecast × k |
| `figures/res_savings_by_season_weekday.png` | Table 4 as bars |
| `figures/res_nightly_distribution.png` | Histogram of per-night savings (API vs oracle) |
| `figures/res_example_night.png` | One median night: CI curve with P0 and {hp} job blocks |
| `figures/res_noisy_seed_spread.png` | Noisy forecast, one point per seed |
"""
    TABLES.write_text(text, encoding="utf-8")


# --------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--backtest", type=Path, help="folder holding backtest.parquet (default: auto)")
    ap.add_argument("--headline-k", type=int, default=1)
    ap.add_argument("--headline-policy", default="P4")
    args = ap.parse_args()
    folder, status = locate(args.backtest)
    frame, meta = load(folder)
    if status == "measured" and meta.get("job_sizing", {}).get("source") != "measurements":
        status = "placeholder"
    measured = status == "measured"
    FIG.mkdir(parents=True, exist_ok=True)
    nightly = frame[frame.scenario == "nightly"]
    wiesner = frame[frame.scenario == "wiesner_s1"]
    k, pol = args.headline_k, args.headline_policy

    t1 = table1(nightly, measured, meta)
    t2 = table2(wiesner) if len(wiesner) else []
    t3 = table3(t1)
    season = breakdown(nightly, k, pol, "season")
    week = breakdown(nightly, k, pol, "weekday")
    fig_window(t2) if t2 else None
    fig_delay(t1)
    fig_breakdown(season, week, k, pol)
    dist = fig_distribution(nightly, k, pol)
    example = fig_example(nightly, k, pol)
    seeds = fig_seeds(nightly, k)

    head = {m: next(r for r in t1 if r["capacity_k"] == k and r["policy"] == pol and r["forecast_mode"] == m)
            for m in MODES}
    summary = {
        "status": status,
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "source_dir": str(folder.relative_to(PROJECT_ROOT)),
        "backtest_sha256": meta.get("backtest_sha256", ""),
        "git_commit": meta.get("git_commit"),
        "rows": int(len(frame)),
        "nights_nightly": int(nightly.night.nunique()),
        "nights_wiesner": int(wiesner.night.nunique()),
        "nights_skipped": len(meta.get("nights_skipped", [])),
        "deadline_misses_total": int((~frame.deadline_met).sum()),
        "job_sizing": meta.get("job_sizing"),
        "jobs": [{"name": j["name"], "duration_slots": j["duration_slots"], "interruptible": j["interruptible"],
                  "energy_kwh": j["energy_kwh"] if measured else None} for j in meta.get("resolved_jobs", [])],
        "headline": {"capacity_k": k, "policy": pol, **{m: head[m] for m in MODES}},
        "table1": t1, "table2": t2, "table3": t3,
        "by_season": season, "by_weekday": week,
        "intensity": intensity(nightly, k, pol),
        "distribution": dist, "example_night": example, "noisy_seeds": seeds,
        "paper_gb": {str(w): v for w, v in PAPER_GB.items()},
        "verification": _read_json(folder / "verification.json"),
        "tests": _read_json(RESULTS_DIR / "pytest_summary.json"),
    }
    SUMMARY.write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    write_markdown(summary)

    print(f"Source: {folder} ({status.upper()}), {len(frame):,} rows, deadline misses {summary['deadline_misses_total']}")
    print(f"Headline {pol} k={k}: " + ", ".join(
        f"{m} {head[m]['saved_pct']:.2f}% [{head[m]['ci_low']:.2f}, {head[m]['ci_high']:.2f}]" for m in MODES))
    print(f"Wrote {TABLES.relative_to(PROJECT_ROOT)}, {SUMMARY.relative_to(PROJECT_ROOT)}, report/figures/res_*.png")


if __name__ == "__main__":
    main()

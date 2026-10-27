"""EDA of the cleaned GB carbon-intensity data (HANDOFF §8 step 6).

Writes figures to report/figures/eda_*.png and the key numbers to
results/eda_carbon_summary.json (also the table view behind every figure).

Usage:
    python scripts/eda_carbon.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR  # noqa: E402
from carbonsched.carbon import clean  # noqa: E402
from carbonsched.carbon.uk_api import REGIONS  # noqa: E402

FIG_DIR = PROJECT_ROOT / "report" / "figures"
TZ = "Europe/London"
SURFACE, INK, INK2, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#e4e3df"
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]  # validated slots 1-4 (dataviz reference palette)
SEASONS = {12: "Winter", 1: "Winter", 2: "Winter", 3: "Spring", 4: "Spring", 5: "Spring",
           6: "Summer", 7: "Summer", 8: "Summer", 9: "Autumn", 10: "Autumn", 11: "Autumn"}
CREDIT = "Data: Carbon Intensity API, NESO (CC BY 4.0)"

plt.rcParams.update({
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
    "axes.edgecolor": GRID, "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "text.color": INK, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False, "axes.spines.left": False,
    "lines.linewidth": 2, "font.size": 10, "axes.titlesize": 12, "axes.titleweight": "bold",
    "axes.titlelocation": "left", "legend.frameon": False,
})


def _hour(idx: pd.DatetimeIndex, local: bool = True) -> np.ndarray:
    t = idx.tz_convert(TZ) if local else idx
    return t.hour + t.minute / 60


def _label_ends(ax, profiles: dict[str, pd.Series], colors: dict[str, str]) -> None:
    """Direct label at the right end of each line, nudged apart to avoid collisions."""
    ends = sorted(((s.iloc[-1], k) for k, s in profiles.items()))
    ymin, ymax = ax.get_ylim()
    gap, last = 0.07 * (ymax - ymin), -np.inf
    for y, k in ends:
        y = max(y, last + gap)
        ax.annotate(k, xy=(profiles[k].index[-1], profiles[k].iloc[-1]), xytext=(24.3, y),
                    textcoords="data", va="center", fontsize=9, color=INK,
                    arrowprops=dict(arrowstyle="-", color=colors[k], lw=1))
        last = y
    ax.set_xlim(0, 27)


def _save(fig, name: str) -> str:
    fig.text(0.01, 0.01, CREDIT, fontsize=7.5, color=INK2)
    p = FIG_DIR / f"{name}.png"
    fig.savefig(p, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return p.name


def _hours_axis(ax, local: bool = True) -> None:
    ax.set_xticks(range(0, 25, 3))
    ax.set_xlabel("Hour of day (UK local time)" if local else "Hour of day (UTC)")
    ax.set_ylabel("gCO2/kWh")


def profile_by_season(nat: pd.DataFrame, out: dict) -> str:
    df = pd.DataFrame({"ci": nat["actual"], "h": _hour(nat.index),
                       "season": nat.index.tz_convert(TZ).month.map(SEASONS)}).dropna()
    fig, ax = plt.subplots(figsize=(8, 4.2))
    prof, colors = {}, {}
    for (s, c) in zip(["Winter", "Spring", "Summer", "Autumn"], SERIES):
        p = df[df.season == s].groupby("h")["ci"].mean()
        ax.plot(p.index, p.values, color=c)
        prof[s], colors[s] = p, c
        out.setdefault("hourly_mean_by_season_local", {})[s] = p.round(1).to_dict()
    _label_ends(ax, prof, colors)
    _hours_axis(ax)
    ax.set_title("GB national carbon intensity by hour of day and season, 2024-25")
    ax.set_ylim(bottom=0)
    return _save(fig, "eda_hourly_by_season")


def monthly(nat: pd.DataFrame, out: dict) -> str:
    m = nat["actual"].resample("MS").mean()
    out["monthly_mean"] = {k.strftime("%Y-%m"): round(v, 1) for k, v in m.items()}
    fig, ax = plt.subplots(figsize=(8, 3.6))
    ax.plot(m.index, m.values, color=SERIES[0], marker="o", markersize=4)
    lo, hi = m.idxmin(), m.idxmax()
    for t, va in ((lo, "top"), (hi, "bottom")):
        ax.annotate(f"{t:%b %Y}: {m[t]:.0f}", (t, m[t]), xytext=(0, -10 if va == "top" else 8),
                    textcoords="offset points", ha="center", va=va, fontsize=9)
    ax.set_ylabel("gCO2/kWh")
    ax.set_ylim(0, m.max() * 1.2)
    ax.set_title("GB national monthly mean carbon intensity (actual)")
    return _save(fig, "eda_monthly")


def weekday_weekend(nat: pd.DataFrame, out: dict) -> str:
    loc = nat.index.tz_convert(TZ)
    df = pd.DataFrame({"ci": nat["actual"], "h": _hour(nat.index),
                       "kind": np.where(loc.dayofweek >= 5, "Weekend", "Weekday")}).dropna()
    fig, ax = plt.subplots(figsize=(8, 4))
    prof, colors = {}, {}
    for k, c in zip(["Weekday", "Weekend"], SERIES):
        p = df[df.kind == k].groupby("h")["ci"].mean()
        ax.plot(p.index, p.values, color=c)
        prof[k], colors[k] = p, c
        out.setdefault("hourly_mean_weekday_weekend_local", {})[k] = p.round(1).to_dict()
    out["mean_weekday"], out["mean_weekend"] = (round(df[df.kind == k]["ci"].mean(), 1)
                                                for k in ("Weekday", "Weekend"))
    _label_ends(ax, prof, colors)
    _hours_axis(ax)
    ax.set_ylim(bottom=0)
    ax.set_title("Weekday vs weekend hourly profile, 2024-25")
    return _save(fig, "eda_weekday_weekend")


def regional(regs: dict[int, pd.DataFrame], out: dict) -> list[str]:
    means = pd.Series({REGIONS[r]: df["forecast"].mean() for r, df in regs.items()}).sort_values()
    out["regional_mean_forecast"] = means.round(1).to_dict()
    out["regional_long_gap_slots"] = {REGIONS[r]: int(df["long_gap"].sum()) for r, df in regs.items()}
    fig, ax = plt.subplots(figsize=(8, 3.8))
    bars = ax.barh(means.index, means.values, color=SERIES[0], height=0.6)
    ax.bar_label(bars, fmt="%.0f", padding=4, fontsize=9)
    ax.grid(axis="y", visible=False)
    ax.set_xlabel("Mean forecast gCO2/kWh, 2024-25")
    ax.set_title("Regional carbon intensity differs by an order of magnitude")
    names = [_save(fig, "eda_regional_mean")]

    # cleanest, median and dirtiest of the fetched regions
    by_name = {REGIONS[r]: r for r in regs}
    pick = [by_name[means.index[i]] for i in (0, len(means) // 2, -1)]
    fig, ax = plt.subplots(figsize=(8, 4.2))
    prof, colors = {}, {}
    for r, c in zip(pick, SERIES):
        df = regs[r]
        p = pd.Series(df["forecast"].values, index=_hour(df.index)).groupby(level=0).mean()
        ax.plot(p.index, p.values, color=c)
        prof[REGIONS[r]], colors[REGIONS[r]] = p, c
    _label_ends(ax, prof, colors)
    _hours_axis(ax)
    ax.set_ylim(bottom=0)
    ax.set_title("Hourly profile in three regions (regional forecast), 2024-25")
    names.append(_save(fig, "eda_regional_hourly"))
    return names


def forecast_err(nat: pd.DataFrame, out: dict) -> str:
    out["forecast_error"] = {k: round(v, 3) for k, v in clean.forecast_error(nat).items()}
    ok = nat["forecast"].notna() & nat["actual"].notna()
    err = (nat.loc[ok, "forecast"] - nat.loc[ok, "actual"])
    by_h = err.abs().groupby(_hour(err.index)).mean()
    out["forecast_mae_by_hour_local"] = by_h.round(2).to_dict()
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(10, 3.8), gridspec_kw={"width_ratios": [1.3, 1]})
    a1.bar(by_h.index, by_h.values, width=0.4, color=SERIES[0])
    a1.set_xticks(range(0, 25, 3))
    a1.set_xlabel("Hour of day (UK local time)")
    a1.set_ylabel("MAE, gCO2/kWh")
    a1.set_title("National forecast error by hour")
    a2.hist(err.clip(-60, 60), bins=np.arange(-60, 62, 4), color=SERIES[0], rwidth=0.85)
    a2.axvline(0, color=INK2, lw=1)
    a2.set_xlabel("Forecast - actual, gCO2/kWh (clipped at ±60)")
    a2.set_ylabel("Half-hours")
    e = out["forecast_error"]
    a2.set_title(f"MAE {e['mae']:.1f} · bias {e['bias']:+.1f} · RMSE {e['rmse']:.1f}")
    return _save(fig, "eda_forecast_error")


def neso_check(nat: pd.DataFrame, out: dict) -> str | None:
    if not clean.NESO_FILE.exists():
        return None
    neso = clean.load_neso()
    j = pd.concat([nat["actual"], neso["CARBON_INTENSITY"]], axis=1).dropna()
    d = j["CARBON_INTENSITY"] - j["actual"]
    out["neso_vs_api_actual"] = {"n": len(j), "pearson_r": round(j.corr().iloc[0, 1], 4),
                                 "mae": round(d.abs().mean(), 2), "bias_neso_minus_api": round(d.mean(), 2),
                                 "exact_match_pct": round(100 * (d == 0).mean(), 1),
                                 "neso_lag_slots": -1}
    fig, ax = plt.subplots(figsize=(5.2, 5))
    hb = ax.hexbin(j["actual"], j["CARBON_INTENSITY"], gridsize=60, mincnt=1, cmap="Blues", bins="log")
    lim = [0, max(j.max()) * 1.05]
    ax.plot(lim, lim, color=INK2, lw=1)
    ax.set_xlim(lim)
    ax.set_ylim(lim)
    ax.set_xlabel("API actual, gCO2/kWh")
    ax.set_ylabel("NESO historic, gCO2/kWh")
    o = out["neso_vs_api_actual"]
    ax.set_title(f"API vs NESO: r {o['pearson_r']:.3f}, MAE {o['mae']:.1f}")
    fig.colorbar(hb, ax=ax, label="half-hours (log)")
    return _save(fig, "eda_neso_validation")


def night_stats(nat: pd.DataFrame, out: dict) -> None:
    """Where in the day the minimum falls; nothing here assumes a deadline convention."""
    ci = nat["actual"].dropna()
    loc = ci.tz_convert(TZ)
    day_min_hour = loc.groupby(loc.index.date).idxmin().map(lambda t: t.hour)
    out["share_of_days_min_in_local_hour"] = (day_min_hour.value_counts(normalize=True)
                                              .sort_index().round(3).to_dict())
    h = loc.index.hour
    night = (h >= 22) | (h < 7)
    out["mean_22_to_07_local"] = round(loc[night].mean(), 1)
    out["mean_07_to_22_local"] = round(loc[~night].mean(), 1)


def main() -> None:
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    nat = clean.load_national()
    regs = {r: clean.load_regional(r) for r in sorted(REGIONS)
            if (clean.CARBON_DIR / f"gb_region{r:02d}_2024-01-01_2026-01-01.csv").exists()}
    out: dict = {
        "period": "2024-01-01 to 2026-01-01 UTC",
        "national_slots": len(nat),
        "national_long_gap_slots": int(nat["long_gap"].sum()),
        "national_mean_actual": round(nat["actual"].mean(), 1),
    }
    figs = [profile_by_season(nat, out), monthly(nat, out), weekday_weekend(nat, out),
            *regional(regs, out), forecast_err(nat, out), neso_check(nat, out)]
    night_stats(nat, out)
    (RESULTS_DIR / "eda_carbon_summary.json").write_text(json.dumps(out, indent=2, default=str))
    print("figures:", [f for f in figs if f])
    for k in ("national_mean_actual", "mean_22_to_07_local", "mean_07_to_22_local", "mean_weekday",
              "mean_weekend", "forecast_error", "neso_vs_api_actual", "regional_mean_forecast",
              "regional_long_gap_slots"):
        print(f"{k}: {out.get(k)}")


if __name__ == "__main__":
    main()

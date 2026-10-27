"""Clean carbon-intensity series onto a complete 30-min UTC grid.

Rules (docs/HANDOFF.md §8 step 6):
- Reindex to every half-hour in [start, end), keyed on the period start `from`.
- Linearly interpolate gaps of at most MAX_INTERP_SLOTS (2 h); longer gaps stay
  NaN and are flagged in `long_gap`, so callers decide what to do with them.
- `forecast_eda` fills a missing forecast from `actual`, for EDA only; the
  scheduler must decide on `forecast` alone.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .. import RAW_DIR

MAX_INTERP_SLOTS = 4  # 4 x 30 min = 2 h
CARBON_DIR = RAW_DIR / "carbon"
NESO_FILE = CARBON_DIR / "neso_historic_generation_mix.csv"


def _grid(start: str, end: str) -> pd.DatetimeIndex:
    return pd.date_range(start, end, freq="30min", tz="UTC", inclusive="left", name="from")


def _gap_runs(missing: pd.Series) -> pd.Series:
    """Length of the run of consecutive missing slots each slot belongs to (0 if present)."""
    run_id = (missing != missing.shift()).cumsum()
    sizes = missing.groupby(run_id).transform("sum")
    return sizes.where(missing, 0).astype(int)


def regrid(df: pd.DataFrame, value_cols: list[str], start: str, end: str) -> pd.DataFrame:
    """Reindex to the full grid, interpolate short gaps, and add gap flags.

    Adds `missing_row` (no API record), and per value column the run length is
    used to fill only gaps <= MAX_INTERP_SLOTS. `long_gap` is True where the
    first value column is still NaN after filling.
    """
    df = df.drop_duplicates("from", keep="last").set_index("from")
    grid = _grid(start, end)
    out = df.reindex(grid)
    out["missing_row"] = ~grid.isin(df.index)
    for c in value_cols:
        miss = out[c].isna()
        short = miss & (_gap_runs(miss) <= MAX_INTERP_SLOTS)
        filled = out[c].interpolate(method="time", limit_area="inside")
        out[f"{c}_interp"] = short & filled.notna()
        out[c] = out[c].where(~short, filled)
    out["long_gap"] = out[value_cols[0]].isna()
    return out


def load_national(start: str = "2024-01-01", end: str = "2026-01-01",
                  path: Path | None = None) -> pd.DataFrame:
    """National forecast/actual/index on the 30-min grid, plus `forecast_eda`."""
    path = path or CARBON_DIR / f"gb_national_{start}_{end}.csv"
    df = pd.read_csv(path, parse_dates=["from", "to"])
    out = regrid(df.drop(columns="to"), ["forecast", "actual"], start, end)
    out["long_gap"] = out["forecast"].isna() | out["actual"].isna()
    out["forecast_eda"] = out["forecast"].fillna(out["actual"])
    return out


def load_regional(region_id: int, start: str = "2024-01-01", end: str = "2026-01-01",
                  path: Path | None = None) -> pd.DataFrame:
    """Regional forecast (no `actual` exists) and generation mix on the 30-min grid."""
    path = path or CARBON_DIR / f"gb_region{region_id:02d}_{start}_{end}.csv"
    df = pd.read_csv(path, parse_dates=["from", "to"])
    mix = [c for c in df.columns if c.startswith("mix_")]
    out = regrid(df.drop(columns=["to", "region_id", "region"]), ["forecast", *mix], start, end)
    out.insert(0, "region_id", region_id)
    out.insert(1, "region", df["region"].iloc[0])
    return out


def load_neso(start: str = "2024-01-01", end: str = "2026-01-01",
              path: Path | None = None, lag_slots: int = -1) -> pd.DataFrame:
    """NESO historic CARBON_INTENSITY (and fuel %), indexed like the API grid.

    DATETIME has no zone suffix. It is UTC (clock-change days have 48 rows),
    and it best matches the API `actual` when shifted back one slot, i.e. it
    labels the period end (2024-25: r 0.993 vs 0.987 unshifted, in both GMT
    and BST). This is inferred from the data, not from NESO documentation.
    `lag_slots` shifts the timestamps by whole half-hours.
    """
    df = pd.read_csv(path or NESO_FILE, parse_dates=["DATETIME"])
    df["from"] = df["DATETIME"].dt.tz_localize("UTC") + pd.Timedelta(minutes=30 * lag_slots)
    df = df.drop(columns="DATETIME").drop_duplicates("from", keep="last").set_index("from")
    return df.reindex(_grid(start, end))


def forecast_error(nat: pd.DataFrame) -> dict[str, float]:
    """MAE, bias, RMSE and MAPE of the national forecast vs actual (non-interpolated slots only)."""
    ok = nat["forecast"].notna() & nat["actual"].notna() & ~nat["forecast_interp"] & ~nat["actual_interp"]
    err = (nat.loc[ok, "forecast"] - nat.loc[ok, "actual"]).astype(float)
    act = nat.loc[ok, "actual"].astype(float)
    return {
        "n": int(ok.sum()),
        "mae": float(err.abs().mean()),
        "bias": float(err.mean()),
        "rmse": float(np.sqrt((err ** 2).mean())),
        "mae_pct_of_mean": float(100 * err.abs().mean() / act.mean()),
        "mape": float(100 * (err.abs() / act).mean()),
    }

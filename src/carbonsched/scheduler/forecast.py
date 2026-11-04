"""Decision signals isolated from the actual series used for accounting."""
from __future__ import annotations

from dataclasses import dataclass
import numpy as np
import pandas as pd


@dataclass(frozen=True)
class Signal:
    values: np.ndarray
    missing_slots: int = 0
    substitutions: int = 0
    unresolved: int = 0


def build_signal(data: pd.DataFrame, slots: pd.DatetimeIndex, mode: str,
                 decision_time, seed: int = 0) -> Signal:
    """API gaps use only raw actual from completed periods 24 h earlier.

    Synthetic oracle/noisy modes deliberately use actual and must never be
    described as deployable forecasts. Historical API CSVs lack publication
    vintages, so causality is enforceable for our fallback, not provable for
    the upstream retrospective archive.
    """
    if mode == "api":
        values = data["forecast"].reindex(slots).to_numpy(dtype=float, copy=True)
        if "forecast_interp" in data:
            interpolated = data["forecast_interp"].reindex(slots, fill_value=False).to_numpy(dtype=bool)
            values[interpolated] = np.nan
        missing = ~np.isfinite(values)
        lag = slots - pd.Timedelta(hours=24)
        previous = data["actual"].reindex(lag).to_numpy(dtype=float, copy=True)
        available = lag + pd.Timedelta(minutes=30) <= pd.Timestamp(decision_time)
        if "actual_interp" in data:
            available &= ~data["actual_interp"].reindex(lag, fill_value=False).to_numpy(dtype=bool)
        fill = missing & available & np.isfinite(previous)
        values[fill] = previous[fill]
        return Signal(values, int(missing.sum()), int(fill.sum()), int((~np.isfinite(values)).sum()))
    actual = data["actual"].reindex(slots).to_numpy(dtype=float, copy=True)
    if mode == "oracle":
        return Signal(actual)
    if mode != "noisy":
        raise ValueError(f"unknown forecast mode {mode}")
    # Generate one reproducible annual noise stream, independent of window size
    # or policy. Include year in seed so different years do not share noise.
    noise = pd.Series(index=data.index, dtype=float)
    for year in sorted(set(data.index.year)):
        mask = data.index.year == year
        mean = data.loc[mask, "actual"].mean()
        rng = np.random.default_rng(np.random.SeedSequence([seed, int(year)]))
        noise.loc[mask] = rng.normal(0, 0.05 * mean, int(mask.sum()))
    return Signal(actual + noise.reindex(slots).to_numpy())

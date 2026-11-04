"""Measurement statistics and auditable campaign outputs."""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.special import stdtrit

from .model import calibrate

METRICS = ["duration_s", "rapl_pkg_j", "rapl_cores_j", "attributable_j",
           "gross_kwh", "attributable_kwh", "mean_cpu_util", "executor_cpu_s",
           "spark_inputBytes", "spark_shuffleReadBytes", "spark_shuffleWriteBytes"]


def summarize(records: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for job, group in records.groupby("job", sort=False):
        row = {"job": job, "n": len(group)}
        for metric in METRICS:
            values = group[metric].astype(float)
            mean, std = values.mean(), values.std(ddof=1)
            margin = stdtrit(len(values) - 1, 0.975) * std / np.sqrt(len(values)) if len(values) > 1 else np.nan
            row.update({f"{metric}_mean": mean, f"{metric}_std": std,
                        f"{metric}_ci95_low": mean - margin, f"{metric}_ci95_high": mean + margin,
                        f"{metric}_cv": std / abs(mean) if mean != 0 else np.nan})
        row["quality_pass"] = bool(len(group) >= 5 and group.duration_s.min() >= 30
                                   and group.attributable_j.min() > 0
                                   and row["duration_s_cv"] < 0.1 and row["attributable_j_cv"] < 0.1)
        rows.append(row)
    return pd.DataFrame(rows)


def subtract_idle(records: pd.DataFrame, idle_w: float) -> pd.DataFrame:
    records = records.copy()
    records["idle_w"] = idle_w
    records["attributable_j"] = (records.rapl_pkg_j - idle_w * records.duration_s).clip(lower=0)
    records["gross_kwh"] = records.rapl_pkg_j / 3.6e6
    records["kwh"] = records.gross_kwh  # backwards-compatible, explicitly gross
    records["attributable_kwh"] = records.attributable_j / 3.6e6
    return records


def fit_model(records: pd.DataFrame) -> dict:
    idle, peak, r2 = calibrate(records.mean_cpu_util.to_numpy(),
                               (records.rapl_pkg_j / records.duration_s).to_numpy())
    return {"p_idle_w": idle, "p_max_w": peak, "r2": r2, "n": len(records),
            "fit": "run-average RAPL package watts versus time-weighted CPU utilisation",
            "scope": "CPU package only; set memory_gb=0 and pue=1 for comparison",
            "physical_coefficients": bool(peak >= idle >= 0)}

"""Measurement statistics and auditable campaign outputs."""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.special import stdtrit

from .model import calibrate

METRICS = ["duration_s", "rapl_pkg_j", "rapl_cores_j", "attributable_j",
           "gross_kwh", "attributable_kwh", "mean_cpu_util", "executor_cpu_s",
           "spark_inputBytes", "spark_shuffleReadBytes", "spark_shuffleWriteBytes"]


def combine_qualified_cohorts(sessions: list[tuple[str, pd.DataFrame, dict]], jobs: list[dict]):
    """Accept whole passing job cohorts, never remove individual outlier rows."""
    if not sessions:
        raise ValueError("at least one session is required")
    selected, excluded, frames = {}, [], []
    reference = sessions[0][2]
    expected = {job["name"]: job for job in jobs}
    for session_id, frame, meta in sessions:
        if meta.get("status") not in {"complete", "quality_failed"}:
            raise ValueError("session must have completed its idle-bookended quality assessment")
        if not all(key in meta for key in ("idle_start_w", "idle_end_w", "idle_used_w")):
            raise ValueError("both idle bookends are required")
        for key in ("cpu", "scale_factor", "cores", "driver_memory"):
            if meta.get(key) != reference.get(key):
                raise ValueError(f"incompatible sessions: {key}")
        if set(frame.energy_source) != {"rapl"}:
            raise ValueError("only measured RAPL cohorts are accepted")
        if not np.isfinite(frame[["duration_s", "rapl_pkg_j", "attributable_j"]]).all().all():
            raise ValueError("measurement values must be finite")
        for row in summarize(frame).itertuples(index=False):
            group = frame.loc[frame.job == row.job].copy()
            if row.job not in expected:
                raise ValueError("unknown measured workload")
            if not (group.repeats == expected[row.job].get("repeats", 1)).all():
                raise ValueError("catalogue repetitions differ from measured workload")
            if not row.quality_pass:
                excluded.append({"session": session_id, "job": row.job, "n": row.n,
                                 "reason": "whole cohort failed the predefined quality gate"})
                continue
            if row.job in selected:
                raise ValueError("multiple passing cohorts; selection must not depend on energy")
            selected[row.job] = session_id
            group["measurement_session"] = session_id
            frames.append(group)
    if set(selected) != set(expected):
        raise ValueError(f"missing passing cohorts: {sorted(set(expected) - set(selected))}")
    return pd.concat(frames, ignore_index=True), selected, excluded


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

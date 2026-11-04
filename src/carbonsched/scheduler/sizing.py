"""Resolve catalogue sizes from actual measurements, or labelled placeholders."""
from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd

from .models import Job, SLOT, night_window


def load_sizes(catalogue: Path, measurements: Path, config: dict) -> tuple[list[dict], dict]:
    catalogue_data = json.loads(catalogue.read_text(encoding="utf-8"))
    jobs = catalogue_data["jobs"]
    if not measurements.exists():
        slots = config["placeholder_slots"]
        if len(slots) != len(jobs):
            raise ValueError("one placeholder duration is required for each job")
        sizes = [{**j, "duration_slots": int(s), "energy_kwh": config["placeholder_energy_kwh"]}
                 for j, s in zip(jobs, slots)]
        return sizes, {"source": "placeholder", "scale": None, "pue": config["pue"],
                       "energy_basis": "synthetic placeholder, not measured"}
    frame = pd.read_csv(measurements)
    required = {"job", "duration_s", "attributable_kwh", "energy_source"}
    if not required.issubset(frame.columns):
        raise ValueError(f"measurements missing columns: {required - set(frame.columns)}")
    if set(frame.energy_source) != {"rapl"}:
        raise ValueError("final scheduler sizes require labelled RAPL measurements")
    if "scale_factor" in frame and "scale_factor" in catalogue_data:
        if not (frame.scale_factor == catalogue_data["scale_factor"]).all():
            raise ValueError("catalogue scale factor differs from measurements")
    if (frame.duration_s < 30).any() or (frame.attributable_kwh <= 0).any():
        raise ValueError("measurement duration/attributable energy invalid")
    for col in ("duration_s", "attributable_kwh"):
        if not frame[col].map(math.isfinite).all():
            raise ValueError("measurement values must be finite")
    summary = frame.groupby("job")[["duration_s", "attributable_kwh"]].mean()
    counts = frame.groupby("job").size()
    if any(j["name"] not in summary.index or counts.get(j["name"], 0) < 5 for j in jobs):
        raise ValueError("at least five measurements are required for every catalogue job")
    cv = frame.groupby("job")[["duration_s", "attributable_kwh"]].std() / summary
    if (cv >= 0.1).any().any():
        raise ValueError("measurement CV must be below 10% for duration and attributable energy")
    for job in jobs:
        if "repeats" in frame and not (frame.loc[frame.job == job["name"], "repeats"] == job.get("repeats", 1)).all():
            raise ValueError("catalogue repetitions differ from measured workload")
    metadata = measurements.with_name("measurements_meta.json")
    if metadata.exists() and json.loads(metadata.read_text())["status"] != "complete":
        raise ValueError("measurement session is not complete; refusing provisional results")
    scale = config.get("scale")
    target_scale = config["target_heaviest_s"] / max(summary.loc[j["name"], "duration_s"] for j in jobs)
    if scale is None:
        scale = target_scale
        if "start" in config and "end" in config:
            windows = [night_window(t.date()) for t in pd.date_range(config["start"],config["end"],inclusive="left")]
            if not windows:
                raise ValueError("simulation date range is empty")
            # Choose the largest scale up to the two-hour target that can fit
            # even the shortest DST night at the smallest tested capacity.
            available = min(int((d-r)/SLOT) for r,d in windows) * min(config["capacity_k"])
            def demand(value):
                return sum(max(1,math.ceil(summary.loc[j["name"],"duration_s"]*value/1800-1e-12)) for j in jobs)
            if len(jobs)>available:
                raise ValueError("even one slot per job exceeds nightly capacity")
            if demand(scale)>available:
                lo,hi=0.0,scale
                for _ in range(60):
                    mid=(lo+hi)/2
                    if demand(mid)<=available: lo=mid
                    else: hi=mid
                scale=lo
    pue = float(config["pue"])
    if not math.isfinite(scale) or scale <= 0 or not math.isfinite(pue) or pue < 1:
        raise ValueError("SCALE must be positive and PUE must be >=1")
    sizes = []
    for job in jobs:
        stats = summary.loc[job["name"]]
        sizes.append({**job, "duration_slots": max(1, math.ceil(stats.duration_s * scale / 1800 - 1e-12)),
                      "energy_kwh": stats.attributable_kwh * scale * pue})
    return sizes, {"source": "measurements", "scale": scale, "pue": pue,
                   "target_scale": target_scale, "capacity_adjusted": scale < target_scale - 1e-9,
                   "energy_basis": "attributable CPU-package kWh",
                   "measurements": str(measurements), "rounding": "ceil duration to 30 min; energy conserved"}


def make_jobs(sizes: list[dict], release, deadline) -> list[Job]:
    return [Job(j["name"], j["duration_slots"], j["energy_kwh"], j["interruptible"], release, deadline)
            for j in sizes]

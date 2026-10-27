"""Export the pipeline's results as JSON for the frontend (frontend/public/data/).

Only sourced numbers are written. Results that do not exist yet (backtest
savings, SF5 job energy) are exported as null so the site shows them as pending.

Usage:
    python scripts/export_site_data.py            # also refreshes the stored 48 h forecast
    python scripts/export_site_data.py --offline  # keep the stored forecast as it is
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR  # noqa: E402
from carbonsched.carbon import clean, uk_api  # noqa: E402

OUT = PROJECT_ROOT / "frontend" / "public" / "data"
TZ = "Europe/London"


def _write(name: str, obj) -> None:
    p = OUT / name
    p.write_text(json.dumps(obj, separators=(",", ":"), default=str))
    print(f"{name}: {p.stat().st_size / 1e3:.0f} kB")


def _num(v) -> float | None:
    return None if pd.isna(v) else round(float(v), 1)


def history(nat: pd.DataFrame) -> dict:
    """National actual as a day x half-hour matrix (UTC), the 'two years' field."""
    a = nat["actual"]
    days = sorted({t.date() for t in a.index})
    grid = a.groupby([a.index.date, a.index.hour * 2 + a.index.minute // 30]).first().unstack()
    return {"start_utc": str(days[0]), "slot_minutes": 30, "days": [str(d) for d in days],
            "actual": [[_num(v) for v in grid.loc[d].reindex(range(48))] for d in days]}


def regions(regs: dict[int, pd.DataFrame], nat: pd.DataFrame) -> dict:
    """Mean forecast by UK-local half-hour of day, per region, plus mean generation mix."""
    out = []
    for rid, df in regs.items():
        loc = df.index.tz_convert(TZ)
        slot = loc.hour * 2 + loc.minute // 30
        prof = df["forecast"].groupby(slot).mean()
        mix = {c[4:]: round(float(df[c].mean()), 1) for c in df.columns
               if c.startswith("mix_") and not c.endswith("_interp")}
        out.append({"id": rid, "name": uk_api.REGIONS[rid], "mean": _num(df["forecast"].mean()),
                    "profile_local": [_num(v) for v in prof.reindex(range(48))], "mix": mix})
    loc = nat.index.tz_convert(TZ)
    nprof = nat["actual"].groupby(loc.hour * 2 + loc.minute // 30).mean()
    return {"regions": out, "national_profile_local": [_num(v) for v in nprof.reindex(range(48))]}


def forecast(offline: bool) -> dict | None:
    """Store the current 48 h forecast (national + all regions) as the offline fallback."""
    p = OUT / "forecast_fallback.json"
    if offline:
        return None
    now = datetime.now(timezone.utc)
    nat = uk_api._get(f"/intensity/{uk_api._fmt(now)}/fw48h")["data"]
    reg = uk_api._get(f"/regional/intensity/{uk_api._fmt(now)}/fw48h")["data"]
    obj = {"fetched_at_utc": now.strftime("%Y-%m-%dT%H:%MZ"),
           "source": "Carbon Intensity API, NESO (CC BY 4.0)",
           "national": [{"from": d["from"], "forecast": d["intensity"]["forecast"]} for d in nat],
           "regional": [{"from": d["from"], "regions": {r["regionid"]: r["intensity"]["forecast"]
                                                        for r in d["regions"]}} for d in reg]}
    p.write_text(json.dumps(obj, separators=(",", ":")))
    print(f"forecast_fallback.json: {len(obj['national'])} national slots, fetched {obj['fetched_at_utc']}")
    return obj


def energy() -> dict:
    """Energy-meter validation (HANDOFF §6 and §2) and SF1 query timings."""
    times = json.loads((RESULTS_DIR / "tpcds_sf1_linux_times.json").read_text())
    jobs = json.loads((PROJECT_ROOT / "configs" / "jobs.json").read_text())
    q = {int(k): v for k, v in times["query_seconds"].items()}
    return {
        "validation": [
            {"machine": "Windows 11", "test": "CPU burn, 2 procs", "duration_s": 5.6, "rapl_j": 88.0, "model_j": 92.5, "util": 0.34},
            {"machine": "Windows 11", "test": "CPU burn, 6 procs", "duration_s": 2.7, "rapl_j": 64.2, "model_j": 65.4, "util": 0.62},
            {"machine": "Windows 11", "test": "CPU burn, 12 procs", "duration_s": 2.4, "rapl_j": 68.9, "model_j": 69.2, "util": 0.99},
            {"machine": "Ubuntu 24.04", "test": "CPU burn, 12 procs", "duration_s": 5.0, "rapl_j": 167.9, "model_j": 212.2, "util": 0.99,
             "note": "model not yet recalibrated on Linux"},
        ],
        "idle_w": {"Windows 11": 7.4, "Ubuntu 24.04": 9.9},
        "cpu": "Intel Core i5-12450H (8 cores, 12 threads)",
        "tpcds_sf1": {"machine": times["machine"], "date": times["date"], "query_seconds": q,
                      "note": times["note"]},
        "jobs": [{**j, "sf1_seconds": round(sum(q[n] for n in j["queries"]), 1),
                  "energy_kwh": None} for j in jobs["jobs"]],
        "window": jobs["window"],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    nat = clean.load_national()
    regs = {r: clean.load_regional(r) for r in sorted(uk_api.REGIONS)
            if (clean.CARBON_DIR / f"gb_region{r:02d}_2024-01-01_2026-01-01.csv").exists()}
    _write("history.json", history(nat))
    _write("regions.json", regions(regs, nat))
    _write("eda.json", json.loads((RESULTS_DIR / "eda_carbon_summary.json").read_text()))
    _write("energy.json", energy())
    _write("results.json", {"backtest": None, "note": "Backtest not run yet (HANDOFF §8 step 8)."})
    try:
        forecast(args.offline)
    except requests.RequestException as e:
        print(f"forecast not refreshed ({type(e).__name__}); keeping the stored one")


if __name__ == "__main__":
    main()

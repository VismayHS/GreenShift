"""Real RAPL campaign: 60 s idle bookends, warmups, randomized repeats and 20 s cooldowns."""
from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR
from carbonsched.energy import EnergyMeter
from carbonsched.energy.campaign import summarize, subtract_idle, fit_model
from carbonsched.energy.preflight import machine_info, require_rapl, awake_session, SessionGuard
from carbonsched.env import spark_session
from carbonsched.workloads.spark_jobs import register_tpcds, run_job


def main(guard):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sf", type=int, help="defaults to the calibrated catalogue scale factor")
    parser.add_argument("--cores", default="4")
    parser.add_argument("--driver-memory", default="8g")
    parser.add_argument("--seed", type=int, default=20261031)
    parser.add_argument("--max-runs", type=int, default=15)
    parser.add_argument("--room-conditions", default="unknown; not supplied")
    parser.add_argument("--conditions-confirmed", action="store_true",
                        help="Operator authorizes the session with known and unknown conditions recorded")
    args = parser.parse_args()
    if not args.conditions_confirmed:
        parser.error("Confirm physical measurement conditions with --conditions-confirmed")
    if args.max_runs < 5:
        parser.error("--max-runs must be at least 5")
    config = json.loads((PROJECT_ROOT / "configs/jobs.json").read_text())
    args.sf = args.sf if args.sf is not None else config.get("scale_factor", 5)
    if args.sf != config.get("scale_factor", args.sf):
        parser.error("--sf differs from the catalogue; prepare the campaign at this scale first")
    info = machine_info(args.room_conditions)
    require_rapl(info)
    info.update(scale_factor=args.sf, seed=args.seed, cores=args.cores,
                driver_memory=args.driver_memory, operator_session_authorized=True,
                git_commit=subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=PROJECT_ROOT, text=True).strip(),
                status="in_progress", extra_runs=[], energy_basis="attributable CPU-package kWh")
    RESULTS_DIR.mkdir(exist_ok=True)
    meta_path = RESULTS_DIR / "measurements_meta.json"
    raw_path = RESULTS_DIR / "measurements.csv"
    if raw_path.exists():
        parser.error("measurements.csv already exists; archive it before a new session")
    jobs = config["jobs"]
    records = []
    rng = random.Random(args.seed)

    def save_meta():
        meta_path.write_text(json.dumps(info, indent=2), encoding="utf-8")

    def idle(label):
        guard.check()
        print(f"{label}: 60 seconds", flush=True)
        with EnergyMeter(label, interval_s=1) as meter:
            time.sleep(60)
        result = meter.result
        guard.check()
        if result.rapl_pkg_j is None:
            raise RuntimeError("RAPL lost during idle; refusing model substitution")
        return result.rapl_pkg_j / result.duration_s

    save_meta()
    spark = spark_session("measurement-campaign", cores=args.cores, driver_memory=args.driver_memory)
    try:
        register_tpcds(spark, f"sf{args.sf}")
        info["idle_start_w"] = idle("idle_start")
        for job in jobs:
            guard.check()
            print(f"Warmup {job['name']}", flush=True)
            run_job(spark, job["name"], job["queries"], repeats=job.get("repeats", 1))
            guard.check()
        queue = jobs * 5
        rng.shuffle(queue)
        while queue:
            for job in queue:
                time.sleep(20)
                guard.check()
                record = run_job(spark, job["name"], job["queries"],
                                 idle_w=info["idle_start_w"], repeats=job.get("repeats", 1))
                guard.check()
                if record["energy_source"] != "rapl":
                    raise RuntimeError("RAPL lost; refusing model substitution")
                record.update(timestamp_utc=datetime.now(timezone.utc).isoformat(),
                              power_mode=info.get("power_mode_guid", info["power_scheme"]),
                              scale_factor=args.sf, repeats=job.get("repeats", 1),
                              run=1 + sum(r["job"] == job["name"] for r in records))
                records.append(record)
                pd.DataFrame(records).to_csv(raw_path, index=False)
                print(f"{record['job']} run {record['run']}: {record['duration_s']:.1f}s, {record['rapl_pkg_j']:.1f} J", flush=True)
                if record["duration_s"] < 30:
                    raise RuntimeError("Job shorter than 30 s; increase catalogue repeats and restart campaign")
            info["idle_end_w"] = idle("idle_end")
            avg_idle = (info["idle_start_w"] + info["idle_end_w"]) / 2
            frame = subtract_idle(pd.DataFrame(records), avg_idle)
            summary = summarize(frame)
            frame.to_csv(raw_path, index=False)
            summary.to_csv(RESULTS_DIR / "measurements_summary.csv", index=False)
            info["calibration"] = fit_model(frame)
            calibration = info["calibration"]
            frame["calibrated_model_j"] = (calibration["p_idle_w"] +
                (calibration["p_max_w"] - calibration["p_idle_w"]) * frame.mean_cpu_util) * frame.duration_s
            frame.to_csv(raw_path, index=False)
            (RESULTS_DIR / "power_model.json").write_text(json.dumps(
                {**calibration, "memory_gb": 0, "pue": 1,
                 "note": "Fitted on this campaign; in-sample R2, not held-out validation."},
                indent=2), encoding="utf-8")
            info["idle_used_w"] = avg_idle
            failing = summary.loc[~summary.quality_pass]
            queue = [j for j in jobs if j["name"] in set(failing.loc[failing.n < args.max_runs, "job"])]
            if queue:
                info["extra_runs"].append({"jobs": [j["name"] for j in queue],
                                           "reason": "duration or attributable-energy CV >=10%, or nonpositive energy"})
                rng.shuffle(queue)
            save_meta()
        info["status"] = "complete" if summary.quality_pass.all() else "quality_failed"
        info["completed_at_utc"] = datetime.now(timezone.utc).isoformat()
        save_meta()
        print(summary[["job", "n", "duration_s_mean", "attributable_kwh_mean", "duration_s_cv", "attributable_j_cv", "quality_pass"]].to_string(index=False))
        if info["status"] != "complete":
            raise RuntimeError("Quality threshold not met; see metadata. Do not treat these as final measurements.")
    except Exception as error:
        info.update(status="failed", failure=str(error))
        save_meta()
        raise
    finally:
        spark.stop()


if __name__ == "__main__":
    with awake_session(), SessionGuard() as guard:
        main(guard)

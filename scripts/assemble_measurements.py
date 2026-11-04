"""Combine complete passing workload cohorts from documented measurement sessions."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR
from carbonsched.energy.campaign import combine_qualified_cohorts, summarize, fit_model


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sessions", type=Path, nargs="+", required=True)
    parser.add_argument("--output", type=Path, default=RESULTS_DIR)
    args = parser.parse_args()
    if (args.output / "measurements.csv").exists():
        parser.error("archive existing output before assembling measurements")
    jobs = json.loads((PROJECT_ROOT / "configs/jobs.json").read_text())["jobs"]
    sessions, provenance = [], []
    for path in args.sessions:
        raw = path / "measurements.csv"
        meta = json.loads((path / "measurements_meta.json").read_text())
        sessions.append((path.name, pd.read_csv(raw), meta))
        provenance.append({"id": path.name, "path": path.as_posix(), "metadata": meta,
                           "csv_sha256": hashlib.sha256(raw.read_bytes()).hexdigest()})
    frame, selected, excluded = combine_qualified_cohorts(sessions, jobs)
    summary = summarize(frame)
    calibration = fit_model(frame)
    frame["calibrated_model_j"] = (calibration["p_idle_w"] +
        (calibration["p_max_w"] - calibration["p_idle_w"]) * frame.mean_cpu_util) * frame.duration_s
    metadata = dict(sessions[-1][2])
    metadata.update(status="complete", sessions=provenance, selected_cohorts=selected,
                    excluded_cohorts=excluded, calibration=calibration,
                    selected_jobs=[j["name"] for j in jobs],
                    completed_at_utc=datetime.now(timezone.utc).isoformat(),
                    git_commit=subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=PROJECT_ROOT, text=True).strip(),
                    protocol="Whole job cohorts passing the same quality gate; failed cohorts retained in full; conditioned retry is a separate randomized session.",
                    idle_accounting="Each row retains its own session's mean idle bookends; root idle_used_w is the latest session baseline for the immediate demo.")
    metadata.pop("failure", None)
    args.output.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.output / "measurements.csv", index=False)
    summary.to_csv(args.output / "measurements_summary.csv", index=False)
    (args.output / "measurements_meta.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (args.output / "power_model.json").write_text(json.dumps(
        {**calibration, "memory_gb": 0, "pue": 1, "note": "In-sample fit across accepted cohorts; not held-out validation."}, indent=2), encoding="utf-8")
    print(summary[["job", "n", "duration_s_cv", "attributable_j_cv", "quality_pass"]].to_string(index=False))


if __name__ == "__main__":
    main()

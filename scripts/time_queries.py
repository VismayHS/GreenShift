"""Time all 99 SF5 queries once and set repetitions for >=30 s job batches."""
import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR
from carbonsched.env import spark_session
from carbonsched.workloads.spark_jobs import register_tpcds, load_query


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sf", type=int, default=5)
    parser.add_argument("--cores", default="8")
    parser.add_argument("--driver-memory", default="8g")
    parser.add_argument("--finalize", action="store_true")
    args = parser.parse_args()
    path = RESULTS_DIR / f"tpcds_sf{args.sf}_windows_times.json"
    result = {"sf": args.sf, "date": datetime.now(timezone.utc).isoformat(),
              "machine": "Windows; see machine_check.json", "query_seconds": {},
              "cores": args.cores, "driver_memory": args.driver_memory,
              "note": "One pass; includes JIT/cache effects. Campaign warmups are separate."}
    spark = spark_session("time-queries", cores=args.cores, driver_memory=args.driver_memory)
    try:
        register_tpcds(spark, f"sf{args.sf}")
        for nr in range(1, 100):
            start = time.perf_counter()
            spark.sql(load_query(nr)).write.format("noop").mode("overwrite").save()
            elapsed = time.perf_counter() - start
            result["query_seconds"][str(nr)] = elapsed
            path.write_text(json.dumps(result, indent=2), encoding="utf-8")
            print(f"q{nr:02d}: {elapsed:.2f}s", flush=True)
    finally:
        spark.stop()
    if args.finalize:
        import math
        jobs_path = PROJECT_ROOT / "configs/jobs.json"
        config = json.loads(jobs_path.read_text())
        for job in config["jobs"]:
            seconds = sum(result["query_seconds"][str(q)] for q in job["queries"])
            # A 60-second target leaves margin for warmed execution becoming faster.
            job["repeats"] = max(1, math.ceil(60 / seconds))
            job["timing_pass_seconds"] = seconds
        config.update(status="timed; campaign must verify >=30 s per run", scale_factor=args.sf)
        jobs_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

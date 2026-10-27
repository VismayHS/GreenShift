"""Run TPC-DS-based 'nightly jobs' on Spark and measure their energy.

A job is a named list of TPC-DS queries (see configs/jobs.json). Each query
result is written to Spark's built-in `noop` sink, which forces full execution
without disk writes (and avoids Hadoop's winutils dependency on Windows).

Per run we record:
- energy from EnergyMeter (RAPL / battery / model)
- Spark task metrics from the REST API (executor CPU time, run time, shuffle,
  input bytes), which are what a cluster deployment would use to attribute
  energy to jobs when hardware counters are not available.
"""

from __future__ import annotations

import json
import os
import re
import urllib.request
from pathlib import Path

from .. import DATA_DIR
from ..energy import EnergyMeter

TPCDS_TABLES = [
    "call_center", "catalog_page", "catalog_returns", "catalog_sales", "customer",
    "customer_address", "customer_demographics", "date_dim", "household_demographics",
    "income_band", "inventory", "item", "promotion", "reason", "ship_mode", "store",
    "store_returns", "store_sales", "time_dim", "warehouse", "web_page", "web_returns",
    "web_sales", "web_site",
]


def register_tpcds(spark, sf: str = "sf1", root: str | None = None) -> None:
    """Expose the TPC-DS parquet files as temp views.

    root defaults to data/tpcds locally; set CARBONSCHED_TPCDS_ROOT (or pass
    root) to e.g. hdfs:///tpcds on a Hadoop cluster.
    """
    root = root or os.environ.get("CARBONSCHED_TPCDS_ROOT") or (DATA_DIR / "tpcds").as_posix()
    for t in TPCDS_TABLES:
        spark.read.parquet(f"{root.rstrip('/')}/{sf}/{t}.parquet").createOrReplaceTempView(t)


def load_query(nr: int) -> str:
    sql = (DATA_DIR / "tpcds" / "queries" / f"q{nr:02d}.sql").read_text(encoding="utf-8")
    # ANSI "quoted identifiers" (q16/32/50/62/92/94/95/99) are string literals in Spark SQL.
    sql = re.sub(r'"([^"]+)"', r"`\1`", sql)
    return sql.strip().rstrip(";")


def _stage_metrics(spark) -> dict:
    """Sum stage metrics for every stage seen so far in this application."""
    ui = spark.sparkContext.uiWebUrl
    app = spark.sparkContext.applicationId
    with urllib.request.urlopen(f"{ui}/api/v1/applications/{app}/stages?status=complete") as r:
        stages = json.load(r)
    keys = ("executorRunTime", "executorCpuTime", "inputBytes", "shuffleReadBytes",
            "shuffleWriteBytes", "numCompleteTasks", "memoryBytesSpilled", "diskBytesSpilled")
    tot = {k: sum(s.get(k, 0) for s in stages) for k in keys}
    tot["numStages"] = len(stages)
    return tot


def _delta(after: dict, before: dict) -> dict:
    return {k: after[k] - before.get(k, 0) for k in after}


def run_job(spark, name: str, queries: list[int], idle_w: float | None = None,
            interval_s: float = 0.5) -> dict:
    """Execute one job (sequence of queries) under an EnergyMeter."""
    spark.sparkContext.setJobGroup(name, f"carbonsched job {name}")
    before = _stage_metrics(spark)
    with EnergyMeter(name, interval_s=interval_s, idle_w=idle_w) as m:
        for q in queries:
            spark.sql(load_query(q)).write.format("noop").mode("overwrite").save()
    spark_m = _delta(_stage_metrics(spark), before)
    rec = m.result.summary()
    rec.update({"job": name, "queries": queries,
                "executor_cpu_s": spark_m["executorCpuTime"] / 1e9,
                "executor_run_s": spark_m["executorRunTime"] / 1e3,
                **{f"spark_{k}": v for k, v in spark_m.items()
                   if k not in ("executorCpuTime", "executorRunTime")}})
    return rec


def load_jobs(path: Path) -> list[dict]:
    return json.loads(Path(path).read_text(encoding="utf-8"))["jobs"]

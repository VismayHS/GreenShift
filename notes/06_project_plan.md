# 06: Project plan & architecture

## Architecture

```
  GB Carbon Intensity API / NESO CSV          TPC-DS data (DuckDB dsdgen) → Parquet, 99 queries
              │ carbon/uk_api.py                          │ workloads/spark_jobs.py
              ▼                                           ▼
  CI time series (30 min, forecast + actual)   Spark job runs under EnergyMeter
                                               (RAPL + battery + model + Spark metrics)
              │                                           │ job profiles: duration, kWh, cpu-s
              ▼                                           ▼
         ┌────────────────────────────────────────────────────────┐
         │ scheduler/: policies P0-P4 (+ MILP bound)               │
         │   backtest simulator over 365+ nights                   │
         │   online mode: live fw48h forecast → launch Spark jobs  │
         └───────────────────────────┬────────────────────────────┘
                                     ▼
          report/: gCO2 saved, % saved, added delay, deadline misses,
                    by region / season / window, figures + limitations
```

## Repo layout

```
MiniProject/
  notes/            research + context (this folder)
  datacards/        one data card per dataset (required by the brief)
  src/carbonsched/
    env.py          JDK/Spark setup for Windows
    carbon/         API client, cleaning/resampling
    energy/         sensors (RAPL, battery), model, EnergyMeter
    workloads/      TPC-DS registration, job runner
    scheduler/      policies, simulator, online runner        (next)
    report/         metrics + plots                            (next)
  scripts/          CLI entry points
  configs/          jobs.json (job catalogue), scheduler settings
  data/             raw / processed / tpcds  (git-ignored, regenerable)
  results/          measurement runs, backtest outputs
  report/           final write-up + figures
  .tools/           portable JDK 21 (git-ignored)
```

## Work plan

| # | Step | Output | Status |
|---|---|---|---|
| 1 | Research data, measurement, literature | notes 01-05 | ✅ |
| 2 | Environment (Spark 4.2, JDK 21, venv) | `.venv`, `.tools`, `env.py` | ✅ |
| 3 | Carbon fetcher + 2024-25 download | `data/raw/carbon/*.csv` | ✅ code / ⏳ download resuming |
| 4 | Energy meter (RAPL/battery/model) | `energy/` | ✅ tested |
| 5 | TPC-DS gen + Spark compatibility | SF1 + 99/99 queries run | ✅ |
| 6 | Carbon data cleaning & EDA (daily profile, seasonal, regional, forecast error) | `carbon/clean.py`, figures | ⏳ |
| 7 | Job catalogue + measurement campaign at SF5/10 (n = 5, idle baseline) | `results/measurements.csv` | ⏳ |
| 8 | Scheduler policies + backtest simulator | `scheduler/` | ⏳ |
| 9 | Online scheduler (live fw48h → launch) + Airflow DAG example | `scripts/run_scheduler.py`, `airflow/` | ⏳ |
| 10 | Savings report (figures, tables, limitations, SCI) | `report/` | ⏳ |
| 11 | Tests (policy invariants: deadlines never missed, energy conserved) | `tests/` | ⏳ |

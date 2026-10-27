# GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)

**Last updated:** 2026-10-27 · **Repo:** [GreenShift](https://github.com/VismayHS/GreenShift)
**Course:** UE24AM343AB3 Big Data Systems & Responsible AI Engineering (Semester 5), Mini-project
**Track:** G: Governance, Compliance and Sustainability

This file holds everything researched, decided, built and measured so far, plus how to move the project to a new machine (Linux + Hadoop) and what to do next. Read it top to bottom once; afterwards, use the section links.

1. [The assignment](#1-the-assignment)
2. [Status at a glance](#2-status-at-a-glance)
3. [Research findings](#3-research-findings)
4. [Decisions log](#4-decisions-log)
5. [What's built (file map)](#5-whats-built-file-map)
6. [Measurements & results so far](#6-measurements--results-so-far)
7. [Moving to the new system (Linux + Hadoop)](#7-moving-to-the-new-system-linux--hadoop)
8. [Remaining work: detailed plan](#8-remaining-work-detailed-plan)
9. [Open questions for the group](#9-open-questions-for-the-group)
10. [Known issues & gotchas](#10-known-issues--gotchas)
11. [Syllabus mapping](#11-syllabus-mapping)
12. [Sources](#12-sources)

---

## 1. The assignment

**Problem statement (verbatim):**

> **Carbon-Aware Batch Scheduling.** Case study: a data team wants to cut emissions from nightly jobs without missing deadlines.
> **What to do:** measure the energy use of representative Spark jobs. Use public grid carbon-intensity data to shift flexible jobs to cleaner time windows. Report emissions saved and any added delay.
> **Submit:** scheduler code, measurement method and a savings report.

**Datasets suggested by the brief:** Electricity Maps data portal; UK Carbon Intensity API; TPC-DS workloads. Note: "Check each source's terms. Some require an API key."

**General dataset rules (from the course notes):**
- Check licence and access terms for each dataset; hosting, licences and links change.
- Some sources need a free account or a data-use agreement.
- Never attempt to re-identify real people; treat personal-looking data as sensitive.
- Develop on a small sample, then scale up.
- **Record every dataset in a datasheet or data card inside the submission.**
- A group may substitute a comparable public dataset if the report explains why.

**Deliverables → where they live:**

| Deliverable | Location | Status |
|---|---|---|
| Scheduler code | `src/carbonsched/scheduler/` + `scripts/` | ⏳ not started (design ready, §8) |
| Measurement method | `src/carbonsched/energy/` + `notes/02_energy_measurement.md` | ✅ built & tested on Windows |
| Savings report | `report/` | ⏳ |
| Data cards | `datacards/` (4 cards) | ✅ drafted |

---

## 2. Status at a glance

| # | Step | Status |
|---|---|---|
| 1 | Research (data sources, energy measurement, literature, TPC-DS, Spark compat) | ✅ |
| 2 | Environment (Spark 4.2 + JDK 21 + venv) | ✅ Windows. ✅ Linux (2026-10-27, see below) |
| 3 | Carbon-data fetcher (GB API + NESO) | ✅ National + regions 1-7 committed (2024-25; regions re-fetched 2026-10-27 after the New Year fix). NESO CSV downloaded 2026-10-27 (git-ignored, SHA-256 `424ca3ff2160…`). Regions 8-14 optional: `--regions 13 14 --skip-neso` |
| 4 | Energy meter (RAPL / battery / model + Spark metrics) | ✅ tested on Windows. ✅ Linux RAPL reader tested (needs `sudo chmod` after each boot) |
| 5 | TPC-DS data generation + Spark compatibility | ✅ SF1; **99/99 queries run** on Windows and on Linux |
| 6 | Carbon data cleaning + EDA | ✅ `carbon/clean.py`, `scripts/eda_carbon.py` (2026-10-27; findings below) |
| 7 | Job catalogue + measurement campaign | ⏳ `configs/jobs.json` drafted (proposed jobs, window 22:00-07:00) |
| 8 | Scheduler policies + backtest simulator | ⏳ |
| 9 | Online scheduler + Airflow DAG | ⏳ |
| 10 | Savings report | ⏳ Site in progress: `frontend/` (story + Tonight view) |
| 11 | Tests | ⏳ |

### Linux machine (set up 2026-10-27)

| | |
|---|---|
| OS / hardware | Ubuntu 24.04.5 LTS, kernel 7.0.0-38, bare metal (`systemd-detect-virt`: none). Intel i5-12450H (8 cores / 12 threads), the same CPU as the Windows laptop. 15 GiB RAM + 4 GiB swap, 28 GB free disk |
| Java | OpenJDK **21.0.12.1** (apt `openjdk-21-jdk`) for Spark; `env.py` finds it under `/usr/lib/jvm/java-21-openjdk*`. OpenJDK 11 is **kept** because Hadoop uses it (`hadoop-env.sh` and `~/.bashrc` `JAVA_HOME`) |
| Spark | **pyspark 4.2.0** in `.venv` (Python 3.12.3). There is no separate Spark install. An old user-level pip `pyspark 3.5.1` (in `~/.local`) was uninstalled so the project runs one Spark version |
| Hadoop | 3.3.6 at `~/hadoop`, **single-node pseudo-distributed** (HDFS `localhost:9000`, replication 1, YARN). Daemons are not started by default (`start-dfs.sh`, `start-yarn.sh`) |
| venv | duckdb 2.0.0, pandas 2.3.3, pyarrow 26.0.0, numpy 2.5.4, matplotlib 3.11.2, psutil 7.2.2, requests 2.34.2 |
| RAPL | `/sys/class/powercap/intel-rapl:0` (package-0), `:0:0` (core), `:0:1` (uncore); no DRAM zone. The duplicate `intel-rapl-mmio:0` is not read, so there is no double counting. Files are root-only (`-r--------`): run `sudo chmod a+r /sys/class/powercap/intel-rapl:*/energy_uj` after every boot. Counter wraps at 262,143 J (handled) |
| RAPL smoke test | Idle ≈ 9.9 W PKG (browser + VS Code open; Windows idle was 7.4 W). 12-process CPU burn, 5 s: RAPL 167.9 J (33.4 W), uncalibrated model 212.2 J. The model's default `p_max_w = 45` overestimates here, so **recalibrate on Linux** before using the model. Power profile was `balanced`; use `powerprofilesctl set performance` for measurements |
| TPC-DS SF1 | dsdgen 2.4 s, same row counts as on Windows. **99/99** queries on Spark 4.2 local[*], 238 s in total. Heaviest: q72 10.4 · q14 8.6 · q04 8.3 · q23 6.6 · q78 6.3 · q88 6.1 s. Peak JVM RSS 7.0 GiB with `driver_memory=6g` |
| Memory for SF choice | 15 GiB total; ~6 GiB used by desktop apps, leaving ~9 GiB available. → **SF5** per the §9 rule (SF10 needs ≥ 32 GB) |
| Fixes made | `env.py` finds the Linux JDK 21. `register_tpcds()` uses an explicit `file://` root, because `HADOOP_CONF_DIR` (fs.defaultFS = hdfs://localhost:9000) otherwise sends local paths to HDFS |

### Carbon EDA findings (2024-25, step 6)

From `results/eda_carbon_summary.json`; figures in `report/figures/eda_*.png`.

| | |
|---|---|
| Gaps | National: 74 forecast slots and 31 actual slots missing, in three source outages (11-12 Jun 2024, 12-13 Jan 2025, 10-11 Aug 2025); none ≤ 2 h, so none interpolated. Regions 1-7: 48 slots each (the same outages plus 2025-12-31 23:30). Re-querying the API returns nothing for these windows |
| Fetch bug fixed | A regional request that crosses New Year stops at 31 Dec 23:00. The old 14-day chunk 2024-12-30 → 2025-01-13 lost 1-13 Jan 2025 (592 slots per region). `uk_api._chunks` now also breaks at 1 January; regions 1-7 were re-fetched (35,041 rows each) |
| National level | Mean actual 127.1 gCO2/kWh. 22:00-07:00 UK local 116.7 vs 07:00-22:00 133.4. Weekday 133.9, weekend 110.2 |
| Daily minimum | Falls between 22:00 and 07:00 UK local on 58.9% of days; otherwise mostly 11:00-15:00 (solar). In summer the midday low (~78 at 13:00) is well below the night (~102-110) |
| Forecast error | National forecast vs actual (n = 35,014): MAE 9.72, bias −0.07, RMSE 13.65 gCO2/kWh. MAE is 7.6% of the mean, vs the 5% Wiesner et al. assumed for 2020 |
| NESO cross-check | API actual vs NESO historic `CARBON_INTENSITY`: r = 0.993, MAE 4.66, NESO − API bias −1.74, 10% identical. Best alignment needs NESO `DATETIME` shifted back 30 min (UTC, labels period end; inferred from the data, not documented) |
| Regions (mean forecast) | South Scotland 22.1 · North East England 24.9 · North Scotland 37.6 · North West England 50.4 · North Wales 82.3 · Yorkshire 143.4 · South Wales 251.7 |
---

## 3. Research findings

✅ = verified in this session (fetched/tested). ⚠ = from memory or secondary sources; **verify before citing**.

### 3.1 GB Carbon Intensity API (primary carbon source) ✅

| | |
|---|---|
| Owner | NESO (formerly National Grid ESO), with EDF Europe, University of Oxford, WWF |
| Base URL / docs | `https://api.carbonintensity.org.uk` · https://carbon-intensity.github.io/api-definitions/ |
| Auth | **None** (every operation "does not require authentication") |
| Licence | **CC BY 4.0** + API terms of use |
| Grain | **Half-hourly**, gCO2/kWh, all times **UTC** |
| Spatial | National GB; regions 1-14 (DNO areas); 15 England, 16 Scotland, 17 Wales |
| Range limit | `/intensity/{from}/{to}` **max 14 days** per call (stats endpoint: 30 days) |
| Forecasts | `fw24h`, `fw48h` endpoints (national forecast reaches 96+ h; regional 48 h per NESO's methodology) |
| National fields | `forecast`, `actual`, `index` (very low / low / moderate / high / very high) |
| Regional fields | `forecast`, `index`, `generationmix` (% biomass, coal, imports, gas, nuclear, other, hydro, solar, wind). **No `actual`** |
| Emission factors | `/intensity/factors`: Coal 937, Oil 935, OCGT 651, CCGT 394, Dutch imports 474, Irish imports 458, French imports 53, Biomass 120, Other 300, Nuclear/Wind/Solar/Hydro/Pumped 0 (gCO2/kWh) |
| Type of signal | **Average, production-based** intensity (not marginal) |

Region IDs: 1 North Scotland, 2 South Scotland, 3 North West England, 4 North East England, 5 Yorkshire, 6 North Wales, 7 South Wales, 8 West Midlands, 9 East Midlands, 10 East England, 11 South West England, 12 South England, 13 London, 14 South East England, 15 England, 16 Scotland, 17 Wales.

Gotchas we hit:
- Some national rows have **no `forecast` key** (26 of 673 for 1-14 Jan 2025). The client uses `.get()`.
- Regional pulls are a little short (656 of ~673 rows per 14 days). They must be re-gridded to 30 min and the gaps filled.
- A regional request that crosses New Year silently stops at 31 Dec 23:00. The client now breaks chunks at 1 January (found 2026-10-27).
- The first record returned starts 30 min before `from`, so chunk boundaries overlap. The client de-duplicates on `from`.
- The index **numeric thresholds** are not in the API docs. They are in NESO's methodology PDF (`neso-ci-national-methodology_v2`). **TODO** if we use the index policy.

### 3.2 NESO Historic generation mix & carbon intensity ✅

- Page: https://www.neso.energy/data-portal/historic-generation-mix
- CSV: `https://api.neso.energy/dataset/88313ae5-94e4-4ddc-a790-593554d8c6b9/resource/f93d1835-75bc-43e5-84ad-12472b180a98/download/df_fuel_ckan.csv`
- CC BY 4.0 (per the dataset page; NESO licenses each dataset individually). Covers 2009 to now, half-hourly. Columns: `DATETIME`, per-fuel MW and %, `CARBON_INTENSITY`, LOW/ZERO_CARBON, RENEWABLE, FOSSIL.
- Values are revised during cleansing, so record the download date and SHA-256 (the downloader prints the hash).
- Use: cross-check the API's `actual` series, and get a long-term trend.

### 3.3 Electricity Maps ✅ (status) / ⚠ (details)

- Historical CSVs were free under the **ODbL** (attribution + share-alike) at hourly/daily/monthly/yearly grain, with direct and life-cycle intensity, carbon-free % and renewable %.
- **Now:** a 2026 help article says the datasets product is **sunset for general users**, while academic users can still download for approved research. `app.electricitymaps.com/datasets` returns 403 without login.
- Free API: **non-commercial**, needs a **free key**, latest + past 24 h only. That is enough for a live demo, not for a backtest.
- Zones: `GB`; India `IN-SO`/`IN-WE`/`IN-NO`/`IN-EA`/`IN-NE` (⚠ verify the codes).
- Their signal is **consumption-based, flow-traced, life-cycle**, and differs from the GB API's direct production-based figure. State this if we compare them.
- **Substitution justification:** NESO data comes from the same system operator, is CC BY 4.0, needs no key and has a finer 30-min grain. This is allowed by the brief if the report explains why.

### 3.4 Average vs marginal carbon intensity

- Average = total emissions / total generation. That is what we use (GHG Protocol Scope 2 *location-based*).
- Marginal (MOER, e.g. WattTime) = emissions of the plant that responds to extra load. It is better in theory for shifting, but it is model-based and mostly proprietary.
- Wiesner et al. 2021 §3.4 also use average intensity, arguing that marginal data is not reliable. → **Limitation to state in the report.**

### 3.5 Energy measurement ✅

**Machine used so far:** Intel i5-12450H (4P+4E, 12 threads; Intel spec 45 W base, 95 W turbo), 16 GB RAM, Windows 11 bare metal.

Three signals, all verified working:
1. **Intel RAPL** (primary, measured).
   - *Windows:* the Energy Meter Interface, as perf counters `\Energy Meter(RAPL_Package0_{PKG|PP0|PP1|DRAM})\Energy|Power`. Energy is cumulative in **picowatt-hours** (×3.6e-9 → J) and Power is in mW. Verified: the Power counter and the Energy delta agree (10.32 W both ways). DRAM reads **0** on this laptop. The counter updates about once a second.
   - *Linux:* `/sys/class/powercap/intel-rapl:*/energy_uj` (µJ, wraps at `max_energy_range_uj`). Needs root or `chmod a+r` (CVE-2020-8694 fix). Works for AMD on kernel ≥ 5.8. **The code is written but untested.**
2. **Battery discharge rate** (measured, whole system, Windows only): WMI `root\wmi:BatteryStatus.DischargeRate` (mW), valid only when unplugged. The firmware smooths it, so it lags by seconds and is a cross-check for long jobs only.
3. **Linear utilisation model** (estimate, portable): `P = P_idle + (P_max − P_idle)·u + 0.375 W/GB·RAM`, times the PUE. This is the CodeCarbon fallback / Cloud Carbon Footprint method. 0.375 W/GB = CodeCarbon v2's "3 W per 8 GB". CodeCarbon v3 uses 5 W per DIMM (minimum 10 W on x86). `calibrate()` fits P_idle/P_max to RAPL.
4. Plus **Spark task metrics** via REST `/api/v1/applications/{id}/stages`: executorCpuTime, executorRunTime, inputBytes, shuffle bytes, spills. These give energy-per-CPU-second attribution for clusters.

CodeCarbon (3.3.2) methodology ✅: CO2 = CI × E. It reads RAPL on Linux and the Windows EMI on Windows 11 bare metal. The fallback is a TDP lookup (2000+ CPUs) × load, assuming 50% TDP. Its default CI comes from Our World in Data (world average 475 g/kWh). Its docs don't cover PUE or a custom CI time series, which is why we built our own meter.

**Measurement protocol (for the report):**
1. AC power, "Best performance" mode, other apps closed, fixed conditions.
2. One warm-up run per job, not timed.
3. 60 s idle baseline at the start and end of the session, giving P_idle.
4. n = 5 runs per job in randomised order, with 20 s cool-downs.
5. Record wall time, RAPL PKG/PP0 J, mean utilisation, Spark CPU-s, bytes read/shuffled.
6. Report mean ± std and 95% CI, both **gross** (RAPL PKG) and **attributable** (gross − P_idle·duration).
7. `kWh = J/3.6e6`; `gCO2 = kWh × PUE × CI(t)`. PUE 1.0 for the laptop. For data-centre extrapolation, the Uptime Institute 2024 average is ≈1.56 (⚠ verify).

**Not captured (limitations):** DRAM (no counter here; the model term covers it), SSD/NIC/fans/PSU losses/screen, the RAPL model error, and embodied carbon (unaffected by shifting, but belongs in SCI).

**Key insight:** shifting doesn't change E; it changes CI(t). The **% saving does not depend on E**: it depends only on job duration and window. E converts % into grams and tells you which jobs are worth delaying.

### 3.6 Literature

**Core ✅: Wiesner, Behnke, Scheinert, Gontarska, Thamsen. "Let's Wait Awhile: How Temporal Workload Shifting Can Reduce Carbon Emissions in the Cloud." Middleware '21, pp. 260-272. arXiv:2110.13234. Code/data: https://github.com/dos-group/lets-wait-awhile**
- Regions DE, GB, FR, CA, year 2020, average CI.
- Workload taxonomy: duration, execution time (scheduled vs ad hoc), interruptibility. Batch jobs are ~60% of processing on large clusters; >40% of them run daily.
- **Scenario I (nightly jobs, our case):** 366 jobs of 30 min, non-interruptible, baseline 01:00, window ±0.5 … ±8 h. Forecast error: the NESO 48 h forecast MAE ≈ 10 g/kWh ≈ 5% of the mean, so they add N(0, 0.05·mean) noise and average 10 runs. They also report perfect forecasts.
  - **GB: ±2 h → 4.3%, ±8 h → 7.4% saved.** FR: 3.0% / 4.1%. DE: 11.2% (±8 h). CA: 33.7% (±8 h, solar).
  - GB/FR nights are already near the daily minimum, so the big gains need windows that reach into solar/wind hours.
- **Scenario II (ad hoc ML jobs):** "Next Workday" and "Semi-Weekly" deadlines. Interrupting saved 5.7-8.5% / 13.3-18.9%; non-interrupting 2.5-6.3% / 6.1-14.4%. Interruptibility adds +24-37% (EU) and +131% (CA).
- Strategies: **non-interrupting** = the contiguous window with the lowest mean CI; **interrupting** = the N lowest-CI slots.

Related work (⚠ verify every citation detail):
- Radovanovic et al., "Carbon-Aware Computing for Datacenters", IEEE Trans. Power Systems 2022 (Google).
- Sukprasert et al., "On the Limitations of Carbon-Aware Temporal and Spatial Workload Shifting in the Cloud", EuroSys 2024 (critical counterpoint; good for the discussion).
- Hanafy et al., "CarbonScaler", SIGMETRICS 2024; Hanafy et al., GAIA, ASPLOS 2024.
- Souza et al., "Ecovisor", ASPLOS 2023.
- GSF Carbon Aware SDK.
- **SCI** ✅ `SCI = ((E × I) + M) per R` (GSF). Standardised as ISO/IEC 21031:2024 (⚠ verify). We can report SCI per nightly batch.

### 3.7 TPC-DS ✅

- Spec **v4.0.0** at tpc.org; official tools under the TPC EULA + Fair Use Policy.
- **DuckDB 2.0 `tpcds` extension**: `CALL dsdgen(sf=N)`, `tpcds_queries()`. Its 2.0 generator matches the TPC-DS v4 tools. No compiler is needed.
- Must not be called "TPC-DS results". Required wording: *"Workload derived from TPC-DS; not comparable with published TPC-DS results."* (⚠ read the Fair Use Quick Reference v1.0.0.)
- The data is synthetic, so there is no personal-data or re-identification risk.

### 3.8 Spark compatibility ✅

- **Spark 4.2.0** (latest; PyPI `pyspark==4.2.0`): **Java 17, 21, 25** (25 < 25.0.3 deprecated), Scala 2.13, **Python 3.10+** (the wheel lists 3.10-3.14).
- PySpark warns with pandas ≥ 3, so we pin `pandas<3`.
- 8 TPC-DS queries (16, 32, 50, 62, 92, 94, 95, 99) use ANSI `"double-quoted"` aliases, which Spark reads as string literals. The loader rewrites them to backticks.

---

## 4. Decisions log

| # | Decision | Why |
|---|---|---|
| D1 | GB Carbon Intensity API is the primary carbon source | Free, no key, CC BY 4.0, 30-min, has forecast + actual + 14 regions |
| D2 | Electricity Maps optional; NESO historic as cross-check / substitute | EM CSVs are sunset for non-academics; the brief allows substitution with justification |
| D3 | Average CI, not marginal | Public, standard (GHG Protocol location-based), same choice as Wiesner et al. Stated as a limitation |
| D4 | RAPL is the primary energy signal; battery + model are cross-checks | Measured, not guessed; the model gives cluster portability |
| D5 | TPC-DS via DuckDB dsdgen → Parquet (zstd) | No C toolchain, cross-platform, reproducible |
| D6 | Spark `noop` sink for job output | Full execution without output I/O; avoids winutils on Windows. (On Linux we *can* write parquet. Optionally add a write step for realism) |
| D7 | Spark 4.2 + JDK 21 (portable on Windows) | Spark doesn't support the Windows machine's Java 26 |
| D8 | Evaluate like Wiesner Scenario I (+ our extensions) | Results directly comparable to the published 4.3% / 7.4% for GB |
| D9 | 30-min time step, UTC internally | Matches the API grain; avoids BST bugs |
| D10 | Never disable TLS verification | The campus network threw `CERTIFICATE_VERIFY_FAILED`; the fix is a different network, and the downloader resumes |

---

## 5. What's built (file map)

```
MiniProject/                         (repo: GreenShift)
├── README.md                        overview, setup, data table
├── requirements.txt                 pyspark==4.2.0, duckdb==2.0.0, pandas<3, pyarrow, numpy, requests,
│                                    matplotlib, psutil, pywin32 (Windows only)
├── .gitignore                       ignores .venv, .tools, data/raw|processed|tpcds
├── docs/HANDOFF.md                  ← this file
├── notes/                           detailed research notes
│   ├── 00_CONTEXT.md                short context + index
│   ├── 01_carbon_data_sources.md
│   ├── 02_energy_measurement.md
│   ├── 03_scheduling_literature.md  (includes the scheduler design)
│   ├── 04_workloads_tpcds.md        (includes the proposed job catalogue)
│   ├── 05_syllabus_mapping.md
│   └── 06_project_plan.md
├── datacards/                       uk_carbon_intensity_api, neso_historic_generation_mix,
│                                    electricity_maps, tpcds
├── src/carbonsched/
│   ├── __init__.py                  PROJECT_ROOT, DATA_DIR, RAW_DIR, PROCESSED_DIR, RESULTS_DIR
│   ├── env.py                       configure(): JAVA_HOME (.tools/jdk-21*), SPARK_HOME, PYSPARK_PYTHON
│   │                                spark_session(app, cores, driver_memory, shuffle_partitions, master)
│   │                                master defaults to local[*]; override with CARBONSCHED_SPARK_MASTER=yarn
│   ├── carbon/uk_api.py             national(), regional(), forecast_48h(); 14-day chunking, retries,
│   │                                de-dup; REGIONS dict
│   ├── energy/
│   │   ├── sensors.py               RaplWindows (PDH), RaplLinux (powercap, wrap-safe), BatteryWindows (WMI),
│   │   │                            try_rapl(), try_battery()
│   │   ├── model.py                 LinearPowerModel (P_idle, P_max, memory_gb, pue), calibrate()
│   │   └── meter.py                 EnergyMeter context manager (sampler thread), MeterResult
│   │                                (rapl_pkg_j, battery_j, model_j, attributable_j, kwh), measure_idle()
│   └── workloads/spark_jobs.py      register_tpcds(spark, sf, root) (root/CARBONSCHED_TPCDS_ROOT → HDFS ok),
│                                    load_query(nr), run_job(spark, name, queries, idle_w) → energy +
│                                    Spark metrics dict, load_jobs(path)
├── scripts/
│   ├── fetch_carbon_data.py         --start --end --regions --skip-national --skip-neso (resumable)
│   └── generate_tpcds.py            --sf N → data/tpcds/sfN/*.parquet + data/tpcds/queries/qNN.sql
├── configs/  results/  report/  tests/   (empty, for next steps)
├── data/                            (git-ignored, all regenerable)
│   ├── raw/carbon/                  gb_national_2024-01-01_2026-01-01.csv, gb_regionNN_….csv, neso_….csv
│   └── tpcds/sf1/ + queries/        SF1 parquet + 99 .sql
├── .venv/                           Windows venv (do NOT copy)
└── .tools/jdk-21.0.12.1+1/          Windows portable JDK (do NOT copy)
```

Usage example (works today):
```python
from carbonsched.env import spark_session
from carbonsched.workloads.spark_jobs import register_tpcds, run_job
from carbonsched.energy import measure_idle

spark = spark_session("measure")
register_tpcds(spark, "sf1")
idle = measure_idle(60)
rec = run_job(spark, "inventory_supply_chain", [21, 22, 37, 39, 72, 82], idle_w=idle)
# rec: duration_s, rapl_pkg_j, attributable_j, kwh, executor_cpu_s, spark_inputBytes, ...
```

---

## 6. Measurements & results so far

These are smoke tests, not final results. Final measurements happen on the new system (§8 step 7).

**Energy meter validation (Windows laptop, on battery):**
| Test | Duration | RAPL PKG | Model | Battery | Mean util |
|---|---|---|---|---|---|
| Idle | 10 s | ≈ 7.4 W | n/a | n/a | n/a |
| CPU burn, 2 procs | 5.6 s | 88.0 J | 92.5 J | 66.5 J (lag) | 34% |
| CPU burn, 6 procs | 2.7 s | 64.2 J | 65.4 J | 28.9 J (lag) | 62% |
| CPU burn, 12 procs | 2.4 s | 68.9 J | 69.2 J | 20.6 J (lag) | 99% |
| 1 core busy loop | 4.0 s | 10.3 W | n/a | n/a | n/a |

→ RAPL and the model agree within ~5%. The battery lags, so it suits long jobs only.

**TPC-DS SF1:** dsdgen takes 4.2 s; 24 tables, **0.28 GB** parquet (store_sales 2,880,404 rows; inventory 11,745,000; catalog_sales 1,441,548; web_sales 719,384; customer 100,000).

**Spark 4.2 local[*] SF1 query times (s), all 99 run.** Heaviest: q14 12.5 · q72 10.5 · q23 9.2 · q04 9.2 · q78 7.7 · q16 7.0 · q95 6.6 · q67 6.5 · q24 6.4 · q47 6.1 · q11 6.0. Lightest: q41 0.7 · q96 0.9 · q42 1.0 · q83 1.0 · q86 1.0. Spark REST metrics work (e.g. 6 stages, 9.4 s CPU, 59.5 s executor run time on the smoke test).

**Carbon data sample (1-14 Jan 2025, national):** CI around 45-130 gCO2/kWh, index "low"/"moderate"; North Scotland was ~0 g/kWh (97% wind).

---

## 7. Moving to the new system (Linux + Hadoop)

### 7.1 What to copy

| Copy | Don't copy (regenerate) |
|---|---|
| `src/`, `scripts/`, `notes/`, `datacards/`, `docs/`, `configs/`, `README.md`, `requirements.txt`, `.gitignore` | `.venv/` (Windows binaries) |
| `data/raw/carbon/*.csv` (~60 MB; saves ~45 min of API calls; or re-download) | `.tools/` (Windows JDK) |
| | `data/tpcds/` (regenerates in seconds, any SF) |

Easiest: the repo is https://github.com/VismayHS/GreenShift. Push from this machine and clone on the new one. The GB API CSVs in `data/raw/carbon/` **are committed** (CC BY 4.0, ~4 MB each). The NESO historic CSV, TPC-DS data, `.venv` and `.tools` are git-ignored. Any region file missing at push time is fetched on the new machine by re-running the fetcher, which skips existing files.

### 7.2 Setup on Linux

```bash
# 1. Java: Spark 4.2 needs 17, 21 or 25
java -version                       # if not 17/21/25: sudo apt install openjdk-21-jdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# 2. Python env (3.10+)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt     # pywin32 is skipped automatically on Linux

# 3. If the machine already has a Spark install (e.g. /opt/spark with Hadoop/YARN):
spark-submit --version              # pyspark in .venv MUST match this major.minor version
#   → if the cluster has Spark 3.5.x: pip install "pyspark==3.5.*" and re-test the 99 queries
#     (3.5 supports Java 8/11/17, not 21+)
export SPARK_HOME=/opt/spark        # env.py keeps an existing SPARK_HOME

# 4. RAPL access (needs sudo; resets on reboot)
ls /sys/class/powercap/intel-rapl:0/
sudo chmod a+r /sys/class/powercap/intel-rapl:*/energy_uj /sys/class/powercap/intel-rapl:*/*/energy_uj
python -c "import sys; sys.path.insert(0,'src'); from carbonsched.energy.sensors import try_rapl; r=try_rapl(); print(type(r).__name__, r and r.read_joules())"
#   → expect "RaplLinux {...PKG: <big number>...}". If None: no permission, a VM, or no RAPL.
#     The model estimate still works; calibrate it on a machine that has RAPL.

# 5. Data
python scripts/fetch_carbon_data.py --start 2024-01-01 --end 2026-01-01   # skips files already there
python scripts/generate_tpcds.py --sf 1      # then --sf 10 for the measurements

# 6. Smoke test: run a few queries under the meter (§5 usage example)
```

### 7.3 Using Hadoop / HDFS / YARN (optional, ties into the syllabus)

```bash
hdfs dfs -mkdir -p /tpcds && hdfs dfs -put data/tpcds/sf10 /tpcds/
export CARBONSCHED_TPCDS_ROOT=hdfs:///tpcds   # register_tpcds() reads from HDFS
export CARBONSCHED_SPARK_MASTER=yarn           # spark_session() submits to YARN
```
- **Energy on YARN:** `EnergyMeter` measures *the machine it runs on*. On a single-node/pseudo-distributed Hadoop box that covers everything. On a multi-node cluster, either run a RAPL sampler on each NodeManager and sum the results, or use the **calibrated model × executor CPU-seconds** from the Spark REST metrics (which `run_job` already records). Say which one you used in the report.
- On Linux, Spark can write parquet (no winutils). Optionally add a final `write.parquet()` step to jobs for realism; HDFS I/O energy is still outside RAPL.
- Optional: register the TPC-DS tables in the Hive metastore (Spark `enableHiveSupport()`) to show the SQL-on-Hadoop syllabus topic.

### 7.4 Things that are Windows-only (ignore on Linux)

- `.tools/` JDK and the SPARK_HOME-with-spaces workaround.
- `BatteryWindows` (on Linux, `/sys/class/power_supply/BAT0/power_now` could be added if needed).
- The `noop`-because-of-winutils reason (noop is still a good choice for comparability).

---

## 8. Remaining work: detailed plan

### Step 6: Carbon data cleaning + EDA → `src/carbonsched/carbon/clean.py`, `scripts/eda_carbon.py` ✅ done 2026-10-27 (findings in §2)
- Load the CSVs and reindex to a complete 30-min UTC grid. Interpolate gaps ≤ 2 h and flag longer ones. Fill missing national `forecast` from `actual` only for EDA, never for the decision signal.
- Validate API `actual` vs NESO `CARBON_INTENSITY` (correlation, MAE).
- Figures: mean CI by hour of day (UTC and UK local), by month/season, weekday vs weekend, per region (North Scotland vs London vs South Wales); forecast error (MAE, bias) of national forecast vs actual. That gives the **real** error to compare with Wiesner's 5% assumption.
- Expected story: GB nights are relatively clean; midday solar in summer; big regional spread.

### Step 7: Job catalogue + measurement campaign → `configs/jobs.json`, `scripts/measure_jobs.py`, `results/measurements.csv`
Proposed jobs (finalise after SF10 timings):

| Job | TPC-DS queries | Character | Deadline / flexibility |
|---|---|---|---|
| `daily_sales_report` | 3, 7, 19, 42, 52, 55 | light BI | must finish by 07:00, low flexibility |
| `customer_analytics` | 4, 11, 74 | heavy customer aggregation | flexible |
| `inventory_supply_chain` | 21, 22, 37, 39, 72, 82 | inventory joins | flexible |
| `cross_channel_promo` | 14, 23, 33, 56, 60, 77, 80 | very heavy, 3 channels | flexible, interruptible per query |
| `returns_audit` | 16, 50, 62, 94, 95, 99 | returns/shipping | flexible |
| (opt) `ml_segmentation` | MLlib KMeans/ALS on customer features | syllabus MLlib | flexible, interruptible |

Protocol: see §3.5. Output per run: duration, RAPL J, attributable J, kWh, CPU-s, bytes. Also fit `calibrate()` on all samples to report the model's R² vs RAPL.
**Scaling to production:** laptop jobs use Wh-scale energy (milligrams of CO2). Report measured laptop numbers, *and* an extrapolation: e.g. energy ∝ executor CPU-seconds, scaled to SF1000 on a cluster with PUE 1.56. The % savings are unchanged by scaling; only the grams change. Be explicit that this is an extrapolation.

### Step 8: Scheduler + backtest simulator → `src/carbonsched/scheduler/{policies,simulator}.py`
Formulation: each night, jobs are released at r (e.g. 22:00 UK) with hard deadline D (e.g. 07:00). Job j has duration d_j, energy E_j, interruptible flag, optional dependencies, and cluster capacity k. Minimise Σ E_j/d_j · CI(t) over the occupied slots, subject to finishing by D.

| Policy | Rule |
|---|---|
| P0 Baseline | cron at r, back to back |
| P1 Threshold | start when forecast CI ≤ x-th percentile (or index ≤ "low"); latest-start fallback guarantees D |
| P2 Best window (non-interrupting) | min mean forecast CI window in [r, D − d_j] (Wiesner Scenario I) |
| P3 Interruptible | split at query boundaries into the lowest-CI slots (Wiesner "interrupting") |
| P4 Multi-job greedy, capacity k | largest E first → best feasible window; EDF feasibility check so no deadline is ever missed |
| P5 (stretch) ILP optimum | PuLP/CBC time-indexed model, an upper bound for the greedy gap |

Decide on the **forecast**, account emissions with the **actual**. Three forecast modes: oracle (actual), the real API forecast, and Wiesner noise N(0, 0.05·mean) × 10 seeds.
**Metrics:** gCO2/night, % saved vs P0, mean/p95 **added delay** (completion − baseline completion), deadline misses (must be 0), gCO2 saved per hour of delay, bootstrap 95% CIs over the 731 nights of 2024-25, split by season/weekday/region.
**Sensitivity:** window ±1…±8 h and "daytime allowed"; deadline; job mix; capacity k; region. **Compare against Wiesner's GB 4.3% / 7.4%.**

### Step 9: Online scheduler + orchestration → `scripts/run_scheduler.py`, `airflow/carbon_aware_dag.py`
- Online mode: at release time, fetch `forecast_48h(region)`, compute the plan with the chosen policy, log the decision and its reason (auditability), sleep until each start, then launch `run_job`. Measure the real energy and compute the actual emissions with the API's actual CI.
- Airflow example: a DAG whose first task computes the optimal start, followed by a `DateTimeSensorAsync`/deferrable sensor, then the Spark task, with a hard-deadline fallback.

### Step 10: Savings report → `report/`
Sections: problem & context; data (with data cards and the substitution note); measurement method (§3.5 protocol, validation table, limitations); scheduler design; experiments; results (savings vs delay trade-off curve, per region/season, comparison with the literature); SCI per nightly batch; limitations (average CI, RAPL scope, forecast error, laptop vs cluster, rebound effect); responsible-AI/governance reflection (transparency, auditability, fairness of delay, greenwashing risk); reproducibility (commands, versions, hashes).

### Step 11: Tests → `tests/`
Policy invariants: no deadline is missed; capacity is never exceeded; total energy is conserved between baseline and shifted schedules; with a constant CI, savings = 0; the oracle is ≥ forecast-based in expectation. Unit tests for the API parsing (missing fields) and for RAPL wraparound.

---

## 9. Open questions for the group

- [ ] Can anyone get **Electricity Maps academic access**? If yes, add India South (`IN-SO`) as a second, higher-carbon region (a local angle for Bengaluru).
- [x] Nightly window convention: **release 22:00, deadline 07:00 UK local time** (decided 2026-10-27). (The code works in UTC; BST shifts it by 1 h.)
- [ ] Final scale factor: **SF10** if the new machine has ≥ 32 GB RAM, otherwise SF5.
- [ ] Do we want the **live demo** (online scheduler launching real jobs at forecast-optimal times)?
- [x] Single-node vs multi-node Hadoop on the new system? **Single-node** (pseudo-distributed, checked 2026-10-27), so `EnergyMeter` on the one machine covers YARN runs too (§7.3).

---

## 10. Known issues & gotchas

- **`HADOOP_CONF_DIR` redirects local paths to HDFS** on the Linux box (fs.defaultFS = hdfs://localhost:9000). Local paths given to Spark need a `file://` prefix; `register_tpcds()` adds one.
- **RAPL permissions reset on reboot** on Linux: rerun the `sudo chmod` (§7.2) before each measurement session, otherwise `try_rapl()` quietly returns None and only the model is used.
- **Campus Wi-Fi TLS interception** gave `CERTIFICATE_VERIFY_FAILED` mid-download. Rerun on another network; the fetcher resumes. Do not disable verification.
- **Electricity Maps** pages return 403 without login, so a browser and an account are needed.
- **Spaces in the Windows path** ("Semester 5") break pyspark's `find-spark-home.cmd`; `env.py` sets SPARK_HOME. Avoid spaces in the project path on the new system.
- **pandas 3** gives a PySpark FutureWarning, so keep `pandas<3`.
- **RAPL counter granularity** is about 1 s, so keep measured jobs ≥ 30 s (use SF5/10 or group queries into jobs).
- **Regional API data has no `actual`**: for regional backtests, use the regional forecast as both signal and accounting value, with Wiesner-style noise for the decision signal. Note this in the report.
- Remaining **⚠ items**: index thresholds (NESO methodology PDF), Uptime PUE figure, ISO/IEC 21031 number, related-work citations, TPC fair-use wording.

---

## 11. Syllabus mapping

| Syllabus topic | Where it appears |
|---|---|
| Spark architecture (DAG, driver/executor) | Jobs are Spark SQL DAGs; per-stage CPU time from the REST API is used for energy attribution |
| RDD/DataFrame/Spark SQL | 99 TPC-DS queries as Spark SQL over Parquet |
| Columnar storage, HDFS/S3 | Parquet + zstd; inputBytes as an energy driver; TPC-DS on HDFS (§7.3) |
| YARN scheduling, cluster managers | Our scheduler decides *when* (time dimension); YARN decides *where*. Capacity k = queue slots; `CARBONSCHED_SPARK_MASTER=yarn` |
| Hive / SQL-on-Hadoop | Optional Hive metastore tables for TPC-DS |
| MLlib | Optional ML job; power-model calibration (regression) |
| Cloud deployment (EMR/Dataproc/Databricks) | Extrapolation with PUE; spatial (region) shifting discussion |
| Airflow / Prefect orchestration | Carbon-aware Airflow DAG with a deferrable sensor + deadline fallback |
| Data governance, metadata, quality | Data cards, provenance (dates, SHA-256, licences), gap handling, API vs NESO validation |
| Regulation & compliance | CC BY / ODbL share-alike / TPC EULA; GHG Protocol Scope 2 location-based reporting; ESG/CSRD-style disclosure |
| Responsible AI, transparency, accountability | Stated uncertainty and limitations; a scheduler log explaining every delay decision |
| Ethics | Fairness of delays across teams, rebound effects, greenwashing risk |

---

## 12. Sources

- GB Carbon Intensity API docs: https://carbon-intensity.github.io/api-definitions/ · API: https://api.carbonintensity.org.uk · site: https://carbonintensity.org.uk/
- NESO historic generation mix: https://www.neso.energy/data-portal/historic-generation-mix
- NESO regional CI forecast + methodology: https://www.neso.energy/data-portal/regional-carbon-intensity-forecast · national: https://www.neso.energy/data-portal/national-carbon-intensity-forecast
- Electricity Maps: https://www.electricitymaps.com/platform/datasets · academic access: https://help.electricitymaps.com/en/articles/13168512-academic-data-access-and-availability · free tier: https://electricitymaps.com/free-tier
- Wiesner et al. 2021: https://arxiv.org/abs/2110.13234 · code: https://github.com/dos-group/lets-wait-awhile
- CodeCarbon methodology: https://docs.codecarbon.io/3.2/explanation/methodology/
- GSF SCI: https://sci-guide.greensoftware.foundation/
- TPC-DS specs: https://www.tpc.org/tpc_documents_current_versions/current_specifications5.asp
- DuckDB tpcds extension: https://duckdb.org/docs/stable/core_extensions/tpcds
- Apache Spark 4.2 docs: https://spark.apache.org/docs/latest/
- Intel i5-12450H spec: Intel ARK (ark.intel.com), search "i5-12450H" (⚠ confirm 45 W / 95 W)

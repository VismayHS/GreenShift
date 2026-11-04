# Person 2 implementation and reproducibility

This branch implements TEAM_PLAN R0a–R0e, R1–R8 and R15. Person 3 owns
report generation, the website, the submission pipeline and presentation.
The frontend is unchanged. No push is performed by these commands.

## Environment

Use Python 3.12 and a portable JDK 21 under `.tools/jdk-21*`, or a supported
system JDK. The tested machine is Windows 11, Intel i5-13450HX, approximately
24 GB RAM. The initial query timing pass used eight local workers. The final
campaign uses four workers and an 8 GB driver heap, with bounded SQL/UI history.
Install the dependencies from the repository root:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python scripts\check_machine.py
.venv\Scripts\python -m pytest -q
```

RAPL is required for final measurements. The preflight fails when it is
unavailable or the machine is on battery. It records the selected Windows AC
power mode separately from Lenovo's effective overlay. Best performance is
the selected AC mode; the Balanced base scheme is not the same setting.
Room temperature, cooling and background application conditions are recorded
as unknown unless supplied by the operator.

Generated TPC-DS and Spark scratch files need several GB of free disk. This
workstation uses a local junction to D: for `data/tpcds`; this is not committed.
On another machine use a normal directory or set up an appropriate data root.
No external drive is required by the source.

## Workload and measurement

```powershell
.venv\Scripts\python scripts\generate_tpcds.py --sf 5
.venv\Scripts\python scripts\time_queries.py --sf 5 --cores 8 --driver-memory 8g --finalize
.venv\Scripts\python scripts\generate_tpcds.py --sf 1
.venv\Scripts\python scripts\prepare_campaign.py --sf 1 --cores 4 --driver-memory 8g
.venv\Scripts\python scripts\measure_jobs.py --sf 1 --cores 4 --driver-memory 8g --conditions-confirmed --room-conditions "Describe the actual conditions"
```

The SF5 timing command runs all 99 queries once and records every duration.
Two sustained SF5 attempts exhausted the Java heap, so the final catalogue uses
the SF1 fallback permitted by TEAM_PLAN R0c. `prepare_campaign.py` measures
warmed SF1 batches and chooses repeat counts with a margin above 30 seconds.
The SF5 timing pass remains recorded separately. Repetition is part of the defined
representative workload, not an artificial multiplier on measured energy.
Every accepted campaign run must actually last at least 30 seconds. Final
repeat counts were doubled after a power-transition attempt exposed faster
warmed runtimes; the original pilot remains labelled separately.

The campaign takes a 60-second idle baseline, warms each job once, and measures
five randomized runs of each job with 20-second cooldowns. A second 60-second
idle baseline follows. Attributable energy subtracts the mean of the two idle
powers times each measured duration. If duration or attributable-energy CV
is at least 10%, extra runs are added and their reason recorded, up to the
configured limit (15 per job by default). No outliers are silently discarded.
An unsuccessful quality gate returns a nonzero exit code.

The initial eight-worker campaign was invalidated after Java heap exhaustion.
All of that attempt's readings and its log are retained under
`results/measurement_attempts/2026-11-02-memory-pressure/`. None of its rows are
pooled with the restarted campaign. The second SF5 attempt is preserved in
`results/measurement_attempts/2026-11-02-sf5-short-run/`; it also exhausted the
heap and failed the minimum-duration gate. A subsequent SF1 warmup session
was interrupted by a Windows restart before any measured rows; its log is in
`results/measurement_attempts/2026-11-03-interrupted-reboot/`. A later attempt
failed on a sub-30-second run, with Windows power-source/sleep events observed
in the session; all its rows and event evidence are retained in
`results/measurement_attempts/2026-11-03-power-transition/`. Continuous AC and
sampler-gap monitoring now rejects disconnects and possible sleep interruptions.
SQL execution history is capped at 10;
stage metrics are attributed by stage ID rather than subtraction of unbounded
cumulative UI totals, so eviction of old stages cannot create negative metrics.

Outputs:
- `results/measurements.csv`: actual per-run readings, timestamps, repeat counts,
  SF, utilization and Spark task metrics.
- `results/measurements_summary.csv`: mean, sample standard deviation,
  Student-t 95% confidence intervals, CV and quality status per job.
- `results/measurements_meta.json`: conditions, seed, idle bookends, versions,
  commit, extra-run reasons and completion status.
- `results/power_model.json`: fitted CPU-package power coefficients and
  in-sample R². This is calibration, not independent model validation.

`MeterResult.kwh` remains a backwards-compatible **gross** value.
`gross_kwh` and `attributable_kwh` are explicit. Scheduling uses
**attributable_kwh**. Attributable values are null when no idle baseline is
available; gross energy is not silently relabelled as attributable.
CPU-package RAPL excludes whole-system energy. The fitted model uses
`memory_gb=0`, `pue=1` when compared against package RAPL.

## Scheduling and backtest

```powershell
.venv\Scripts\python scripts\run_backtest.py
.venv\Scripts\python scripts\verify_results.py
```

`configs/scheduler.json` controls dates, capacities, policies, forecast modes,
seeds, SCALE and PUE. A null SCALE targets a two-hour heaviest job from the
measured mean, constrained so the rounded fleet fits the shortest DST night
at the minimum configured capacity. The target and adjustment are recorded
in metadata. Duration is rounded up to half-hours; energy is conserved:

- duration_slots = ceil(mean duration_s × SCALE / 1800)
- energy_kwh = mean attributable_kwh × SCALE × PUE

Measured files must cover all jobs, have at least five runs, CV below 10%,
positive attributable energy, matching repeat counts, and a completed session.
If there is no measurements file, clearly labelled synthetic placeholders are
available for development. These must not be quoted as measured results.

P0 dispatches in catalogue order as capacity becomes free. P2 selects contiguous
low-forecast windows in catalogue order. P3 permits split slots only for
interruptible jobs. P4 considers the highest-energy job first. Every accepted
choice retains a constructive EDF completion for the remaining jobs; when a
candidate cannot prove feasibility, the previous feasible completion is retained.
The final forecast objective cannot be worse than P0. EDF is a conservative
feasibility heuristic, not an exact solver. P3 is a simulated slot-level
interruption policy; the immediate demo executes whole query batches.

Nightly windows are 22:00–07:00 Europe/London, converted to UTC. Spring/autumn
clock-change nights have 16/20 half-hours. Infeasible workloads are recorded as
skips, never emitted as deadline misses.

API decisions use the stored forecast. Missing or interpolated forecast slots
use the **raw actual period 24 hours earlier**, only if it has completed by
decision time. Unresolved gaps trigger P0 for the entire window. Accounting
always uses national actual CI. Long actual gaps and dataset boundary windows
are skipped with reasons. Short interpolated actual gaps remain marked by the
existing carbon loader.

Oracle and noisy modes deliberately use actual as synthetic decision inputs.
The noisy mode adds Gaussian noise with standard deviation 5% of that year's
mean actual intensity, with seeds 0–9; negative synthetic values are not clipped.
The oracle is a perfect-information benchmark. For heuristic multi-job policies
it is not a mathematically proven global optimum.

**Historical forecast limitation:** the committed CSVs contain no issue times
or archived forecast vintages. Tests prove that this implementation's API
decisions do not depend on future actual values. They cannot prove when NESO
originally published each historical forecast entry.

The output parquet has exactly the shared contract columns. Metadata includes
used/skipped nights, reasons, SCALE, PUE, substitutions, configuration, input
hash and code commit. An additional `backtest_slots.parquet` stores each row's
occupied and baseline slot indices for independent auditing.
`verify_results.py` checks every row's actual emissions, exact duration, start,
end, baseline, energy conservation and capacity; it also checks oracle versus
API performance on average.

## Paper comparison

The `wiesner_s1` scenario uses one 30-minute job and a 01:00 UK-local baseline,
with allowed start-time shifts of ±0.5, 1, 2, 4 and 8 hours. The deadline includes
the final 30-minute execution. Energy is normalized to 1 kWh, not a measurement.
P0 and P2 are exported for all forecast modes and ten noisy seeds.

At the autumn DST fold, the first 01:00 is used. The nonexistent spring 01:00
normalizes to 02:00 BST. Boundary windows that extend outside the dataset are
skipped. These experiments use **2024–25**, while the paper's GB values
(4.3% at ±2 h; 7.4% at ±8 h) concern **2020**. Agreement is not a test condition.

## Live and offline demo

```powershell
.venv\Scripts\python scripts\run_scheduler.py --dry-run
.venv\Scripts\python scripts\run_scheduler.py --dry-run --offline
.venv\Scripts\python scripts\run_scheduler.py --now --job daily_sales_report
```

The default is planning only. It fetches a national 48-hour forecast, compares
P0/P4, prints each decision and writes `results/plans/plan_<date>.json`.
The stored fallback is visibly identified. For a dry-run with a stale offline
copy, its recorded date is replayed and explicitly labelled **historical**.
A stored forecast is never silently relabelled as current.

`--now` runs one real job at the calibrated catalogue scale (SF1 here) immediately under RAPL and never sleeps until a
planned start. It compares the same measured laptop energy at current and
planned forecast intensities, clearly labelled counterfactual estimates.
Actual emissions are overlap-weighted from actual API values if available;
otherwise they remain **pending_actual**. Future planned-slot emissions cannot
be measured at demo time. No emissions are fabricated to fill that gap.
After the period completes, refresh a measured demo without running Spark again:

```powershell
.venv\Scripts\python scripts\score_demo.py results\plans\plan_<date>.json
```

## Handoff boundaries

Person 3 should consume the shared parquet and metadata, build confidence
intervals over nights, and update the website/report from those results.
Mac execution has not been claimed from a Windows-only validation.
The optional P5 ILP and unplugged battery cross-check are not required.

## Requirement evidence

| Requirement | Implementation and evidence |
|---|---|
| R0a–b hardware and conditions | `scripts/check_machine.py`, campaign metadata, `tests/test_preflight.py`; actual Intel RAPL, AC and selected power mode recorded |
| R0c workload selection | All 99 SF5 timings in `results/tpcds_sf5_windows_times.json`; SF1 warm-cache pilot and explicit memory-failure fallback |
| R0d–e measurement and quality | `scripts/measure_jobs.py`, raw/summary CSVs, idle bookends, randomized repeats, t intervals and fitted model; `tests/test_campaign.py`, `tests/test_energy.py`, `tests/test_spark_metrics.py` |
| R1–2 setup and time model | `requirements-dev.txt`, UTC half-hours and UK DST windows; `tests/test_carbon.py`, `tests/test_models.py` |
| R3 policies | `scheduler/policies.py`; known-answer case, constant CI and randomized capacity/deadline tests in `tests/test_policies.py` |
| R4 forecast modes | `scheduler/forecast.py`; lagged fallback, no future-actual dependence and ten deterministic noisy seeds in `tests/test_forecast.py` |
| R5 measured sizing | `scheduler/sizing.py`; measured attributable kWh and duration scaling with DST feasibility in `tests/test_sizing.py` |
| R6 complete simulation | `scripts/run_backtest.py`; exact shared schema, source hashes and slot audit; `tests/test_simulator.py` |
| R7 paper scenario | `scheduler/replication.py`; all five flexibility windows and UK clock-change cases in `tests/test_replication.py` |
| R8 independent checks | `scripts/verify_results.py`, `results/verification.json`, corruption detection in `tests/test_verification.py` |
| R15 live/offline demo | `scripts/run_scheduler.py`, `scripts/score_demo.py`, saved plans; actual-versus-forecast accounting in `tests/test_demo.py` |

The final campaign and full-result verification must pass before the numerical
outputs are treated as final. Person 3's Mac test, report, website export and
submission work remain separate from this Windows implementation.

Current execution status and remaining measurement acceptance: [Person 2 status](PERSON2_STATUS.md).

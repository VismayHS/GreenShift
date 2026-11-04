# 02: Measuring Spark job energy

## Accepted Person 2 measurements (2026-11-04)

Windows 11; Intel Core i5-13450HX; approximately 24 GB RAM; Spark 4.2.0;
portable JDK 21; local[4], 8 GB driver heap; SF1 with the catalogue repeat counts.
All 99 SF5 queries were timed first. Two sustained SF5 attempts exhausted the
heap, justifying the TEAM_PLAN SF1 fallback. This is a workload derived from
TPC-DS; not comparable with published TPC-DS results.

### Measurement table

All figures below are measured laptop CPU-package values, before fleet scaling.
Each job has five accepted readings; standard deviations use n−1 and intervals
use the two-sided Student-t 95% confidence interval.

| Job | n | Duration mean ± SD (s) | Duration 95% CI (s) | Gross package mean ± SD (J) | Attributable mean ± SD (J) | Attributable 95% CI (J) | Attributable kWh | Energy CV |
|---|---:|---:|---|---:|---:|---|---:|---:|
| inventory_supply_chain | 5 | 146.13 ± 2.98 | 142.42–149.83 | 3080.49 ± 65.81 | 1712.46 ± 56.11 | 1642.79–1782.13 | 0.00047568 | 3.28% |
| returns_audit | 5 | 125.30 ± 2.17 | 122.60–127.99 | 2425.99 ± 49.52 | 1252.97 ± 31.63 | 1213.69–1292.24 | 0.00034805 | 2.52% |
| customer_analytics | 5 | 110.02 ± 2.75 | 106.60–113.44 | 2200.18 ± 105.95 | 1170.20 ± 89.84 | 1058.65–1281.75 | 0.00032506 | 7.68% |
| daily_sales_report | 5 | 93.43 ± 3.47 | 89.12–97.73 | 1666.53 ± 38.60 | 1029.12 ± 27.41 | 995.08–1063.15 | 0.00028587 | 2.66% |
| cross_channel_promo | 5 | 220.59 ± 1.57 | 218.65–222.54 | 4523.77 ± 40.25 | 3018.73 ± 31.66 | 2979.41–3058.04 | 0.00083854 | 1.05% |

Full precision and confidence intervals for every recorded metric are in
`results/measurements_summary.csv`; the 25 accepted rows are in
`results/measurements.csv`. Every accepted run exceeds 30 seconds. Both duration
and attributable-energy CV are below 10% for every job.

### Protocol, retries and provenance

The initial uninterrupted session measured all five jobs in randomized order:
one warmup per job, five initial repeats per job, 20-second cooldowns and
60-second idle bookends. Daily sales and cross-channel failed the energy-CV
gate; one extra run each still left approximately 31–32% CV. All 27 readings
and their closing idle baseline are archived. The three complete passing job
cohorts were retained. No individual outlier was removed.

The two failed cohorts were retried in a separate session with three full
conditioning passes before its start idle baseline, then the required warmup
and five randomized repeats per job. Both complete retry cohorts passed.
The final dataset therefore accepts 15 rows from the initial session and all
10 rows from the retry. The 12 rejected rows remain archived and referenced in
`measurements_meta.json`. The conditioning period is excluded from statistics.
This protocol revision and selection by whole-cohort quality must be disclosed;
the retry does not establish the cause of the original variability.

| Session | Start idle (W) | End idle (W) | Mean subtracted (W) | Accepted jobs |
|---|---:|---:|---:|---|
| 2026-11-04-initial-quality | 11.849 | 6.875 | 9.362 | inventory_supply_chain, returns_audit, customer_analytics |
| 2026-11-04-conditioned-retry | 6.946 | 6.699 | 6.823 | daily_sales_report, cross_channel_promo |

Each accepted row retains its own session baseline: attributable J = gross
package J − session mean idle W × duration s; kWh = J / 3.6e6.
`MeterResult.kwh` is backwards-compatible gross energy. Scheduling explicitly
uses attributable kWh. CPU-package RAPL excludes DRAM (zero/unsupported here),
SSD, screen, fans and wall-socket losses; no RAM estimate is silently added.

AC was confirmed and continuously monitored during the accepted sessions.
Windows Best performance was selected (AC overlay
`ded574b5-45a0-4f42-8737-46345c09c238`); the OEM effective overlay and Balanced
base scheme are recorded separately. Automatic sleep was inhibited. Room
temperature, cooling details and background application closure were unknown.
Idle drift and between-session conditions limit attribution accuracy even when
within-job CV passes. Earlier interrupted attempts remain separate and excluded.

### Utilisation-model calibration

The linear fit on all 25 accepted runs gives **R² = 0.1058**,
intercept 17.058 W and full-utilisation coefficient
27.084 W. This is a weak in-sample fit, not a validated portable
energy estimator. The fitted intercept is not the measured idle baseline.
Use memory_gb=0 and PUE=1 when comparing this package-only model to RAPL.
The scheduler uses measured RAPL energy; its results do not depend on this
weak model fit. Raw rows include the fitted model energy for inspection.

### Immediate measured demo

The separate fresh-Spark `--now` demo ran for 64.65 s. Its
RAPL package reading was 2733.21 J; the same laptop run had
0.000636707 attributable kWh using the latest accepted
session's idle baseline. Published actual national CI gives
**0.125431 g CO₂** for its occupied interval. The saved plan
also labels 0.125431 g at current forecast CI and
0.070038 g at the planned-slot forecast CI as
counterfactual estimates. It is a fresh Spark process, so its energy can differ
from the warmed five-run catalogue mean. No future planned-slot emissions were
measured.

## Historical validation on the earlier machine

## The test machine

| | |
|---|---|
| CPU | Intel Core i5-12450H (Alder Lake-H, 4P+4E cores, 12 threads). Intel spec: 45 W base power, 95 W max turbo |
| RAM | 16 GB |
| OS | Windows 11 Home, bare metal (not a VM) |
| Spark | 4.2.0, `local[*]` (driver = executor, 12 task slots), JDK Temurin 21 (portable, `.tools/`) |

## Three independent energy signals (all verified working 2026-10-27)

1. **Intel RAPL via the Windows Energy Meter Interface (EMI)** (*primary, measured*)
   - Exposed as the perf-counter set `\Energy Meter(RAPL_Package0_<domain>)\Energy|Power`.
   - Domains: `PKG` (whole package), `PP0` (cores), `PP1` (iGPU), `DRAM` (reads **0** on this laptop, so not supported).
   - Units: `Energy` is cumulative in **picowatt-hours** (×3.6e-9 → J), `Power` in mW. We checked this: the Power counter and the Energy delta agree (10.32 W both ways).
   - Updates roughly once per second, so jobs shorter than ~10 s carry a few % quantisation error. Our jobs run for tens of seconds or more.
   - CodeCarbon documents the same path: "Windows: reads RAPL-style counters through the Windows Energy Meter Interface. Needs Windows 11 on bare metal."
2. **Battery discharge rate** (*measured, whole-system, cross-check*)
   - WMI `root\wmi:BatteryStatus.DischargeRate` (mW). Valid only when unplugged. It includes the screen, SSD, Wi-Fi, etc.
   - The firmware smooths it, so it **lags** by several seconds. It only works for long jobs (>1 min) and for sanity-checking the order of magnitude.
3. **Utilisation × linear power model** (*estimate, portable*)
   - `P = P_idle + (P_max − P_idle)·u + 0.375 W/GB × RAM_GB`, times the PUE.
   - This is the CodeCarbon fallback / Cloud Carbon Footprint method. 0.375 W/GB is CodeCarbon v2's "3 W per 8 GB". CodeCarbon v3 uses 5 W per DIMM with a 10 W x86 minimum.
   - We **calibrate** `P_idle`/`P_max` against RAPL (least squares; `energy/model.py::calibrate`). The calibrated model is how we would attribute energy on a YARN/K8s cluster or cloud VM without RAPL access.

Plus **Spark task metrics** from the REST API (`/api/v1/applications/{id}/stages`): `executorCpuTime`, `executorRunTime`, `inputBytes`, shuffle bytes and spills. Together these give an **energy-per-CPU-second** attribution that scales from the laptop to a cluster.

First test (CPU burn, 12 processes): RAPL 68.9 J, model 69.2 J, battery 20.6 J (lagging). Idle ≈ 7.4 W package.

## Measurement protocol (for the report's "measurement method" section)

1. Plug in to AC, select the Windows "Best performance" power mode, close other apps, keep the screen on at fixed brightness, and keep Wi-Fi as is.
2. Warm-up: one untimed run of each job (JIT, OS file cache, parquet footers).
3. **Idle baseline:** 60 s idle, giving `P_idle`. Repeat at the start and end of the session.
4. Run each job **n = 5** times in randomised order, with 20 s cool-down between runs (thermal throttling bias).
5. For each run record: wall time, RAPL PKG/PP0 energy, mean utilisation, Spark CPU-seconds, bytes read and shuffled.
6. Report the mean ± std and 95% CI, both **gross** energy (RAPL PKG) and **attributable** energy (gross − P_idle × duration).
7. Convert: `E_kWh = J / 3.6e6`, then `CO2_g = E_kWh × PUE × CI(t)`. PUE = 1.0 for the laptop. For data-centre extrapolation use the Uptime Institute 2024 global average PUE ≈ 1.56 (**verify the figure before citing**).

## What RAPL does not capture (limitations to state)

- DRAM (no counter here), SSD, NIC, motherboard, fans, PSU losses, and the screen. We add the RAM model term and note the rest.
- Package power includes background OS activity, which the idle baseline subtraction handles.
- RAPL is a model inside the CPU, not a power meter. Published validations find it accurate on modern Intel parts, but it is not wall-socket power.
- **Embodied carbon** (manufacturing) is out of scope for *shifting*, because it is the same whichever hour a job runs. It belongs in the SCI formula for completeness (see notes 03).

## Why this matters for the scheduler

Emissions = E × CI(t). For a fixed single-job schedule, E cancels from the
percentage saving. For multiple jobs, relative job energies weight the aggregate
saving and influence P4's ordering. Multiplying every energy by the same factor
preserves percentages only if durations and placements stay fixed. The fleet
model scales durations as well as energy, so changing SCALE can change both
feasibility and percentage savings. Energy measurement supplies the attributable
kWh used for ranking and grams, rather than an assumed equal-power weighting.

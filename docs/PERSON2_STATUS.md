# Person 2 status — 2026-11-04

Implementation, accepted RAPL measurements and measured-size backtesting are verified.
The immediate measured demo ran successfully and its actual emissions were scored after API publication.

## Verified deliverables

- **50 Windows tests pass**, including no-lookahead, DST, capacity, energy accounting,
  JSON export, RAPL and whole-cohort retry checks. There are 184 upstream
  NumPy/pandas deprecation warnings, with no test failures.
- **25 accepted real RAPL readings**, five per job. Every run exceeds 30 seconds;
  duration and attributable-energy CV are below 10%. Energy CV spans 1.05–7.68%.
- Three passing cohorts came from the original 27-run session. Two whole failed
  cohorts were replaced by ten readings from a separately conditioned retry.
  All twelve rejected rows and earlier interrupted attempts remain archived;
  no individual outlier was silently removed. Each row retains its session idle.
- **437,448 backtest rows / 157,512 plans** independently audited: zero deadline
  misses, zero capacity violations, conserved energy and correct actual-CI
  accounting. All required policies, capacities, forecast modes, seeds and
  Wiesner windows were exercised over the 2024–2025 candidate dates. Missing
  actual data and boundary skips are explicitly listed in metadata.
- Live and offline dry-run plans passed using measured job sizes. The immediate
  RAPL demo ran for 64.65 seconds and measured 2,733.21 gross package joules.
  Its actual emissions are **0.125431 g CO₂** from published actual CI.
  Forecast comparisons remain explicitly counterfactual.
- Frontend unchanged. Commits use Sharvesh K's linked GitHub identity, with no
  co-author trailers. README contributor credit links to @SharveshK1228.

## Final artifacts

- `results/measurements.csv`, `measurements_summary.csv`, `measurements_meta.json`
- `results/power_model.json`; full measurement table in `notes/02_energy_measurement.md`
- `results/backtest.parquet`, `backtest_meta.json`, `backtest_slots.parquet`
- `results/verification.json`, `results/person2_validation.json`
- `results/plans/plan_2026-10-27.json` (explicit offline historical replay)
- `results/plans/plan_2026-11-04.json` (live plan and real measured demo)

`results/validation_placeholder/` is retained only as earlier development evidence.
The final backtest at the results root uses measured energy and durations,
SCALE=32.63923280795001 and PUE=1.0. Fleet-scaled results are projections.

## Reproduce processing from committed measurements

```powershell
.venv\Scripts\python -m pytest -q --disable-warnings
.venv\Scripts\python scripts\run_backtest.py
.venv\Scripts\python scripts\verify_results.py
.venv\Scripts\python scripts\run_scheduler.py --dry-run --offline
.venv\Scripts\python scripts\run_scheduler.py --dry-run
```

See `docs/PERSON2.md` for hardware measurement and retry commands. The saved demo plan includes its published actual CI score. Rerun
`scripts/score_demo.py results/plans/plan_2026-11-04.json` if the API revises it.

## Limitations and remaining team work

SF1 was permitted after two sustained SF5 heap failures; all 99 SF5 query timings
are retained. Room/cooling and background-app closure were unknown. Baseline
drift and the documented conditioning retry limit cross-session comparability.
The utilisation model has weak in-sample R²=0.1058 and is not a validated portable
estimator; scheduling uses measured RAPL, not that model. RAPL covers CPU package
energy, not wall-socket or whole-system consumption.

Historical forecast files lack issue-time vintages; the code's no-lookahead
checks do not prove historical publication times. The oracle is a heuristic
perfect-information benchmark, not a guaranteed global optimum. The Wiesner
scenario uses normalized 1 kWh and 2024–2025 data, not the paper's 2020 results.

Person 3 owns Mac validation, report generation, website export and submission.
Those tasks and optional P5/Airflow/battery cross-check are outside Person 2 scope.

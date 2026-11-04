# Person 2 status — 2026-11-04

Implementation is ready; final physical measurement deliverables remain blocked.
Do not describe this branch as a completed measurement campaign.

## Verified

- 49 Windows tests pass (184 upstream NumPy/pandas deprecation warnings).
- All 99 SF5 queries timed; SF1 fallback documented after sustained heap failures.
- P0/P2/P3/P4, UTC/UK DST scheduling, API/oracle/noisy forecasts, measured-size
  loading, exact output contract, Wiesner scenario and independent auditor built.
- Full 2024–2025 matrix generated 437,448 rows with zero deadline misses using
  explicitly labelled placeholder job sizes. The independent audit passed every row: zero capacity/deadline violations,
  conserved energy and correct actual-intensity accounting. Evidence:
  `results/validation_placeholder/verification.json`.
- Live and offline planning demos passed on 2026-11-04; their plans are retained
  under `results/validation_placeholder/` and labelled by forecast source.
- Frontend unchanged. Git commits contain no co-author trailers.

## Physical blocker and remaining acceptance

The 2026-11-04 campaign started on AC but stopped during warmup after the guard
observed charger disconnection. The machine subsequently reported battery power.
Prior interrupted attempts are preserved under `results/measurement_attempts/`.
The 16-run session was explicitly paused before its closing idle baseline and
remaining repeats; it cannot be presented as a complete campaign.

Remaining: R0d/R0e final idle-bookended campaign, five or more accepted runs per
job, quality statistics and final measurement table; R5 measured fleet sizes;
R6 measured-size backtest and audit; R15 immediate measured demo and eventual
actual-intensity scoring. No measured savings or completed campaign is claimed.
The placeholder nightly outputs are validation evidence, not final measurements.

## Resume commands

Keep the charger connected and lid open. Select Windows Best performance.
Run from the repository root using the already calibrated SF1 catalogue:

```powershell
.venv\Scripts\python scripts\check_machine.py
.venv\Scripts\python scripts\measure_jobs.py --sf 1 --cores 4 --driver-memory 8g --conditions-confirmed --room-conditions "Record actual conditions and unknowns"
.venv\Scripts\python scripts\run_backtest.py
.venv\Scripts\python scripts\verify_results.py
.venv\Scripts\python scripts\run_scheduler.py --dry-run --offline
.venv\Scripts\python scripts\run_scheduler.py --dry-run
.venv\Scripts\python scripts\run_scheduler.py --now --job daily_sales_report
```

After actual CI is published, use `scripts/score_demo.py` on the measured plan.
Update `notes/02_energy_measurement.md` with the accepted measurement table and
this status with final verification evidence. Measurements must never be silently
substituted with model estimates or drawn from interrupted sessions.

Person 3 still owns Mac validation, report, website exports and submission.

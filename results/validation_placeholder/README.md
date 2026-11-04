# Scheduler validation — not final measured results

These outputs exercise all 2024–2025 dates, configured policies, capacities,
forecast modes and noisy seeds using the documented placeholder job sizes.
The nightly energy values are synthetic placeholders, not RAPL measurements.
Do not quote their grams or savings as the final measured project result.

The Wiesner scenario is independently defined as a 30-minute, normalized
1 kWh job. Its actual-intensity accounting uses the committed 2024–2025
national dataset, not the paper's 2020 observations.

Reproduce from the repository root while no final measurements.csv exists:

```powershell
.venv\Scripts\python scripts\run_backtest.py --output results/validation_placeholder
.venv\Scripts\python scripts\verify_results.py --output results/validation_placeholder
```

Live and offline dry-run plans are retained in their named subdirectories.
A completed RAPL campaign and measured-size backtest remain required for final
Person 2 numerical deliverables; see docs/PERSON2_STATUS.md.

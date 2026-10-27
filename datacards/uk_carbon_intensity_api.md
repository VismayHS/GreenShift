# Data card: GB Carbon Intensity API

| Field | Value |
|---|---|
| Name | Carbon Intensity API (Great Britain) |
| Publisher | NESO (National Energy System Operator), with Environmental Defense Fund Europe, University of Oxford, WWF |
| URL | https://api.carbonintensity.org.uk, docs https://carbon-intensity.github.io/api-definitions/ |
| Licence | Creative Commons Attribution 4.0 (CC BY 4.0) + API Terms of Use |
| Access | Public REST, no account or key |
| Accessed | 2026-10-27 |
| Period used | 2024-01-01 → 2025-12-31 (UTC) |
| Granularity | 30-minute settlement periods |
| Spatial scope | GB national + 14 DNO regions (ids 1-14) |
| Variables | `forecast`, `actual` (national only), `index`, regional `generationmix` % by fuel |
| Units | gCO2/kWh (average, production-based, direct combustion emissions) |
| Personal data | None (grid-level aggregates) |
| Known issues | Missing `forecast` in some national periods (26/673 rows in 1-14 Jan 2025); a few missing regional half-hours; values may be revised |
| Pre-processing | De-duplicate on `from`, reindex to a full 30-min UTC grid, interpolate gaps ≤ 2 h, flag longer gaps |
| Use in project | Scheduler backtest (forecast = decision signal, actual = ground truth for accounting) and the live forecast for the online mode |
| Attribution | "Carbon intensity data: Carbon Intensity API, NESO (CC BY 4.0)." |

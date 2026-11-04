# Graph Report - GreenShift  (2026-11-04)

## Corpus Check
- 103 files · ~41,152 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: .log 7, (none) 4, .csv 4)

## Summary
- 703 nodes · 1503 edges · 49 communities (38 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dfbd7c0f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 00_CONTEXT.md
- meter.py
- spark_jobs.py
- eda_carbon.py
- clean.py
- README.md
- package.json
- CarbonField.tsx
- GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)
- export_site_data.py
- plan.ts
- CountUp.tsx
- compilerOptions
- compilerOptions
- Tonight.tsx
- Product
- react
- .oxlintrc.json
- React + TypeScript + Vite
- LICENSE.md
- tsconfig.json
- GreenShift site: story + Tonight
- numpy
- EnergyMeter
- json
- MeterResult
- data.ts
- uk_api.py
- Person 2 implementation and reproducibility
- 3. Research findings
- preflight.py
- prepare_campaign.py
- sensors.py
- forecast
- 8. Implementation status and remaining team work
- PERSON2_RESUME.md
- try_rapl
- GreenShift: instructions for AI assistants
- fetch_carbon_data.py
- 02: Measuring Spark job energy
- 00: Project context (read this first)
- 01: Grid carbon-intensity data sources
- RaplLinux
- 04: Workloads: TPC-DS on Spark
- 06: Project plan & architecture

## God Nodes (most connected - your core abstractions)
1. `schedule()` - 25 edges
2. `Story()` - 23 edges
3. `compilerOptions` - 18 edges
4. `main()` - 17 edges
5. `Job` - 16 edges
6. `compilerOptions` - 15 edges
7. `EnergyMeter` - 15 edges
8. `Tonight()` - 14 edges
9. `main()` - 14 edges
10. `run_backtest()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Rules` --references--> `forecast()`  [INFERRED]
  CLAUDE.md → scripts/export_site_data.py
- `Step 6: Carbon data cleaning + EDA → `src/carbonsched/carbon/clean.py`, `scripts/eda_carbon.py` ✅ done 2026-10-27 (findings in §2)` --references--> `forecast()`  [INFERRED]
  docs/HANDOFF.md → scripts/export_site_data.py
- `Carbon EDA findings (2024-25, step 6)` --references--> `_chunks()`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/carbon/uk_api.py
- `Step 7: Job catalogue + measurement campaign → `configs/jobs.json`, `scripts/measure_jobs.py`, `results/measurements.csv`` --references--> `calibrate()`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/energy/model.py
- `7.4 Things that are Windows-only (ignore on Linux)` --references--> `BatteryWindows`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/energy/sensors.py

## Import Cycles
- None detected.

## Communities (49 total, 11 thin omitted)

### Community 0 - "00_CONTEXT.md"
Cohesion: 0.22
Nodes (5): 03: Carbon-aware scheduling: literature & design ideas, Core paper ✅: Wiesner et al., "Let's Wait Awhile: How Temporal Workload Shifting Can Reduce Carbon Emissions in the Cloud", Middleware '21, pp. 260-272. arXiv:2110.13234. Code + data: https://github.com/dos-group/lets-wait-awhile, Related work to cite (⚠ verify each), Talking points for the report, 05: Syllabus mapping (UE24AM343AB3, Track G: Governance, Compliance & Sustainability)

### Community 1 - "meter.py"
Cohesion: 0.20
Nodes (4): 3.5 Energy measurement ✅, measure_idle(), calibrate(), test_calibration_known_line()

### Community 2 - "spark_jobs.py"
Cohesion: 0.13
Nodes (7): Step 9: Online scheduler + orchestration → `scripts/run_scheduler.py`, `airflow/carbon_aware_dag.py`, Running on Spark 4.2, load_jobs(), load_query(), run_job(), _stage_metrics(), test_stage_metrics_survive_old_history_eviction()

### Community 3 - "eda_carbon.py"
Cohesion: 0.24
Nodes (12): forecast_err(), _hour(), _hours_axis(), _label_ends(), main(), monthly(), neso_check(), night_stats() (+4 more)

### Community 4 - "clean.py"
Cohesion: 0.13
Nodes (9): main(), forecast_error(), _gap_runs(), _grid(), load_national(), load_neso(), load_regional(), regrid() (+1 more)

### Community 5 - "README.md"
Cohesion: 0.17
Nodes (7): Data card: Electricity Maps (status: optional / pending access), Data card: NESO Historic GB generation mix & carbon intensity, Data card: TPC-DS-derived workload, Data, GreenShift, Setup (Windows), Site (story + Tonight view)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (46): dependencies, d3-geo@^3.1.1, @fontsource-variable/atkinson-hyperlegible-next@^5.3.0, motion@^14.6.0, react@^19.3.1, react-dom@^19.3.1, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3 (+38 more)

### Community 7 - "CarbonField.tsx"
Cohesion: 0.14
Nodes (20): d3-contour@^4.0.2, d3-scale@^4.0.2, CarbonField(), NORTH_TO_SOUTH, Props, upsample(), hh(), HistoryField() (+12 more)

### Community 8 - "GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)"
Cohesion: 0.13
Nodes (15): 11. Syllabus mapping, 12. Sources, 1. The assignment, 2. Status at a glance, 4. Decisions log, 5. What's built (file map), 6. Measurements & results so far, 7.1 What to copy (+7 more)

### Community 9 - "export_site_data.py"
Cohesion: 0.27
Nodes (6): energy(), history(), main(), _num(), regions(), _write()

### Community 10 - "plan.ts"
Cohesion: 0.13
Nodes (25): d3-shape@^3.2.0, Props, Forecast, Slot, baseline(), bestWindow(), clock(), fits() (+17 more)

### Community 11 - "CountUp.tsx"
Cohesion: 0.15
Nodes (21): buildRoll(), clamp01(), Column, CountUp(), CountUpProps, Easing, EASINGS, getDecimalPlaces() (+13 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 14 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 15 - "Tonight.tsx"
Cohesion: 0.20
Nodes (11): NightPlan(), day(), hm(), reason(), useTonight(), LENGTHS, mean(), REGIONS (+3 more)

### Community 16 - "Product"
Cohesion: 0.15
Nodes (12): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+4 more)

### Community 17 - "react"
Cohesion: 0.33
Nodes (6): App(), Footer(), Route, routeOf(), TEAM, react

### Community 18 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 19 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 24 - "numpy"
Cohesion: 0.05
Nodes (48): choose_window(), plan_demo(), score_measured_interval(), build_signal(), Signal, Job, night_window(), Plan (+40 more)

### Community 26 - "EnergyMeter"
Cohesion: 0.26
Nodes (5): 9. Open questions for the group, idle(), EnergyMeter, LinearPowerModel, test_model_integrates_entire_interval()

### Community 27 - "json"
Cohesion: 0.17
Nodes (8): main(), main(), main(), main(), main(), require_rapl(), fetch_forecast(), test_offline_acquisition_is_labelled()

### Community 29 - "data.ts"
Cohesion: 0.15
Nodes (25): ApiNat, ApiReg, Eda, fromRows(), Job, json(), loadEda(), loadEnergy() (+17 more)

### Community 30 - "uk_api.py"
Cohesion: 0.34
Nodes (7): _chunks(), _fmt(), forecast_48h(), _get(), national(), regional(), _tidy()

### Community 31 - "Person 2 implementation and reproducibility"
Cohesion: 0.25
Nodes (8): Environment, Handoff boundaries, Live and offline demo, Paper comparison, Person 2 implementation and reproducibility, Requirement evidence, Scheduling and backtest, Workload and measurement

### Community 32 - "3. Research findings"
Cohesion: 0.29
Nodes (7): 3.2 NESO Historic generation mix & carbon intensity ✅, 3.3 Electricity Maps ✅ (status) / ⚠ (details), 3.4 Average vs marginal carbon intensity, 3.6 Literature, 3.7 TPC-DS ✅, 3.8 Spark compatibility ✅, 3. Research findings

### Community 33 - "preflight.py"
Cohesion: 0.08
Nodes (13): main(), fit_model(), subtract_idle(), summarize(), awake_session(), machine_info(), _powershell(), SessionGuard (+5 more)

### Community 34 - "prepare_campaign.py"
Cohesion: 0.22
Nodes (6): main(), main(), configure(), _find_jdk(), spark_session(), register_tpcds()

### Community 36 - "forecast"
Cohesion: 0.29
Nodes (5): Data card: GB Carbon Intensity API, 3.1 GB Carbon Intensity API (primary carbon source) ✅, 1. GB Carbon Intensity API (primary source), Design for our scheduler (proposal), forecast()

### Community 37 - "8. Implementation status and remaining team work"
Cohesion: 0.33
Nodes (6): 8. Implementation status and remaining team work, Step 10: Savings report → `report/`, Step 11: Tests → `tests/`, Step 6: Carbon data cleaning + EDA → `src/carbonsched/carbon/clean.py`, `scripts/eda_carbon.py` ✅ done 2026-10-27 (findings in §2), Step 7: Job catalogue + measurement campaign → `configs/jobs.json`, `scripts/measure_jobs.py`, `results/measurements.csv`, Step 8: Scheduler + backtest simulator → `src/carbonsched/scheduler/{policies,simulator}.py`

### Community 39 - "try_rapl"
Cohesion: 0.25
Nodes (3): 10. Known issues & gotchas, RaplWindows, try_rapl()

### Community 40 - "GreenShift: instructions for AI assistants"
Cohesion: 0.29
Nodes (5): Commands, Deliverables, graphify, GreenShift: instructions for AI assistants, Rules

### Community 41 - "fetch_carbon_data.py"
Cohesion: 0.39
Nodes (3): _date(), main(), _sha256()

### Community 42 - "02: Measuring Spark job energy"
Cohesion: 0.29
Nodes (7): Energy, 02: Measuring Spark job energy, Measurement protocol (for the report's "measurement method" section), The test machine, Three independent energy signals (all verified working 2026-10-27), What RAPL does not capture (limitations to state), Why this matters for the scheduler

### Community 43 - "00: Project context (read this first)"
Cohesion: 0.33
Nodes (6): 00: Project context (read this first), Deliverables → where they live, Environment quick-start, Index of notes, Key decisions so far (and why), Open questions for the group

### Community 44 - "01: Grid carbon-intensity data sources"
Cohesion: 0.33
Nodes (5): 01: Grid carbon-intensity data sources, 2. NESO Historic generation mix & carbon intensity (bulk cross-check), 3. Electricity Maps (secondary / optional), 4. Average vs marginal intensity (methodology choice), 5. What we downloaded

### Community 46 - "04: Workloads: TPC-DS on Spark"
Cohesion: 0.40
Nodes (4): 04: Workloads: TPC-DS on Spark, Generating data, Licence / fair use, "Representative nightly jobs" (proposal: final set after SF5/10 timings)

### Community 48 - "06: Project plan & architecture"
Cohesion: 0.40
Nodes (4): 06: Project plan & architecture, Architecture, Repo layout, Work plan

## Knowledge Gaps
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Three independent energy signals (all verified working 2026-10-27)` connect `02: Measuring Spark job energy` to `meter.py`?**
  _High betweenness centrality (0.331) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `schedule()` (e.g. with `Job` and `test_api_has_no_actual_lookahead()`) actually correct?**
  _`schedule()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `spark_jobs.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._
- **Why does `Energy` connect `02: Measuring Spark job energy` to `plan.ts`, `data.ts`?**
  _High betweenness centrality (0.321) - this node is a cross-community bridge._
- **Should `clean.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12681159420289856 - nodes in this community are weakly interconnected._
- **Why does `calibrate()` connect `meter.py` to `preflight.py`, `02: Measuring Spark job energy`, `EnergyMeter`, `8. Implementation status and remaining team work`?**
  _High betweenness centrality (0.306) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05851063829787234 - nodes in this community are weakly interconnected._
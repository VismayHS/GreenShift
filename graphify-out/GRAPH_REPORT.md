# Graph Report - GreenShift  (2026-11-04)

## Corpus Check
- 112 files · ~95,102 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .log 8, .csv 6, (none) 4)

## Summary
- 718 nodes · 1544 edges · 40 communities (29 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03a22c8b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 00_CONTEXT.md
- meter.py
- spark_jobs.py
- eda_carbon.py
- clean.py
- Person 2 implementation and reproducibility
- package.json
- CarbonField.tsx
- preflight.py
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
- data.ts
- argparse
- preflight.py
- prepare_campaign.py
- sensors.py
- measure_jobs.py
- validation_placeholder/README.md
- sensors.py

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
- `Data card: GB Carbon Intensity API` --references--> `forecast()`  [INFERRED]
  datacards/uk_carbon_intensity_api.md → scripts/export_site_data.py
- `1. GB Carbon Intensity API (primary source)` --references--> `forecast()`  [INFERRED]
  notes/01_carbon_data_sources.md → scripts/export_site_data.py
- `Design for our scheduler (proposal)` --references--> `forecast()`  [INFERRED]
  notes/03_scheduling_literature.md → scripts/export_site_data.py
- `Carbon EDA findings (2024-25, step 6)` --references--> `_chunks()`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/carbon/uk_api.py
- `9. Open questions for the group` --references--> `EnergyMeter`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/energy/meter.py

## Import Cycles
- None detected.

## Communities (40 total, 11 thin omitted)

### Community 0 - "00_CONTEXT.md"
Cohesion: 0.05
Nodes (35): Energy, 00: Project context (read this first), Deliverables → where they live, Environment quick-start, Index of notes, Key decisions so far (and why), Open questions for the group, 01: Grid carbon-intensity data sources (+27 more)

### Community 1 - "meter.py"
Cohesion: 0.21
Nodes (4): 3.5 Energy measurement ✅, measure_idle(), calibrate(), test_calibration_known_line()

### Community 2 - "spark_jobs.py"
Cohesion: 0.14
Nodes (7): Step 9: Online scheduler + orchestration → `scripts/run_scheduler.py`, `airflow/carbon_aware_dag.py`, Running on Spark 4.2, load_jobs(), load_query(), run_job(), _stage_metrics(), test_stage_metrics_survive_old_history_eviction()

### Community 3 - "eda_carbon.py"
Cohesion: 0.24
Nodes (12): forecast_err(), _hour(), _hours_axis(), _label_ends(), main(), monthly(), neso_check(), night_stats() (+4 more)

### Community 4 - "clean.py"
Cohesion: 0.13
Nodes (9): main(), forecast_error(), _gap_runs(), _grid(), load_national(), load_neso(), load_regional(), regrid() (+1 more)

### Community 5 - "Person 2 implementation and reproducibility"
Cohesion: 0.07
Nodes (22): Data card: Electricity Maps (status: optional / pending access), Data card: NESO Historic GB generation mix & carbon intensity, Data card: TPC-DS-derived workload, Data card: GB Carbon Intensity API, Environment, Handoff boundaries, Live and offline demo, Paper comparison (+14 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, @fontsource-variable/atkinson-hyperlegible-next@^5.3.0, motion@^14.6.0, react@^19.3.1, react-dom@^19.3.1, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3, devDependencies (+36 more)

### Community 7 - "CarbonField.tsx"
Cohesion: 0.14
Nodes (21): d3-contour@^4.0.2, d3-geo@^3.1.1, d3-scale@^4.0.2, CarbonField(), NORTH_TO_SOUTH, Props, upsample(), hh() (+13 more)

### Community 8 - "preflight.py"
Cohesion: 0.21
Nodes (4): awake_session(), machine_info(), _powershell(), _find_jdk()

### Community 9 - "export_site_data.py"
Cohesion: 0.05
Nodes (37): Commands, Deliverables, graphify, GreenShift: instructions for AI assistants, Rules, 11. Syllabus mapping, 12. Sources, 1. The assignment (+29 more)

### Community 10 - "plan.ts"
Cohesion: 0.17
Nodes (20): Forecast, loadEnergy(), baseline(), bestWindow(), fits(), fmt, fmtDay, meanCi() (+12 more)

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
Cohesion: 0.15
Nodes (15): d3-shape@^3.2.0, NightPlan(), Props, day(), hm(), Placed, reason(), SLOT_MS (+7 more)

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
Cohesion: 0.06
Nodes (45): choose_window(), plan_demo(), score_measured_interval(), build_signal(), Signal, Job, night_window(), Plan (+37 more)

### Community 26 - "EnergyMeter"
Cohesion: 0.33
Nodes (3): EnergyMeter, LinearPowerModel, test_model_integrates_entire_interval()

### Community 27 - "json"
Cohesion: 0.19
Nodes (9): main(), main(), main(), require_rapl(), fetch_forecast(), load_sizes(), test_offline_acquisition_is_labelled(), test_automatic_scale_fits_spring_dst_night() (+1 more)

### Community 29 - "data.ts"
Cohesion: 0.30
Nodes (13): json(), loadEda(), loadHistory(), loadRegions(), loadResults(), useReveal(), Fact(), Legend() (+5 more)

### Community 30 - "uk_api.py"
Cohesion: 0.18
Nodes (10): _date(), main(), _sha256(), _chunks(), _fmt(), forecast_48h(), _get(), national() (+2 more)

### Community 31 - "data.ts"
Cohesion: 0.16
Nodes (14): ApiNat, ApiReg, Eda, fromRows(), History, Job, loadForecast(), ms() (+6 more)

### Community 33 - "preflight.py"
Cohesion: 0.11
Nodes (13): main(), combine_qualified_cohorts(), fit_model(), subtract_idle(), summarize(), SessionGuard, validate_session_sample(), test_retry_accepts_whole_cohorts_and_preserves_failed_rows() (+5 more)

### Community 34 - "prepare_campaign.py"
Cohesion: 0.17
Nodes (6): 10. Known issues & gotchas, main(), main(), configure(), spark_session(), register_tpcds()

### Community 35 - "sensors.py"
Cohesion: 0.18
Nodes (7): 7.1 What to copy, 7.2 Setup on Linux, 7.3 Using Hadoop / HDFS / YARN (optional, ties into the syllabus), 7.4 Things that are Windows-only (ignore on Linux), 7. Moving to the new system (Linux + Hadoop), BatteryWindows, try_battery()

### Community 39 - "sensors.py"
Cohesion: 0.16
Nodes (4): RaplLinux, RaplWindows, try_rapl(), test_rapl_wrap()

## Knowledge Gaps
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Three independent energy signals (all verified working 2026-10-27)` connect `00_CONTEXT.md` to `meter.py`?**
  _High betweenness centrality (0.331) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `schedule()` (e.g. with `Job` and `test_api_has_no_actual_lookahead()`) actually correct?**
  _`schedule()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `00_CONTEXT.md` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Why does `Energy` connect `00_CONTEXT.md` to `plan.ts`, `data.ts`?**
  _High betweenness centrality (0.318) - this node is a cross-community bridge._
- **Should `spark_jobs.py` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._
- **Why does `calibrate()` connect `meter.py` to `00_CONTEXT.md`, `export_site_data.py`, `EnergyMeter`, `preflight.py`?**
  _High betweenness centrality (0.302) - this node is a cross-community bridge._
- **Should `clean.py` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
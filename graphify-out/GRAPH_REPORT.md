# Graph Report - GreenShift  (2026-11-04)

## Corpus Check
- 117 files · ~97,182 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: .csv 10, .log 8, (none) 4)

## Summary
- 721 nodes · 1548 edges · 46 communities (36 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `96c0baeb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 00_CONTEXT.md
- test_energy.py
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
- argparse
- meter.py
- pandas
- MeterResult
- data.ts
- uk_api.py
- data.ts
- simulator.py
- SessionGuard
- datetime
- 7. Moving to the new system (Linux + Hadoop)
- 02: Measuring Spark job energy
- validation_placeholder/README.md
- export_site_data.py
- sensors.py
- forecast
- GreenShift: instructions for AI assistants
- 00: Project context (read this first)
- 04: Workloads: TPC-DS on Spark
- 01: Grid carbon-intensity data sources

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
- `Data card: GB Carbon Intensity API` --references--> `forecast()`  [INFERRED]
  datacards/uk_carbon_intensity_api.md → scripts/export_site_data.py
- `3.1 GB Carbon Intensity API (primary carbon source) ✅` --references--> `forecast()`  [INFERRED]
  docs/HANDOFF.md → scripts/export_site_data.py
- `Step 6: Carbon data cleaning + EDA → `src/carbonsched/carbon/clean.py`, `scripts/eda_carbon.py` ✅ done 2026-10-27 (findings in §2)` --references--> `forecast()`  [INFERRED]
  docs/HANDOFF.md → scripts/export_site_data.py
- `Carbon EDA findings (2024-25, step 6)` --references--> `_chunks()`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/carbon/uk_api.py

## Import Cycles
- None detected.

## Communities (46 total, 10 thin omitted)

### Community 0 - "00_CONTEXT.md"
Cohesion: 0.20
Nodes (5): 05: Syllabus mapping (UE24AM343AB3, Track G: Governance, Compliance & Sustainability), 06: Project plan & architecture, Architecture, Repo layout, Work plan

### Community 2 - "spark_jobs.py"
Cohesion: 0.15
Nodes (5): load_jobs(), load_query(), run_job(), _stage_metrics(), test_stage_metrics_survive_old_history_eviction()

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
Cohesion: 0.14
Nodes (8): awake_session(), machine_info(), _powershell(), require_rapl(), _find_jdk(), test_awake_session_restores_state_on_failure(), test_measurement_refuses_silent_estimates_and_battery(), test_session_rejects_disconnect_and_suspension()

### Community 9 - "export_site_data.py"
Cohesion: 0.05
Nodes (39): 10. Known issues & gotchas, 11. Syllabus mapping, 12. Sources, 1. The assignment, 2. Status at a glance, 3.1 GB Carbon Intensity API (primary carbon source) ✅, 3.2 NESO Historic generation mix & carbon intensity ✅, 3.3 Electricity Maps ✅ (status) / ⚠ (details) (+31 more)

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
Cohesion: 0.07
Nodes (34): build_signal(), Signal, Job, Plan, utc(), validate(), baseline(), blocks() (+26 more)

### Community 25 - "argparse"
Cohesion: 0.12
Nodes (7): main(), main(), main(), main(), main(), configure(), spark_session()

### Community 26 - "meter.py"
Cohesion: 0.16
Nodes (5): idle(), EnergyMeter, measure_idle(), LinearPowerModel, test_model_integrates_entire_interval()

### Community 27 - "pandas"
Cohesion: 0.17
Nodes (11): main(), choose_window(), fetch_forecast(), plan_demo(), score_measured_interval(), night_window(), InfeasibleSchedule, load_sizes() (+3 more)

### Community 29 - "data.ts"
Cohesion: 0.30
Nodes (13): json(), loadEda(), loadHistory(), loadRegions(), loadResults(), useReveal(), Fact(), Legend() (+5 more)

### Community 30 - "uk_api.py"
Cohesion: 0.34
Nodes (7): _chunks(), _fmt(), forecast_48h(), _get(), national(), regional(), _tidy()

### Community 31 - "data.ts"
Cohesion: 0.16
Nodes (14): ApiNat, ApiReg, Eda, fromRows(), History, Job, loadForecast(), ms() (+6 more)

### Community 32 - "simulator.py"
Cohesion: 0.17
Nodes (5): main(), main(), write_outputs(), verify_outputs(), test_independent_verifier_detects_corrupted_energy()

### Community 34 - "datetime"
Cohesion: 0.15
Nodes (6): _date(), main(), _sha256(), test_actual_scoring_uses_overlap_and_waits_for_actual(), test_demo_missing_forecast_keeps_safe_cron(), test_offline_acquisition_is_labelled()

### Community 35 - "7. Moving to the new system (Linux + Hadoop)"
Cohesion: 0.40
Nodes (5): 7.1 What to copy, 7.2 Setup on Linux, 7.3 Using Hadoop / HDFS / YARN (optional, ties into the syllabus), 7.4 Things that are Windows-only (ignore on Linux), 7. Moving to the new system (Linux + Hadoop)

### Community 36 - "02: Measuring Spark job energy"
Cohesion: 0.17
Nodes (12): Energy, 02: Measuring Spark job energy, Accepted Person 2 measurements (2026-11-04), Historical validation on the earlier machine, Measurement protocol (for the report's "measurement method" section), Measurement table, Protocol, retries and provenance, The test machine (+4 more)

### Community 38 - "export_site_data.py"
Cohesion: 0.27
Nodes (6): energy(), history(), main(), _num(), regions(), _write()

### Community 39 - "sensors.py"
Cohesion: 0.16
Nodes (4): BatteryWindows, RaplWindows, try_battery(), try_rapl()

### Community 40 - "forecast"
Cohesion: 0.22
Nodes (7): 1. GB Carbon Intensity API (primary source), 03: Carbon-aware scheduling: literature & design ideas, Core paper ✅: Wiesner et al., "Let's Wait Awhile: How Temporal Workload Shifting Can Reduce Carbon Emissions in the Cloud", Middleware '21, pp. 260-272. arXiv:2110.13234. Code + data: https://github.com/dos-group/lets-wait-awhile, Design for our scheduler (proposal), Related work to cite (⚠ verify each), Talking points for the report, forecast()

### Community 41 - "GreenShift: instructions for AI assistants"
Cohesion: 0.29
Nodes (5): Commands, Deliverables, graphify, GreenShift: instructions for AI assistants, Rules

### Community 42 - "00: Project context (read this first)"
Cohesion: 0.33
Nodes (6): 00: Project context (read this first), Deliverables → where they live, Environment quick-start, Index of notes, Key decisions so far (and why), Open questions for the group

### Community 43 - "04: Workloads: TPC-DS on Spark"
Cohesion: 0.33
Nodes (5): 04: Workloads: TPC-DS on Spark, Generating data, Licence / fair use, "Representative nightly jobs" (proposal: final set after SF5/10 timings), Running on Spark 4.2

### Community 44 - "01: Grid carbon-intensity data sources"
Cohesion: 0.40
Nodes (5): 01: Grid carbon-intensity data sources, 2. NESO Historic generation mix & carbon intensity (bulk cross-check), 3. Electricity Maps (secondary / optional), 4. Average vs marginal intensity (methodology choice), 5. What we downloaded

## Knowledge Gaps
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Three independent energy signals (all verified working 2026-10-27)` connect `02: Measuring Spark job energy` to `export_site_data.py`?**
  _High betweenness centrality (0.332) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `schedule()` (e.g. with `Job` and `test_api_has_no_actual_lookahead()`) actually correct?**
  _`schedule()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `spark_jobs.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._
- **Why does `Energy` connect `02: Measuring Spark job energy` to `plan.ts`, `data.ts`?**
  _High betweenness centrality (0.318) - this node is a cross-community bridge._
- **Should `clean.py` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Why does `calibrate()` connect `export_site_data.py` to `meter.py`, `02: Measuring Spark job energy`?**
  _High betweenness centrality (0.297) - this node is a cross-community bridge._
- **Should `Person 2 implementation and reproducibility` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
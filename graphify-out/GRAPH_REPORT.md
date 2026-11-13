# Graph Report - GreenShift  (2026-11-13)

## Corpus Check
- 124 files · ~138,822 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: (none) 8, .log 7, .csv 4)

## Summary
- 916 nodes · 2076 edges · 68 communities (58 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 73 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1350551`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 00_CONTEXT.md
- meter.py
- build_docs.py
- numpy
- clean.py
- README.md
- devDependencies
- dependencies
- BatteryWindows
- export_site_data.py
- plan.ts
- simulator.py
- compilerOptions
- compilerOptions
- GreenShift: carbon-aware scheduling of nightly Spark batch jobs
- Product
- charts.tsx
- .oxlintrc.json
- React + TypeScript + Vite
- pipeline
- tsconfig.json
- GreenShift site: story + Tonight
- pytest
- schedule
- argparse
- EnergyMeter
- demo.py
- MeterResult
- primitives.tsx
- uk_api.py
- preflight.py
- 3. Research findings
- SessionGuard
- data.ts
- sensors.py
- hooks.ts
- GreenShift: Carbon-Aware Scheduling of Nightly Spark Batch Jobs
- Model card: GreenShift carbon-aware batch scheduler
- GreenShift demo script (3 presenters, about 14 minutes + questions)
- GreenShift: instructions for AI assistants
- fetch_carbon_data.py
- 02: Measuring Spark job energy
- 00: Project context (read this first)
- 01: Grid carbon-intensity data sources
- package.json
- 00_CONTEXT.md
- 06: Project plan & architecture
- spark_jobs.py
- vite.config.ts
- GreenShift
- GreenShift results tables
- Person 2 status — 2026-11-04
- scripts
- pandas
- @fontsource-variable/atkinson-hyperlegible-next@^5.3.0
- tailwindcss@^4.3.3
- validation_placeholder/README.md
- models.py
- GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)
- App.tsx
- AppShell.tsx
- policies.py
- test_simulator.py
- Person 2 implementation and reproducibility
- 8. Implementation status and remaining team work
- 04: Workloads: TPC-DS on Spark

## God Nodes (most connected - your core abstractions)
1. `Tonight()` - 27 edges
2. `schedule()` - 25 edges
3. `ResultsPage()` - 22 edges
4. `useResults()` - 19 edges
5. `Carbon()` - 19 edges
6. `Summary()` - 19 edges
7. `SectionHead()` - 19 edges
8. `Field()` - 18 edges
9. `Page()` - 18 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Rules` --references--> `forecast()`  [INFERRED]
  CLAUDE.md → scripts/export_site_data.py
- `Data card: GB Carbon Intensity API` --references--> `forecast()`  [INFERRED]
  datacards/uk_carbon_intensity_api.md → scripts/export_site_data.py
- `3.1 GB Carbon Intensity API (primary carbon source) ✅` --references--> `forecast()`  [INFERRED]
  docs/HANDOFF.md → scripts/export_site_data.py
- `Step 6: Carbon data cleaning + EDA → `src/carbonsched/carbon/clean.py`, `scripts/eda_carbon.py` ✅ done 2026-10-27 (findings in §2)` --references--> `forecast()`  [INFERRED]
  docs/HANDOFF.md → scripts/export_site_data.py
- `1. GB Carbon Intensity API (primary source)` --references--> `forecast()`  [INFERRED]
  notes/01_carbon_data_sources.md → scripts/export_site_data.py

## Import Cycles
- None detected.

## Communities (68 total, 10 thin omitted)

### Community 0 - "00_CONTEXT.md"
Cohesion: 0.33
Nodes (5): 03: Carbon-aware scheduling: literature & design ideas, Core paper ✅: Wiesner et al., "Let's Wait Awhile: How Temporal Workload Shifting Can Reduce Carbon Emissions in the Cloud", Middleware '21, pp. 260-272. arXiv:2110.13234. Code + data: https://github.com/dos-group/lets-wait-awhile, Design for our scheduler (proposal), Related work to cite (⚠ verify each), Talking points for the report

### Community 1 - "meter.py"
Cohesion: 0.19
Nodes (5): 3.5 Energy measurement ✅, Step 7: Job catalogue + measurement campaign → `configs/jobs.json`, `scripts/measure_jobs.py`, `results/measurements.csv`, measure_idle(), calibrate(), test_calibration_known_line()

### Community 2 - "build_docs.py"
Cohesion: 0.33
Nodes (4): chrome(), main(), print_pdf(), to_html()

### Community 3 - "numpy"
Cohesion: 0.10
Nodes (33): boot_ci(), breakdown(), fig_breakdown(), fig_delay(), fig_distribution(), fig_example(), fig_seeds(), fig_window() (+25 more)

### Community 4 - "clean.py"
Cohesion: 0.14
Nodes (8): main(), forecast_error(), _gap_runs(), _grid(), load_national(), load_neso(), load_regional(), regrid()

### Community 5 - "README.md"
Cohesion: 0.18
Nodes (4): Data card: Electricity Maps (status: optional / pending access), Data card: NESO Historic GB generation mix & carbon intensity, Data card: TPC-DS-derived workload, Data card: GB Carbon Intensity API

### Community 6 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, oxlint@^1.88.0, @types/d3-geo@^3.1.1, @types/d3-scale@^4.0.9, @types/d3-shape@^3.2.0, @types/node@^24.19.2, @types/react@^19.3.0, @types/react-dom@^19.3.0 (+9 more)

### Community 7 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, d3-contour@^4.0.2, d3-geo@^3.1.1, d3-scale@^4.0.2, d3-shape@^3.2.0, @fontsource/ibm-plex-mono@^5.3.0, @fontsource-variable/noto-sans@^5.3.0, lucide-react@^0.460.0 (+9 more)

### Community 8 - "BatteryWindows"
Cohesion: 0.18
Nodes (7): 7.1 What to copy, 7.2 Setup on Linux, 7.3 Using Hadoop / HDFS / YARN (optional, ties into the syllabus), 7.4 Things that are Windows-only (ignore on Linux), 7. Moving to the new system (Linux + Hadoop), BatteryWindows, try_battery()

### Community 9 - "export_site_data.py"
Cohesion: 0.17
Nodes (10): attempts(), energy(), forecast(), history(), main(), _num(), regions(), _write() (+2 more)

### Community 10 - "plan.ts"
Cohesion: 0.14
Nodes (25): Slot, baseline(), Block, blocks(), chooseWindow(), edf(), first(), fmt (+17 more)

### Community 11 - "simulator.py"
Cohesion: 0.20
Nodes (7): Job, all_scenarios(), scenarios(), write_outputs(), make_jobs(), test_oracle_is_upper_bound_for_single_job(), test_paper_window_bounds_and_baseline()

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 14 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 15 - "GreenShift: carbon-aware scheduling of nightly Spark batch jobs"
Cohesion: 0.09
Nodes (23): 1. Problem and context, 2. Data, 3.1 Signals, 3.2 Validation of the meter (CPU-burn tests, not job measurements), 3.3 Protocol (implemented in `scripts/measure_jobs.py` with `energy/preflight.py` guards), 3.4 Campaign status ⏳, 3.5 What the meter does not capture, 3. Measurement method (+15 more)

### Community 16 - "Product"
Cohesion: 0.15
Nodes (12): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+4 more)

### Community 17 - "charts.tsx"
Cohesion: 0.14
Nodes (29): BarGroup, Frame(), GroupedBars(), HBars(), Heatmap(), Histogram(), Key(), LineChart() (+21 more)

### Community 18 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 19 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 20 - "pipeline"
Cohesion: 0.15
Nodes (12): build, command, image, user, volumes, working_dir, services, pipeline (+4 more)

### Community 23 - "pytest"
Cohesion: 0.18
Nodes (7): fit_model(), subtract_idle(), summarize(), load_sizes(), test_summary_and_idle_have_known_units(), test_automatic_scale_fits_spring_dst_night(), test_scaling_preserves_energy_and_marks_placeholders()

### Community 24 - "schedule"
Cohesion: 0.33
Nodes (10): schedule(), jobs_for(), test_capacity_two_allows_parallel_baseline(), test_constant_carbon_and_missing_signal(), test_edf_preserves_urgent_job_when_large_job_prefers_its_slot(), test_hand_checkable_two_jobs(), test_interruptible_selects_lowest_separated_slots(), test_overfull_workload_fails_explicitly() (+2 more)

### Community 26 - "EnergyMeter"
Cohesion: 0.29
Nodes (4): idle(), EnergyMeter, LinearPowerModel, test_model_integrates_entire_interval()

### Community 27 - "demo.py"
Cohesion: 0.17
Nodes (8): choose_window(), plan_demo(), score_measured_interval(), night_window(), test_actual_scoring_uses_overlap_and_waits_for_actual(), test_demo_missing_forecast_keeps_safe_cron(), test_offline_acquisition_is_labelled(), test_dst_window()

### Community 29 - "primitives.tsx"
Cohesion: 0.17
Nodes (33): INK, Mode, MODE_NAME, ukDateTime(), Carbon(), hh(), SEASON_COLOURS, EnergyPage() (+25 more)

### Community 30 - "uk_api.py"
Cohesion: 0.35
Nodes (7): _chunks(), _fmt(), forecast_48h(), _get(), national(), regional(), _tidy()

### Community 31 - "preflight.py"
Cohesion: 0.10
Nodes (12): main(), main(), main(), main(), notebook(), step(), tests(), awake_session() (+4 more)

### Community 32 - "3. Research findings"
Cohesion: 0.25
Nodes (8): 3.1 GB Carbon Intensity API (primary carbon source) ✅, 3.2 NESO Historic generation mix & carbon intensity ✅, 3.3 Electricity Maps ✅ (status) / ⚠ (details), 3.4 Average vs marginal carbon intensity, 3.6 Literature, 3.7 TPC-DS ✅, 3.8 Spark compatibility ✅, 3. Research findings

### Community 33 - "SessionGuard"
Cohesion: 0.17
Nodes (5): SessionGuard, validate_session_sample(), test_awake_session_restores_state_on_failure(), test_measurement_refuses_silent_estimates_and_battery(), test_session_rejects_disconnect_and_suspension()

### Community 34 - "data.ts"
Cohesion: 0.08
Nodes (34): ApiNat, ApiReg, Attempt, cache, CatalogueJob, Dist, Eda, Forecast (+26 more)

### Community 35 - "sensors.py"
Cohesion: 0.15
Nodes (5): 10. Known issues & gotchas, RaplLinux, RaplWindows, try_rapl(), test_rapl_wrap()

### Community 36 - "hooks.ts"
Cohesion: 0.15
Nodes (24): loadEda(), loadEnergy(), loadHistory(), loadPythonPlan(), loadRegions(), loadResults(), once(), minutes() (+16 more)

### Community 37 - "GreenShift: Carbon-Aware Scheduling of Nightly Spark Batch Jobs"
Cohesion: 0.20
Nodes (10): 1. Problem, 2. Data, 3. Energy measurement method, 4. Scheduler design, 5. Experimental setup and pipeline, 6. Results, 7. Responsible AI and limitations, 8. Conclusion and next step (+2 more)

### Community 38 - "Model card: GreenShift carbon-aware batch scheduler"
Cohesion: 0.20
Nodes (10): Caveats and recommendations, Ethical considerations, Evaluation data, Factors, Intended use, Metrics, Model card: GreenShift carbon-aware batch scheduler, Model details (+2 more)

### Community 39 - "GreenShift demo script (3 presenters, about 14 minutes + questions)"
Cohesion: 0.20
Nodes (9): 1. Ashwin: the problem (2.5 min) · Summary page, 2. Vismay: data and measurement (3 min), 3. Sharvesh: the scheduler, live (3 min), 4. Sharvesh: results (3 min) · Savings and delay page, 5. Ashwin: responsible AI and close (2.5 min) · Responsible AI page, Before the talk (all three, 15 minutes before), GreenShift demo script (3 presenters, about 14 minutes + questions), If something breaks (+1 more)

### Community 40 - "GreenShift: instructions for AI assistants"
Cohesion: 0.29
Nodes (5): Commands, Deliverables, graphify, GreenShift: instructions for AI assistants, Rules

### Community 41 - "fetch_carbon_data.py"
Cohesion: 0.22
Nodes (4): _date(), main(), _sha256(), test_long_gaps_stay_missing_and_short_gaps_flagged()

### Community 42 - "02: Measuring Spark job energy"
Cohesion: 0.22
Nodes (9): Energy, 02: Measuring Spark job energy, Historical validation on the earlier machine, Measurement protocol (for the report's "measurement method" section), Person 2 campaign status (2026-11-04), The test machine, Three independent energy signals (all verified working 2026-10-27), What RAPL does not capture (limitations to state) (+1 more)

### Community 43 - "00: Project context (read this first)"
Cohesion: 0.33
Nodes (6): 00: Project context (read this first), Deliverables → where they live, Environment quick-start, Index of notes, Key decisions so far (and why), Open questions for the group

### Community 44 - "01: Grid carbon-intensity data sources"
Cohesion: 0.33
Nodes (6): 01: Grid carbon-intensity data sources, 1. GB Carbon Intensity API (primary source), 2. NESO Historic generation mix & carbon intensity (bulk cross-check), 3. Electricity Maps (secondary / optional), 4. Average vs marginal intensity (methodology choice), 5. What we downloaded

### Community 45 - "package.json"
Cohesion: 0.22
Nodes (8): motion@^14.6.0, @types/d3-contour@^3.0.6, name, private, type, version, motion, @types/d3-contour

### Community 48 - "06: Project plan & architecture"
Cohesion: 0.40
Nodes (4): 06: Project plan & architecture, Architecture, Repo layout, Work plan

### Community 49 - "spark_jobs.py"
Cohesion: 0.10
Nodes (12): main(), main(), main(), configure(), spark_session(), fetch_forecast(), load_jobs(), load_query() (+4 more)

### Community 50 - "vite.config.ts"
Cohesion: 0.29
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.3.4, @vitejs/plugin-react@^6.1.2, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 51 - "GreenShift"
Cohesion: 0.17
Nodes (12): Architecture, Data and licences, Everyday commands, GreenShift, Measuring energy (the RAPL laptop only), Option A: Docker Compose (nothing to install but Docker), Option B: local Python (Linux, macOS or Windows), Repository layout (+4 more)

### Community 52 - "GreenShift results tables"
Cohesion: 0.29
Nodes (7): Figures, GreenShift results tables, Table 1. Nightly batch (5 jobs, release 22:00, deadline 07:00 UK): CO₂ saved vs P0 cron, Table 2. Paper replication (Wiesner et al. 2021 Scenario I): one 30 min job, baseline 01:00 UK, Table 3. Forecast regret: how much of the perfect-forecast saving a real forecast achieves, Table 4. Savings by season and by night of the week (P4 multi-job greedy, k=1), Table 5. Carbon intensity the batch actually ran at (k=1), energy-weighted, gCO₂/kWh

### Community 53 - "Person 2 status — 2026-11-04"
Cohesion: 0.50
Nodes (4): Person 2 status — 2026-11-04, Physical blocker and remaining acceptance, Resume commands, Verified

### Community 54 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 55 - "pandas"
Cohesion: 0.24
Nodes (8): build_signal(), Signal, run_backtest(), test_api_has_no_actual_lookahead(), test_cannot_use_unavailable_lag_or_interpolated_forecast(), test_noise_is_seeded_and_window_independent(), test_noise_matches_unclipped_gaussian_definition(), test_independent_verifier_detects_corrupted_energy()

### Community 59 - "models.py"
Cohesion: 0.26
Nodes (4): Plan, utc(), validate(), test_plan_energy_and_integrity()

### Community 60 - "GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)"
Cohesion: 0.18
Nodes (11): 11. Syllabus mapping, 12. Sources, 1. The assignment, 2. Status at a glance, 4. Decisions log, 5. What's built (file map), 6. Measurements & results so far, 9. Open questions for the group (+3 more)

### Community 61 - "App.tsx"
Cohesion: 0.27
Nodes (7): App(), Route, routeOf(), ROUTES, TEAM, RailItem(), react

### Community 62 - "AppShell.tsx"
Cohesion: 0.27
Nodes (9): AppShell(), Brand, BrandBlock(), Crumb, Crumbs(), Icon, Mark(), RailGroup() (+1 more)

### Community 63 - "policies.py"
Cohesion: 0.36
Nodes (5): baseline(), blocks(), bounds(), _edf(), InfeasibleSchedule

### Community 64 - "test_simulator.py"
Cohesion: 0.31
Nodes (5): _git_commit(), fixture_data(), test_actual_gap_skips_entire_night(), test_backtest_runs_outside_a_git_checkout(), test_contract_and_actual_accounting()

### Community 65 - "Person 2 implementation and reproducibility"
Cohesion: 0.25
Nodes (8): Environment, Handoff boundaries, Live and offline demo, Paper comparison, Person 2 implementation and reproducibility, Requirement evidence, Scheduling and backtest, Workload and measurement

### Community 66 - "8. Implementation status and remaining team work"
Cohesion: 0.33
Nodes (6): 8. Implementation status and remaining team work, Step 10: Savings report → `report/`, Step 11: Tests → `tests/`, Step 6: Carbon data cleaning + EDA → `src/carbonsched/carbon/clean.py`, `scripts/eda_carbon.py` ✅ done 2026-10-27 (findings in §2), Step 8: Scheduler + backtest simulator → `src/carbonsched/scheduler/{policies,simulator}.py`, Step 9: Online scheduler + orchestration → `scripts/run_scheduler.py`, `airflow/carbon_aware_dag.py`

### Community 67 - "04: Workloads: TPC-DS on Spark"
Cohesion: 0.33
Nodes (5): 04: Workloads: TPC-DS on Spark, Generating data, Licence / fair use, "Representative nightly jobs" (proposal: final set after SF5/10 timings), Running on Spark 4.2

## Knowledge Gaps
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Three independent energy signals (all verified working 2026-10-27)` connect `02: Measuring Spark job energy` to `meter.py`?**
  _High betweenness centrality (0.346) - this node is a cross-community bridge._
- **Should `numpy` be split into smaller, more focused modules?**
  _Cohesion score 0.0965166908563135 - nodes in this community are weakly interconnected._
- **Why does `Energy` connect `02: Measuring Spark job energy` to `data.ts`?**
  _High betweenness centrality (0.337) - this node is a cross-community bridge._
- **Should `clean.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1437908496732026 - nodes in this community are weakly interconnected._
- **Why does `calibrate()` connect `meter.py` to `02: Measuring Spark job energy`, `EnergyMeter`, `pytest`?**
  _High betweenness centrality (0.283) - this node is a cross-community bridge._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
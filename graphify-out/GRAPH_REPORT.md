# Graph Report - GreenShift  (2026-10-27)

## Corpus Check
- 28 files · ~15,550 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 239 nodes · 404 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f35a858`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 00_CONTEXT.md
- meter.py
- 3. Research findings
- eda_carbon.py
- clean.py
- env.py
- sensors.py
- GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)
- pandas
- fetch_carbon_data.py
- README.md
- spark_jobs.py

## God Nodes (most connected - your core abstractions)
1. `EnergyMeter` - 13 edges
2. `GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)` - 13 edges
3. `national()` - 10 edges
4. `regional()` - 10 edges
5. `regional()` - 9 edges
6. `main()` - 9 edges
7. `3. Research findings` - 9 edges
8. `_save()` - 8 edges
9. `forecast_48h()` - 8 edges
10. `run_job()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `9. Open questions for the group` --references--> `EnergyMeter`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/energy/meter.py
- `7.4 Things that are Windows-only (ignore on Linux)` --references--> `BatteryWindows`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/energy/sensors.py
- `Step 9: Online scheduler + orchestration → `scripts/run_scheduler.py`, `airflow/carbon_aware_dag.py`` --references--> `run_job()`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/workloads/spark_jobs.py
- `7.3 Using Hadoop / HDFS / YARN (optional, ties into the syllabus)` --references--> `EnergyMeter`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/energy/meter.py
- `3.5 Energy measurement ✅` --references--> `calibrate()`  [INFERRED]
  docs/HANDOFF.md → src/carbonsched/energy/model.py

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "00_CONTEXT.md"
Cohesion: 0.07
Nodes (20): 01: Grid carbon-intensity data sources, 1. GB Carbon Intensity API (primary source), 2. NESO Historic generation mix & carbon intensity (bulk cross-check), 3. Electricity Maps (secondary / optional), 4. Average vs marginal intensity (methodology choice), 5. What we downloaded, 03: Carbon-aware scheduling: literature & design ideas, Core paper ✅: Wiesner et al., "Let's Wait Awhile: How Temporal Workload Shifting Can Reduce Carbon Emissions in the Cloud", Middleware '21, pp. 260-272. arXiv:2110.13234. Code + data: https://github.com/dos-group/lets-wait-awhile (+12 more)

### Community 1 - "meter.py"
Cohesion: 0.14
Nodes (4): EnergyMeter, measure_idle(), MeterResult, LinearPowerModel

### Community 2 - "3. Research findings"
Cohesion: 0.08
Nodes (23): 3.1 GB Carbon Intensity API (primary carbon source) ✅, 3.2 NESO Historic generation mix & carbon intensity ✅, 3.3 Electricity Maps ✅ (status) / ⚠ (details), 3.4 Average vs marginal carbon intensity, 3.5 Energy measurement ✅, 3.6 Literature, 3.7 TPC-DS ✅, 3.8 Spark compatibility ✅ (+15 more)

### Community 3 - "eda_carbon.py"
Cohesion: 0.24
Nodes (12): forecast_err(), _hour(), _hours_axis(), _label_ends(), main(), monthly(), neso_check(), night_stats() (+4 more)

### Community 4 - "clean.py"
Cohesion: 0.14
Nodes (7): forecast_error(), _gap_runs(), _grid(), load_national(), load_neso(), load_regional(), regrid()

### Community 5 - "env.py"
Cohesion: 0.11
Nodes (14): Commands, Deliverables, graphify, GreenShift: instructions for AI assistants, Rules, 00: Project context (read this first), Deliverables → where they live, Environment quick-start (+6 more)

### Community 6 - "sensors.py"
Cohesion: 0.13
Nodes (5): BatteryWindows, RaplLinux, RaplWindows, try_battery(), try_rapl()

### Community 7 - "GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)"
Cohesion: 0.12
Nodes (17): 10. Known issues & gotchas, 11. Syllabus mapping, 12. Sources, 1. The assignment, 2. Status at a glance, 4. Decisions log, 5. What's built (file map), 6. Measurements & results so far (+9 more)

### Community 8 - "pandas"
Cohesion: 0.32
Nodes (7): _chunks(), _fmt(), forecast_48h(), _get(), national(), regional(), _tidy()

### Community 9 - "fetch_carbon_data.py"
Cohesion: 0.21
Nodes (4): _date(), main(), _sha256(), main()

### Community 10 - "README.md"
Cohesion: 0.14
Nodes (7): Data card: Electricity Maps (status: optional / pending access), Data card: NESO Historic GB generation mix & carbon intensity, Data card: TPC-DS-derived workload, Data card: GB Carbon Intensity API, Data, GreenShift, Setup (Windows)

### Community 11 - "spark_jobs.py"
Cohesion: 0.21
Nodes (6): Running on Spark 4.2, _delta(), load_jobs(), load_query(), run_job(), _stage_metrics()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)` connect `GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)` to `README.md`, `3. Research findings`?**
  _High betweenness centrality (0.256) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `EnergyMeter` (e.g. with `7.3 Using Hadoop / HDFS / YARN (optional, ties into the syllabus)` and `9. Open questions for the group`) actually correct?**
  _`EnergyMeter` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `00_CONTEXT.md` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Why does `EnergyMeter` connect `meter.py` to `spark_jobs.py`, `sensors.py`, `GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Should `meter.py` be split into smaller, more focused modules?**
  _Cohesion score 0.13846153846153847 - nodes in this community are weakly interconnected._
- **Should `3. Research findings` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `clean.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
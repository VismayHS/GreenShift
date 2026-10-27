# Graph Report - GreenShift  (2026-10-27)

## Corpus Check
- 56 files · ~30,726 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .css 1)

## Summary
- 502 nodes · 892 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6af7e04c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 00_CONTEXT.md
- meter.py
- GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)
- eda_carbon.py
- clean.py
- env.py
- package.json
- CarbonField.tsx
- Story.tsx
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

## God Nodes (most connected - your core abstractions)
1. `Story()` - 23 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 15 edges
4. `Tonight()` - 14 edges
5. `EnergyMeter` - 13 edges
6. `GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)` - 13 edges
7. `react` - 12 edges
8. `CountUp()` - 12 edges
9. `Product` - 12 edges
10. `NightPlan()` - 10 edges

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

## Communities (24 total, 5 thin omitted)

### Community 0 - "00_CONTEXT.md"
Cohesion: 0.06
Nodes (28): Energy, 01: Grid carbon-intensity data sources, 1. GB Carbon Intensity API (primary source), 2. NESO Historic generation mix & carbon intensity (bulk cross-check), 3. Electricity Maps (secondary / optional), 4. Average vs marginal intensity (methodology choice), 5. What we downloaded, 02: Measuring Spark job energy (+20 more)

### Community 1 - "meter.py"
Cohesion: 0.06
Nodes (18): 3.5 Energy measurement ✅, 7.1 What to copy, 7.2 Setup on Linux, 7.3 Using Hadoop / HDFS / YARN (optional, ties into the syllabus), 7.4 Things that are Windows-only (ignore on Linux), 7. Moving to the new system (Linux + Hadoop), 9. Open questions for the group, Step 7: Job catalogue + measurement campaign → `configs/jobs.json`, `scripts/measure_jobs.py`, `results/measurements.csv` (+10 more)

### Community 2 - "GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)"
Cohesion: 0.08
Nodes (26): 10. Known issues & gotchas, 11. Syllabus mapping, 12. Sources, 1. The assignment, 2. Status at a glance, 3.1 GB Carbon Intensity API (primary carbon source) ✅, 3.2 NESO Historic generation mix & carbon intensity ✅, 3.3 Electricity Maps ✅ (status) / ⚠ (details) (+18 more)

### Community 3 - "eda_carbon.py"
Cohesion: 0.24
Nodes (12): forecast_err(), _hour(), _hours_axis(), _label_ends(), main(), monthly(), neso_check(), night_stats() (+4 more)

### Community 4 - "clean.py"
Cohesion: 0.12
Nodes (14): forecast_error(), _gap_runs(), _grid(), load_national(), load_neso(), load_regional(), regrid(), _chunks() (+6 more)

### Community 5 - "env.py"
Cohesion: 0.06
Nodes (22): Commands, Deliverables, graphify, GreenShift: instructions for AI assistants, Rules, Data card: Electricity Maps (status: optional / pending access), Data card: NESO Historic GB generation mix & carbon intensity, Data card: TPC-DS-derived workload (+14 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (46): dependencies, d3-shape@^3.2.0, @fontsource-variable/atkinson-hyperlegible-next@^5.3.0, motion@^14.6.0, react@^19.3.1, react-dom@^19.3.1, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3 (+38 more)

### Community 7 - "CarbonField.tsx"
Cohesion: 0.13
Nodes (22): d3-contour@^4.0.2, d3-geo@^3.1.1, d3-scale@^4.0.2, CarbonField(), NORTH_TO_SOUTH, Props, upsample(), hh() (+14 more)

### Community 8 - "Story.tsx"
Cohesion: 0.15
Nodes (25): ApiNat, ApiReg, Eda, fromRows(), Job, json(), loadEda(), loadEnergy() (+17 more)

### Community 9 - "export_site_data.py"
Cohesion: 0.08
Nodes (16): energy(), forecast(), history(), main(), _num(), regions(), _write(), _date() (+8 more)

### Community 10 - "plan.ts"
Cohesion: 0.14
Nodes (23): Props, Forecast, Slot, baseline(), bestWindow(), clock(), fits(), fmt (+15 more)

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

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Three independent energy signals (all verified working 2026-10-27)` connect `00_CONTEXT.md` to `meter.py`?**
  _High betweenness centrality (0.366) - this node is a cross-community bridge._
- **Should `00_CONTEXT.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `Energy` connect `00_CONTEXT.md` to `Story.tsx`, `plan.ts`?**
  _High betweenness centrality (0.356) - this node is a cross-community bridge._
- **Should `meter.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05656565656565657 - nodes in this community are weakly interconnected._
- **Why does `calibrate()` connect `meter.py` to `00_CONTEXT.md`?**
  _High betweenness centrality (0.297) - this node is a cross-community bridge._
- **Should `GreenShift: complete project handoff (Carbon-Aware Batch Scheduling)` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `clean.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12222222222222222 - nodes in this community are weakly interconnected._
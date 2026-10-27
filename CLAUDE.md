# GreenShift: instructions for AI assistants

Carbon-aware scheduling of nightly Spark batch jobs. Student mini-project for UE24AM343AB3 (Big Data Systems & Responsible AI), Track G: Governance, Compliance and Sustainability.

**Read [docs/HANDOFF.md](docs/HANDOFF.md) before doing anything.** It has the assignment, research findings, decisions (with reasons), what's built, measured results, the Linux/Hadoop setup guide (§7) and the remaining plan (§8). Detailed research is in `notes/`; data cards are in `datacards/`.

## Deliverables

1. Scheduler code
2. Measurement method
3. Savings report: emissions saved vs. added delay, zero missed deadlines

## Commands

```bash
source .venv/bin/activate                     # Linux (Windows: .venv\Scripts\activate)
python scripts/fetch_carbon_data.py --start 2024-01-01 --end 2026-01-01   # resumable, skips existing files
python scripts/generate_tpcds.py --sf 1       # SF1 for dev; SF5/SF10 for measurements
```

`carbonsched.env.spark_session()` builds the SparkSession. Env overrides:
- `CARBONSCHED_SPARK_MASTER=yarn`
- `CARBONSCHED_TPCDS_ROOT=hdfs:///tpcds`

## Rules

- Spark 4.2 needs Java 17/21/25. The `pyspark` version must match any cluster Spark install (`spark-submit --version`).
- Carbon data: the GB Carbon Intensity API (CC BY 4.0, no key) is primary.
  - Decide on `forecast`, account emissions with `actual`. Only the national series has `actual`.
  - Work in UTC internally on a 30-min grid.
- Energy: RAPL is primary (`energy/sensors.py`), with the calibrated linear model as fallback. Always report gross and attributable (minus idle) energy.
- Never disable TLS certificate verification. If a network intercepts HTTPS, change networks; the fetcher resumes.
- Any new dataset needs a data card in `datacards/`: licence, access, provenance and download date.
- Items marked ⚠ in the notes are unverified. Verify them before they go into the report. Never invent citations, numbers or URLs.
- TPC-DS wording: "workload derived from TPC-DS; not comparable with published TPC-DS results".
- Git-ignored, regenerable: `data/tpcds/`, `data/processed/`, the NESO CSV, `.venv/` and `.tools/`. The GB API CSVs in `data/raw/carbon/` are committed.
- Keep `docs/HANDOFF.md` §2 (status) and §8 (plan) up to date as work progresses.
- Match the existing code style: type hints, short docstrings, small modules under `src/carbonsched/`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

# GreenShift

Carbon-aware scheduler that measures Spark job energy and shifts nightly batch jobs to low-carbon
grid hours without missing deadlines.

- **Measure:** per-job energy of TPC-DS-derived Spark jobs via Intel RAPL (Windows Energy Meter / Linux powercap), cross-checked with battery discharge and a calibrated utilisation model
- **Shift:** move flexible jobs into cleaner half-hour windows using GB Carbon Intensity API forecasts (NESO, CC BY 4.0)
- **Report:** emissions saved vs. added delay, with zero missed deadlines

UE24AM343AB3 Mini-project, Track G (Governance, Compliance and Sustainability).

## Quickstart: every number in the report, one command

```bash
python3.12 -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python scripts/run_all.py --skip-measure                    # tests → backtest → audit → report → site data (~70 s)
cd frontend && npm install && npm run dev                   # the website, http://localhost:5173
```

| Output | What it is |
|---|---|
| [report/report.md](report/report.md) | The savings report: method, scheduler, results, limitations, SCI |
| [report/results_tables.md](report/results_tables.md) | Generated tables (savings with 95% CIs, delay, replication, regret) |
| `report/figures/res_*.png` | Generated result figures |
| [report/demo_script.md](report/demo_script.md) | 3-presenter demo plan with Q&A |
| `frontend/` | Website (Exhibit Register design): Summary, Carbon data, Energy, Scheduler, Savings and delay, Paper replication, Plan tonight, Responsible AI |

Without an accepted `results/measurements.csv`, job sizes are **placeholders** and every output says so.
On the RAPL laptop, `python scripts/run_all.py` (no flag) measures first. Live planner: `python scripts/run_scheduler.py --dry-run` (add `--offline` without network).

Start with [docs/HANDOFF.md](docs/HANDOFF.md): full context, research, decisions, status and setup on Linux/Hadoop.

Person 2's implemented measurement, scheduling and verification commands are in
[docs/PERSON2.md](docs/PERSON2.md). Run the completed campaign data through:

```powershell
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest -q
.venv\Scripts\python scripts\run_backtest.py
.venv\Scripts\python scripts\verify_results.py
.venv\Scripts\python scripts\run_scheduler.py --dry-run
```

The simulator exports the shared `results/backtest.parquet` contract plus metadata
and a slot audit trail. It uses attributable RAPL energy when a completed campaign
is present; otherwise it explicitly labels development placeholders. The report, the
website and `scripts/run_all.py` read these outputs (see Quickstart above).

## Setup (Windows)

```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
# Spark 4.2 needs Java 17/21/25: put a JDK 21 in .tools\jdk-21*\ (carbonsched.env finds it)
.venv\Scripts\python scripts\fetch_carbon_data.py --start 2024-01-01 --end 2026-01-01
.venv\Scripts\python scripts\generate_tpcds.py --sf 1
```

## Site (story + Tonight view)

```bash
python scripts/export_site_data.py      # pipeline results -> frontend/public/data/ (also stores a 48 h forecast for offline use)
cd frontend && npx npm@11 install       # npm 10.8 on Ubuntu 24.04 crashes on this tree; npm 11 works
npm run dev                             # or: npm run build && npx vite preview
```

The story page explains the method with our own data; the Tonight view plans the coming 22:00 to 07:00 window from the live Carbon Intensity API forecast, falling back to the stored copy (labelled) when offline. Savings stay marked as pending until the backtest (HANDOFF §8 step 8) exports them.

## Data

| Dataset | Licence | Data card |
|---|---|---|
| GB Carbon Intensity API (NESO) | CC BY 4.0 | [datacards/uk_carbon_intensity_api.md](datacards/uk_carbon_intensity_api.md) |
| NESO historic generation mix | CC BY 4.0 | [datacards/neso_historic_generation_mix.md](datacards/neso_historic_generation_mix.md) |
| TPC-DS-derived workload (DuckDB dsdgen) | TPC EULA / fair use | [datacards/tpcds.md](datacards/tpcds.md) |
| Electricity Maps (optional) | ODbL / non-commercial API | [datacards/electricity_maps.md](datacards/electricity_maps.md) |

Workload derived from TPC-DS; results are not comparable with published TPC-DS results.

Current execution status and remaining measurement acceptance: [Person 2 status](docs/PERSON2_STATUS.md).

## Contributors

- [Sharvesh K (@SharveshK1228)](https://github.com/SharveshK1228) — Person 2:
  Spark workload and measurement tooling, RAPL safeguards, scheduling policies,
  backtest simulation, tests, and live/offline demo commands.

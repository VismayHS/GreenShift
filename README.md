# GreenShift

Carbon-aware scheduler that measures Spark job energy and shifts nightly batch jobs to low-carbon
grid hours without missing deadlines.

- **Measure:** per-job energy of TPC-DS-derived Spark jobs via Intel RAPL (Windows Energy Meter / Linux powercap), cross-checked with battery discharge and a calibrated utilisation model
- **Shift:** move flexible jobs into cleaner half-hour windows using GB Carbon Intensity API forecasts (NESO, CC BY 4.0)
- **Report:** emissions saved vs. added delay, with zero missed deadlines

UE24AM343AB3 Mini-project, Track G (Governance, Compliance and Sustainability).

Start with [docs/HANDOFF.md](docs/HANDOFF.md): full context, research, decisions, status and setup on Linux/Hadoop.

## Setup (Windows)

```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
# Spark 4.2 needs Java 17/21/25: put a JDK 21 in .tools\jdk-21*\ (carbonsched.env finds it)
.venv\Scripts\python scripts\fetch_carbon_data.py --start 2024-01-01 --end 2026-01-01
.venv\Scripts\python scripts\generate_tpcds.py --sf 1
```

## Data

| Dataset | Licence | Data card |
|---|---|---|
| GB Carbon Intensity API (NESO) | CC BY 4.0 | [datacards/uk_carbon_intensity_api.md](datacards/uk_carbon_intensity_api.md) |
| NESO historic generation mix | CC BY 4.0 | [datacards/neso_historic_generation_mix.md](datacards/neso_historic_generation_mix.md) |
| TPC-DS-derived workload (DuckDB dsdgen) | TPC EULA / fair use | [datacards/tpcds.md](datacards/tpcds.md) |
| Electricity Maps (optional) | ODbL / non-commercial API | [datacards/electricity_maps.md](datacards/electricity_maps.md) |

Workload derived from TPC-DS; results are not comparable with published TPC-DS results.

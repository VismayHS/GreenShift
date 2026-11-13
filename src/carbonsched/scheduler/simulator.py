"""Deterministic backtest with the Person 2/3 parquet output contract."""
from __future__ import annotations

from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from carbonsched import PROJECT_ROOT
from .forecast import build_signal
from .models import Job, SLOT, night_window, validate
from .policies import schedule, InfeasibleSchedule
from .sizing import make_jobs

COLUMNS = [
    "night", "scenario", "region", "policy", "forecast_mode", "seed", "window_h",
    "capacity_k", "job", "release_utc", "deadline_utc", "start_utc", "end_utc",
    "n_slots", "interrupted", "energy_kwh", "emissions_g", "baseline_emissions_g",
    "baseline_end_utc", "delay_min", "deadline_met",
]
KEY = ["night", "scenario", "region", "policy", "forecast_mode", "seed", "window_h", "capacity_k", "job"]


def _git_commit() -> str | None:
    """Commit the backtest was run from; None outside a git checkout (e.g. a zip copy)."""
    try:
        return subprocess.check_output(["git","rev-parse","HEAD"],cwd=PROJECT_ROOT,text=True,
                                       stderr=subprocess.DEVNULL).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def scenarios(night: date, sizes, config):
    release, deadline = night_window(night)
    yield "nightly", float("nan"), make_jobs(sizes, release, deadline), release, deadline


def run_backtest(data: pd.DataFrame, sizes: list[dict], config: dict,
                 size_meta: dict, scenario_factory=None) -> tuple[pd.DataFrame, dict, pd.DataFrame]:
    scenario_factory = scenario_factory or scenarios
    records, audits, skipped, used = [], [], [], []
    substitutions = missing = unresolved = 0
    modes = [(mode, seed) for mode in config["forecast_modes"]
             for seed in (config["seeds"] if mode == "noisy" else [0])]
    synthetic = {
        (mode,seed): pd.Series(build_signal(data,data.index,mode,data.index[0],seed).values,index=data.index)
        for mode,seed in modes if mode != "api"
    }
    for day in pd.date_range(config["start"], config["end"], inclusive="left", freq="D"):
        night = day.date()
        for scenario, window_h, jobs, origin, deadline in scenario_factory(night,sizes,config):
            slots = pd.date_range(origin,deadline,freq="30min",inclusive="left")
            actual = data.actual.reindex(slots).to_numpy(dtype=float)
            scope={"night": str(night),"scenario": scenario,"window_h": None if np.isnan(window_h) else window_h}
            if not np.isfinite(actual).all():
                outside = not slots.isin(data.index).all()
                skipped.append({**scope,"reason":"outside_data_range" if outside else "actual_gap",
                                "missing_actual_slots": int((~np.isfinite(actual)).sum())})
                continue
            signals={}
            for mode,seed in modes:
                if mode=="api":
                    signal=build_signal(data,slots,mode,origin,seed)
                    signals[(mode,seed)]=signal.values
                    substitutions+=signal.substitutions
                    missing+=signal.missing_slots
                    unresolved+=signal.unresolved
                else:
                    signals[(mode,seed)]=synthetic[(mode,seed)].reindex(slots).to_numpy()
            for k in (config["capacity_k"] if scenario=="nightly" else [1]):
                try:
                    base=schedule("P0",jobs,actual,origin,k)
                except InfeasibleSchedule as error:
                    skipped.append({**scope,"capacity_k": k,"reason":"infeasible_workload","detail":str(error)})
                    continue
                used.append({**scope,"capacity_k": k})
                baselines={p.job.name:p for p in base}
                policies=config["policies"] if scenario=="nightly" else ["P0","P2"]
                for (mode,seed), signal in signals.items():
                    for policy in policies:
                        plans=schedule(policy,jobs,signal,origin,k)
                        validate(plans,jobs,len(slots),k)
                        for plan in plans:
                            b=baselines[plan.job.name]
                            row=dict(
                                night=night, scenario=scenario, region="national", policy=policy,
                                forecast_mode=mode, seed=seed, window_h=window_h, capacity_k=k,
                                job=plan.job.name, release_utc=plan.job.release, deadline_utc=plan.job.deadline,
                                start_utc=plan.start, end_utc=plan.end, n_slots=len(plan.slots),
                                interrupted=plan.interrupted, energy_kwh=plan.job.energy_kwh,
                                emissions_g=plan.emissions(actual), baseline_emissions_g=b.emissions(actual),
                                baseline_end_utc=b.end, delay_min=(plan.end-b.end).total_seconds()/60,
                                deadline_met=plan.end<=plan.job.deadline,
                            )
                            records.append(row)
                            audits.append({"row_id":len(records)-1,"grid_start_utc":origin,
                                           "slots":list(plan.slots),"baseline_slots":list(b.slots)})
    frame=pd.DataFrame.from_records(records,columns=COLUMNS)
    meta={
        "schema_version":1, "run_date_utc":datetime.now(timezone.utc).isoformat(),
        "git_commit":_git_commit(),
        "SCALE":size_meta.get("scale"), "PUE":size_meta["pue"], "job_sizing":size_meta,
        "config":config, "resolved_jobs":sizes, "nights_used":used, "nights_skipped":skipped,
        "nights_used_count":len({r["night"] for r in used}),
        "missing_forecast_slot_count":missing, "forecast_substitutions":substitutions,
        "unresolved_forecast_slots":unresolved, "row_count":len(frame),
        "forecast_counts_scope":"unique scenario/date/window; not repeated by policy, seed or capacity",
        "energy_assumption":"uniform energy across occupied slots; conserved under shifting",
        "accounting":"national actual CI; short interior gaps may be interpolated by carbon.clean",
        "forecast_provenance_limitation":"historical API files have no issue timestamps/vintages; no claim of publication-time reconstruction",
        "api_fallback":"raw completed actual period 24h earlier; if still missing, P0 for the whole window",
        "oracle_limitation":"perfect-information benchmark; heuristic multi-job policies are not a proven global optimum",
        "night_count_convention":"731 candidate dates; boundary nights and actual outages are reported as skips",
        "replication":{
            "energy":"1 kWh normalization, not a measurement or fleet estimate",
            "job":"wiesner_s1", "duration_minutes":30, "baseline":"01:00 Europe/London",
            "window":"candidate START times within +/- window_h; deadline includes the final 30-minute run",
            "dst":"first 01:00 on autumn fold; nonexistent spring 01:00 normalizes to 02:00 BST",
            "comparison":"2024-25 data; not a reproduction of the paper's 2020 numerical results"
        },
        "noise":"actual + independent Gaussian noise, sigma=0.05*annual mean actual; no clipping; seeds 0..9",
        "invariants_checked":"every emitted plan: exact slots, capacity, release, deadline, fixed job energy",
    }
    return frame,meta,pd.DataFrame(audits)


def write_outputs(frame, meta, audit, output: Path):
    output.mkdir(parents=True,exist_ok=True)
    if frame.empty:
        raise ValueError("no backtest rows; inspect date range and workload feasibility")
    table=pa.Table.from_pandas(frame[COLUMNS],preserve_index=False)
    # Explicit interchange types make the contract stable across pandas versions.
    table=table.set_column(0,"night",table["night"].cast(pa.date32()))
    for name in ["release_utc","deadline_utc","start_utc","end_utc","baseline_end_utc"]:
        index=table.schema.get_field_index(name)
        table=table.set_column(index,name,table[name].cast(pa.timestamp("us",tz="UTC")))
    path=output/"backtest.parquet"
    pq.write_table(table,path,compression="zstd")
    audit.to_parquet(output/"backtest_slots.parquet",index=False,compression="zstd")
    meta["backtest_sha256"]=hashlib.sha256(path.read_bytes()).hexdigest()
    (output/"backtest_meta.json").write_text(json.dumps(meta,indent=2,allow_nan=False),encoding="utf-8")

"""Live planning or immediate measured demo; never sleeps until a scheduled start."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys

import pandas as pd

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR
from carbonsched.scheduler.demo import fetch_forecast, plan_demo, score_measured_interval
from carbonsched.scheduler.sizing import load_sizes


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run",action="store_true",help="plan only (also the default)")
    mode.add_argument("--now",action="store_true",help="measure one real job immediately")
    parser.add_argument("--job",default="daily_sales_report")
    parser.add_argument("--offline",action="store_true")
    parser.add_argument("--at",help="ISO date for a labelled historical dry-run replay")
    parser.add_argument("--capacity",type=int,default=1)
    parser.add_argument("--cores",default="4")
    parser.add_argument("--driver-memory",default="8g")
    parser.add_argument("--output",type=Path,default=RESULTS_DIR/"plans")
    args=parser.parse_args()
    if args.now and args.at:
        parser.error("--now cannot be combined with historical replay")
    config=json.loads((PROJECT_ROOT/"configs/scheduler.json").read_text())
    sizes,sizing=load_sizes(PROJECT_ROOT/"configs/jobs.json",RESULTS_DIR/"measurements.csv",config)
    frame,provenance=fetch_forecast(PROJECT_ROOT/"frontend/public/data/forecast_fallback.json",args.offline or args.at is not None)
    now=pd.Timestamp(args.at).to_pydatetime() if args.at else datetime.now(timezone.utc)
    if now.tzinfo is None:
        parser.error("--at must include a timezone")
    replay=bool(args.at)
    # Offline copies expire. Rehearse the stored date visibly, never relabel it as tonight.
    if provenance["source"]=="stored_fallback" and not args.now and not args.at:
        now=pd.Timestamp(provenance["fetched_at_utc"]).to_pydatetime()
        replay=True
    plan=plan_demo(frame,provenance,sizes,sizing,now,args.capacity)
    plan["historical_replay"]=replay
    plan["created_at_utc"]=datetime.now(timezone.utc).isoformat()
    if replay:
        print("HISTORICAL REPLAY of stored forecast; this is not a current-night forecast.")
    print(f"Forecast: {provenance['source']}; fetched {provenance['fetched_at_utc']}")
    if provenance["source"]=="stored_fallback":
        print(f"FALLBACK: {provenance['fallback_reason']}")
    print(f"CI at 22:00 UK: {plan['ci_at_22_local']} gCO2/kWh")
    for row in plan["jobs"]:
        print(f"{row['job']}: {row['start_utc']} -> {row['end_utc']}; forecast {row['forecast_ci']}, cron {row['baseline_ci']} g/kWh; expected saving {row['expected_saving_pct']}%. {row['reason']}")
    args.output.mkdir(parents=True,exist_ok=True)
    path=args.output/f"plan_{plan['night']}.json"
    if args.now:
        from carbonsched.energy.preflight import machine_info, require_rapl
        from carbonsched.env import spark_session
        from carbonsched.workloads.spark_jobs import register_tpcds, run_job
        from carbonsched.carbon.uk_api import national
        import requests
        info=machine_info()
        require_rapl(info)
        catalogue=json.loads((PROJECT_ROOT/"configs/jobs.json").read_text())
        job=next((j for j in catalogue["jobs"] if j["name"]==args.job),None)
        if job is None:
            parser.error(f"unknown job {args.job}")
        metadata=RESULTS_DIR/"measurements_meta.json"
        campaign=json.loads(metadata.read_text()) if metadata.exists() else {}
        idle=(campaign.get("idle_used_w") if campaign.get("status")=="complete"
              and campaign.get("cpu")==info["cpu"] else None)
        spark=spark_session("greenshift-live-demo",cores=args.cores,driver_memory=args.driver_memory)
        try:
            register_tpcds(spark,f"sf{catalogue.get('scale_factor',5)}")
            record=run_job(spark,job["name"],job["queries"],idle_w=idle,repeats=job.get("repeats",1))
        finally:
            spark.stop()
        if record["energy_source"]!="rapl":
            raise RuntimeError("RAPL lost during demo; refusing to label estimate as measured")
        start=datetime.fromtimestamp(record["start_unix"],timezone.utc)
        end=start+timedelta(seconds=record["duration_s"])
        energy=record["attributable_kwh"] if idle is not None else record["gross_kwh"]
        actual={"status":"pending_actual","emissions_g":None}
        if not args.offline:
            try:
                observations=national(start-timedelta(minutes=30),end+timedelta(minutes=30),pause=0)
                actual=score_measured_interval(start,end,energy,observations)
            except (requests.RequestException,KeyError,ValueError) as error:
                actual["reason"]=str(error)
        selected=next(r for r in plan["jobs"] if r["job"]==job["name"])
        current=frame.set_index("from")["forecast"].get(pd.Timestamp(start).floor("30min"))
        measured={"run":record,"machine":info,"actual":actual,
                  "energy_basis":"attributable" if idle is not None else "gross (idle unavailable)",
                  "current_forecast_g":float(current)*energy if pd.notna(current) else None,
                  "planned_forecast_g":selected["forecast_ci"]*energy if selected["forecast_ci"] is not None else None,
                  "comparison":"same measured laptop energy at current/planned forecast CI; counterfactual, not actual avoided emissions"}
        plan["measured_demo"]=measured
        print(json.dumps(measured,indent=2))
        if actual["status"]=="pending_actual":
            print("Actual CI is not available yet: actual emissions pending. Forecast grams are estimates.")
    path.write_text(json.dumps(plan,indent=2,allow_nan=False),encoding="utf-8")
    print(f"Saved {path}")


if __name__=="__main__":
    main()

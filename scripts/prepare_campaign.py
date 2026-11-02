"""Calibrate batch repetitions from warmed timings before a fresh campaign."""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR
from carbonsched.env import spark_session
from carbonsched.workloads.spark_jobs import register_tpcds, run_job


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sf",type=int,default=1)
    parser.add_argument("--cores",default="4")
    parser.add_argument("--driver-memory",default="8g")
    args=parser.parse_args()
    path=PROJECT_ROOT/"configs/jobs.json"
    catalogue=json.loads(path.read_text())
    targets={"daily_sales_report":45,"customer_analytics":55,"inventory_supply_chain":65,
             "cross_channel_promo":100,"returns_audit":55}
    output={"date_utc":datetime.now(timezone.utc).isoformat(),"sf":args.sf,
            "cores":args.cores,"driver_memory":args.driver_memory,
            "purpose":"pilot only; excluded from measurement statistics","jobs":[]}
    spark=spark_session("prepare-campaign",cores=args.cores,driver_memory=args.driver_memory)
    try:
        register_tpcds(spark,f"sf{args.sf}")
        for job in catalogue["jobs"]:
            print(f"Pilot {job['name']}",flush=True)
            probes=[run_job(spark,job["name"],job["queries"],repeats=1)["duration_s"] for _ in range(2)]
            repeats=max(1,math.ceil(targets[job["name"]]/min(probes)))
            duration=0
            trials=[]
            for attempt in range(3):
                record=run_job(spark,job["name"],job["queries"],repeats=repeats)
                duration=record["duration_s"]
                trials.append({"repeats":repeats,"duration_s":duration})
                if duration>=40:
                    break
                repeats=math.ceil(repeats*max(1.25,targets[job["name"]]/duration))
            if duration<40:
                raise RuntimeError(f"Cannot establish adequate batch length for {job['name']}")
            job["repeats"]=repeats
            job["pilot_seconds"]=duration
            output["jobs"].append({"job":job["name"],"single_batch_probes_s":probes,"trials":trials})
            print(f"Selected {repeats} repeats: {duration:.1f}s",flush=True)
        catalogue.update(scale_factor=args.sf,status="pilot calibrated; final campaign quality gate required",
                         scale_factor_reason="SF5 query timing succeeded, but two sustained SF5 campaigns reported Java heap exhaustion; SF1 fallback permitted by TEAM_PLAN R0c.")
        path.write_text(json.dumps(catalogue,indent=2)+"\n",encoding="utf-8")
        (RESULTS_DIR/"campaign_pilot.json").write_text(json.dumps(output,indent=2),encoding="utf-8")
    finally:
        spark.stop()


if __name__=="__main__":
    main()

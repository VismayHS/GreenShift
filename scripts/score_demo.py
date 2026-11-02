"""Refresh a saved measured demo with actual CI after NESO publishes the periods."""
import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from carbonsched.carbon.uk_api import national
from carbonsched.scheduler.demo import score_measured_interval


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan",type=Path)
    args=parser.parse_args()
    plan=json.loads(args.plan.read_text(encoding="utf-8"))
    demo=plan["measured_demo"]
    run=demo["run"]
    start=datetime.fromtimestamp(run["start_unix"],timezone.utc)
    end=start+timedelta(seconds=run["duration_s"])
    energy=run["attributable_kwh"] if demo["energy_basis"]=="attributable" else run["gross_kwh"]
    data=national(start-timedelta(minutes=30),end+timedelta(minutes=30),pause=0)
    demo["actual"]=score_measured_interval(start,end,energy,data)
    demo["actual_checked_at_utc"]=datetime.now(timezone.utc).isoformat()
    args.plan.write_text(json.dumps(plan,indent=2,allow_nan=False),encoding="utf-8")
    print(json.dumps(demo["actual"],indent=2))
    if demo["actual"]["status"]!="actual":
        print("Actual periods are still unpublished; rerun after the settlement period completes.")


if __name__=="__main__":
    main()

"""Run nightly scheduling and optional Wiesner replication on committed data."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from carbonsched import PROJECT_ROOT, RESULTS_DIR
from carbonsched.carbon.clean import load_national, CARBON_DIR
from carbonsched.scheduler.sizing import load_sizes
from carbonsched.scheduler.simulator import run_backtest, write_outputs


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config",type=Path,default=PROJECT_ROOT/"configs/scheduler.json")
    parser.add_argument("--output",type=Path,default=RESULTS_DIR)
    parser.add_argument("--start")
    parser.add_argument("--end")
    parser.add_argument("--nightly-only",action="store_true")
    args=parser.parse_args()
    config=json.loads(args.config.read_text())
    if args.start: config["start"]=args.start
    if args.end: config["end"]=args.end
    sizes,sizing=load_sizes(PROJECT_ROOT/"configs/jobs.json",RESULTS_DIR/"measurements.csv",config)
    data=load_national()
    factory=None
    if not args.nightly_only:
        from carbonsched.scheduler.replication import all_scenarios
        factory=all_scenarios
    frame,meta,audit=run_backtest(data,sizes,config,sizing,factory)
    source=CARBON_DIR/"gb_national_2024-01-01_2026-01-01.csv"
    meta["carbon_sha256"]=hashlib.sha256(source.read_bytes()).hexdigest()
    write_outputs(frame,meta,audit,args.output)
    print(f"{len(frame):,} rows; {meta['nights_used_count']} dates; sizing={sizing['source']}")
    print(f"Deadline misses: {(~frame.deadline_met).sum()}; output: {args.output}")
    print(frame.groupby(["scenario","policy","forecast_mode"])[["emissions_g","baseline_emissions_g"]].sum().to_string())


if __name__=="__main__":
    main()

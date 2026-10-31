"""Verify every exported row, including capacity and actual-intensity accounting."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from carbonsched import RESULTS_DIR
from carbonsched.carbon.clean import load_national
from carbonsched.scheduler.verification import verify_outputs


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,default=RESULTS_DIR)
    args=parser.parse_args()
    result=verify_outputs(args.output,load_national())
    (args.output/"verification.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps(result,indent=2))


if __name__=="__main__":
    main()

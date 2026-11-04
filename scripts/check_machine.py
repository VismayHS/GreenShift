"""Save R0a machine evidence before generating workloads or measuring jobs."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from carbonsched import RESULTS_DIR
from carbonsched.energy.preflight import machine_info, require_rapl


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--room-conditions", default="unknown; not supplied")
    args = parser.parse_args()
    info = machine_info(args.room_conditions)
    RESULTS_DIR.mkdir(exist_ok=True)
    (RESULTS_DIR / "machine_check.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    print(json.dumps(info, indent=2))
    require_rapl(info)


if __name__ == "__main__":
    main()

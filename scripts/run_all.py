"""One command from committed data to every number in the report and on the site (TEAM_PLAN R16).

Steps, in order:
  1. measure      scripts/measure_jobs.py on the RAPL machine          (skipped with --skip-measure)
  2. tests        pytest, summary saved to results/pytest_summary.json  (skipped with --skip-tests)
  3. backtest     scripts/run_backtest.py                               (skipped with --reuse-backtest)
  4. verify       scripts/verify_results.py, the independent audit
  5. report       scripts/build_report.py -> report/results_tables.md, report/figures/res_*.png
  6. site data    scripts/export_site_data.py (+ the 48 h forecast unless --offline)
  7. demo plan    scripts/run_scheduler.py --dry-run --offline, the reference the site checks itself against

Where results go: with an accepted results/measurements.csv the backtest is written to results/
(measured). Without one it goes to results/validation_placeholder/ and every output says PLACEHOLDER.

Usage:
  python scripts/run_all.py --skip-measure            # Mac or Windows, from a fresh clone
  python scripts/run_all.py --skip-measure --offline  # no network
  python scripts/run_all.py                           # Windows RAPL laptop: measure first
"""

from __future__ import annotations

import argparse
import json
import platform
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "results"
PY = sys.executable


def step(name: str, args: list[str], allow_fail: bool = False) -> float:
    print(f"\n=== {name}: {' '.join(Path(a).name if a.endswith('.py') else a for a in args)}", flush=True)
    t = time.time()
    code = subprocess.call([PY, *args], cwd=ROOT)
    if code and not allow_fail:
        sys.exit(f"step '{name}' failed with exit code {code}; stopping so no stale numbers are published")
    print(f"--- {name} done in {time.time() - t:.0f} s", flush=True)
    return time.time() - t


def tests() -> None:
    xml = RESULTS / ".pytest_junit.xml"
    t = time.time()
    print("\n=== tests: pytest -q", flush=True)
    code = subprocess.call([PY, "-m", "pytest", "-q", "-p", "no:warnings", f"--junitxml={xml}"], cwd=ROOT)
    suite = ET.parse(xml).getroot()
    suite = suite if suite.tag == "testsuite" else suite.find("testsuite")
    total, failures, errors, skipped = (int(suite.get(k, 0)) for k in ("tests", "failures", "errors", "skipped"))
    summary = {"passed": total - failures - errors - skipped, "failed": failures + errors, "skipped": skipped,
               "total": total, "platform": f"{platform.system()} {platform.machine()}",
               "python": platform.python_version(), "duration_s": round(time.time() - t, 1),
               "ran_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")}
    (RESULTS / "pytest_summary.json").write_text(json.dumps(summary, indent=2))
    xml.unlink(missing_ok=True)
    if code:
        sys.exit(f"{summary['failed']} test(s) failed; fix them before publishing results")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--skip-measure", action="store_true", help="use the committed results/measurements.csv (if any)")
    ap.add_argument("--skip-tests", action="store_true")
    ap.add_argument("--reuse-backtest", action="store_true", help="keep the existing backtest files (saves ~minutes)")
    ap.add_argument("--offline", action="store_true", help="do not refresh the stored 48 h forecast")
    args = ap.parse_args()
    start = time.time()

    if not args.skip_measure:
        step("measure", ["scripts/check_machine.py"])
        step("measure", ["scripts/measure_jobs.py", "--sf", "1", "--cores", "4", "--driver-memory", "8g", "--conditions-confirmed"])
    if not args.skip_tests:
        tests()

    measured = (RESULTS / "measurements.csv").exists()
    out = RESULTS if measured else RESULTS / "validation_placeholder"
    print(f"\nJob sizes: {'MEASURED (results/measurements.csv)' if measured else 'PLACEHOLDER (no accepted measurements.csv)'}")
    if not (args.reuse_backtest and (out / "backtest.parquet").exists()):
        step("backtest", ["scripts/run_backtest.py", "--output", str(out)])
        step("verify", ["scripts/verify_results.py", "--output", str(out)])
    step("report", ["scripts/build_report.py", "--backtest", str(out)])

    # Refresh the stored forecast first, plan it with the Python reference, then export that plan.
    step("site data", ["scripts/export_site_data.py", *(["--offline"] if args.offline else [])], allow_fail=True)
    for old in (RESULTS / "plans").glob("plan_*.json"):
        old.unlink()
    step("demo plan", ["scripts/run_scheduler.py", "--dry-run", "--offline"])
    step("site data", ["scripts/export_site_data.py", "--offline"])

    s = json.loads((RESULTS / "report_summary.json").read_text())
    print(f"\n{'=' * 72}\nGreenShift results ({s['status'].upper()} job sizes), {s['nights_nightly']} nights, "
          f"deadline misses {s['deadline_misses_total']}")
    print(f"{'k':>2} {'policy':<6} {'forecast':<8} {'% saved':>8} {'95% CI':>17} {'median delay':>13}")
    for r in s["table1"]:
        print(f"{r['capacity_k']:>2} {r['policy']:<6} {r['forecast_mode']:<8} {r['saved_pct']:>8.2f} "
              f"{'[' + format(r['ci_low'], '.2f') + ', ' + format(r['ci_high'], '.2f') + ']':>17} {r['delay_median_min']:>10.0f} min")
    w = {(r["window_h"], r["forecast_mode"]): r["saved_pct"] for r in s["table2"]}
    if w:
        print(f"Replication ±2 h noisy {w[(2.0, 'noisy')]:.2f}% (paper 4.3%), ±8 h noisy {w[(8.0, 'noisy')]:.2f}% (paper 7.4%)")
    print("\nOutputs:")
    for p in [out / "backtest.parquet", out / "verification.json", RESULTS / "report_summary.json",
              ROOT / "report/results_tables.md", ROOT / "report/figures", ROOT / "frontend/public/data",
              *sorted((RESULTS / "plans").glob("plan_*.json"))]:
        print(f"  {p.relative_to(ROOT)}")
    print(f"\nDone in {time.time() - start:.0f} s. Site: cd frontend && npm install && npm run dev")


if __name__ == "__main__":
    main()

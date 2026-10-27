"""Download GB carbon-intensity history to data/raw/carbon/.

Usage:
    python scripts/fetch_carbon_data.py --start 2024-01-01 --end 2026-01-01
    python scripts/fetch_carbon_data.py --regions 1 13 7 --start 2025-01-01 --end 2026-01-01
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from carbonsched import RAW_DIR  # noqa: E402
from carbonsched.carbon import uk_api  # noqa: E402

NESO_HISTORIC_MIX = (
    "https://api.neso.energy/dataset/88313ae5-94e4-4ddc-a790-593554d8c6b9/resource/"
    "f93d1835-75bc-43e5-84ad-12472b180a98/download/df_fuel_ckan.csv"
)


def _date(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2024-01-01")
    ap.add_argument("--end", default="2026-01-01")
    ap.add_argument("--regions", type=int, nargs="*", default=list(range(1, 15)),
                    help="region ids (1-14 are the DNO regions; 15-17 are nations)")
    ap.add_argument("--skip-national", action="store_true")
    ap.add_argument("--skip-neso", action="store_true")
    args = ap.parse_args()

    out = RAW_DIR / "carbon"
    out.mkdir(parents=True, exist_ok=True)
    start, end = _date(args.start), _date(args.end)
    tag = f"{args.start}_{args.end}"

    # Resumable: existing files are kept, and one failed region doesn't abort the rest.
    failed = []
    p = out / f"gb_national_{tag}.csv"
    if not args.skip_national and not p.exists():
        df = uk_api.national(start, end)
        df.to_csv(p, index=False)
        print(f"national: {len(df)} rows -> {p.name}  sha256={_sha256(p)[:12]}", flush=True)

    for rid in args.regions:
        p = out / f"gb_region{rid:02d}_{tag}.csv"
        if p.exists():
            print(f"region {rid}: exists, skipped", flush=True)
            continue
        try:
            df = uk_api.regional(rid, start, end)
        except requests.RequestException as e:
            failed.append(rid)
            print(f"region {rid}: FAILED ({type(e).__name__}); rerun to resume", flush=True)
            continue
        df.to_csv(p, index=False)
        print(f"region {rid} ({uk_api.REGIONS[rid]}): {len(df)} rows -> {p.name}", flush=True)

    if failed:
        print(f"failed regions: {failed}")

    if not args.skip_neso and not (out / "neso_historic_generation_mix.csv").exists():
        p = out / "neso_historic_generation_mix.csv"
        with requests.get(NESO_HISTORIC_MIX, stream=True, timeout=120) as r:
            r.raise_for_status()
            with open(p, "wb") as f:
                for chunk in r.iter_content(1 << 20):
                    f.write(chunk)
        print(f"NESO historic mix -> {p.name}  sha256={_sha256(p)[:12]}")


if __name__ == "__main__":
    main()

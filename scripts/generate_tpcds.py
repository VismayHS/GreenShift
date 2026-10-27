"""Generate TPC-DS data as Parquet with DuckDB's tpcds extension (dsdgen port).

No C toolchain needed. Each of the 24 tables is written to
data/tpcds/sf{SF}/{table}.parquet, and the 99 query templates (qualification
substitutions) to data/tpcds/queries/q{NN}.sql.

Usage:
    python scripts/generate_tpcds.py --sf 1
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from carbonsched import DATA_DIR  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sf", type=float, default=1.0)
    args = ap.parse_args()

    sf_tag = f"sf{args.sf:g}"
    out = DATA_DIR / "tpcds" / sf_tag
    out.mkdir(parents=True, exist_ok=True)
    qdir = DATA_DIR / "tpcds" / "queries"
    qdir.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect()
    con.execute("INSTALL tpcds; LOAD tpcds;")
    t0 = time.time()
    con.execute(f"CALL dsdgen(sf={args.sf})")
    print(f"dsdgen sf={args.sf}: {time.time() - t0:.1f}s")

    manifest = {"scale_factor": args.sf, "duckdb_version": duckdb.__version__, "tables": {}}
    for (table,) in con.execute("SHOW TABLES").fetchall():
        p = out / f"{table}.parquet"
        con.execute(f"COPY {table} TO '{p.as_posix()}' (FORMAT parquet, COMPRESSION zstd)")
        rows = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        manifest["tables"][table] = {"rows": rows, "bytes": p.stat().st_size}
        print(f"  {table:<24} {rows:>12,} rows  {p.stat().st_size / 1e6:8.1f} MB")

    for nr, query in con.execute("SELECT query_nr, query FROM tpcds_queries()").fetchall():
        (qdir / f"q{nr:02d}.sql").write_text(query, encoding="utf-8")

    (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    total = sum(t["bytes"] for t in manifest["tables"].values())
    print(f"total {total / 1e9:.2f} GB parquet -> {out}")


if __name__ == "__main__":
    main()

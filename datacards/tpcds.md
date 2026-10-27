# Data card: TPC-DS-derived workload

| Field | Value |
|---|---|
| Source | TPC Benchmark DS (spec v4.0.0), Transaction Processing Performance Council, https://www.tpc.org |
| Generator used | DuckDB 2.0.0 `tpcds` extension (`CALL dsdgen(sf)`, `tpcds_queries()`), a port of the TPC-DS v4 tools |
| Licence | TPC EULA + TPC Fair Use Policy. Results are **not** audited TPC-DS results and must not be presented as such |
| Data | Synthetic retail data warehouse: 24 tables (7 fact, 17 dimension). No real people, so no re-identification risk (names/addresses are generated) |
| Scale factors | SF1 (0.28 GB parquet; store_sales 2,880,404 rows) for development. SF5/SF10 for the measurements |
| Format | Parquet, zstd, one file per table (`data/tpcds/sf{N}/`), manifest.json with row counts and sizes |
| Queries | 99 qualification queries (`data/tpcds/queries/qNN.sql`). Double-quoted aliases converted to backticks for Spark SQL |
| Use in project | Representative nightly ETL/BI Spark jobs whose energy we measure |
| Required wording | "Workload derived from TPC-DS; not comparable with published TPC-DS results." |

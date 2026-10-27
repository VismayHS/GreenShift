# Data card: NESO Historic GB generation mix & carbon intensity

| Field | Value |
|---|---|
| Publisher | NESO Data Portal |
| URL | https://www.neso.energy/data-portal/historic-generation-mix |
| Licence | CC BY 4.0 according to the dataset page (each NESO dataset is licensed individually, so re-confirm) |
| Access | Public CSV download, no account |
| Coverage | 2009-01-01 → present, GB, half-hourly |
| Variables | `DATETIME` (UTC), generation by fuel (MW and %), `CARBON_INTENSITY` (gCO2/kWh), low/zero-carbon, renewable, fossil aggregates |
| Personal data | None |
| Known issues | Values revised during cleansing. Some third-party commentary questions the aggregate % columns (storage/solar netting) |
| Use in project | Cross-check of the API `actual` series, and a long-run trend of shifting potential |
| Provenance | File SHA-256 recorded at download (`scripts/fetch_carbon_data.py` output) |

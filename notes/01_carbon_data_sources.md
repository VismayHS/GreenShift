# 01: Grid carbon-intensity data sources

Researched 2026-10-27. Re-check licences before submission because terms change.

## 1. GB Carbon Intensity API (primary source)

| Item | Finding |
|---|---|
| Owner | NESO (National Energy System Operator, formerly National Grid ESO), with Environmental Defense Fund Europe, Oxford University, WWF |
| Base URL | `https://api.carbonintensity.org.uk` |
| Docs | https://carbon-intensity.github.io/api-definitions/ |
| Auth | **None**. The docs say every operation "does not require authentication" |
| Licence | **CC BY 4.0**. Attribute "Carbon Intensity API, NESO" |
| Units / grain | gCO2/kWh, **half-hourly** (48 settlement periods/day), all times **UTC** |
| Coverage | National GB, 14 DNO regions (ids 1-14), 3 nations (15 England, 16 Scotland, 17 Wales) |
| Range limit | National `/intensity/{from}/{to}`: **max 14 days** per call (the stats endpoint allows 30 days) |
| Forecast horizon | `fw24h`, `fw48h`. The NESO methodology says 96+ h national, 48 h regional |

**Fields.** National data has `forecast`, `actual` and `index` (very low / low / moderate / high / very high). Regional data has a `forecast` plus a `generationmix` (% by fuel: biomass, coal, imports, gas, nuclear, other, hydro, solar, wind). **Regional history has no `actual` field.** The regional series is a modelled estimate.

**Gotchas we hit (tested 2026-10-27):**
- Some national records have no `forecast` key (26 of 673 rows in 1-14 Jan 2025). Parse with `.get()` and fill the gaps.
- Regional pulls return slightly fewer rows than expected (656 vs 673 for 14 days). Reindex to a full 30-min grid and interpolate short gaps.
- `{from}` is exclusive-ish: the first record returned starts 30 min *before* `from`. Chunk boundaries overlap, so de-duplicate on `from`.
- `/intensity/factors` gives the fuel emission factors (gCO2/kWh) the API uses, e.g. Coal 937, CCGT 394, OCGT 651, Biomass 120, Nuclear/Wind/Solar 0.

**Index thresholds** (very low … very high): I could not find the numeric cut-offs in the API docs. They are in NESO's methodology PDF (`neso-ci-national-methodology_v2`). **TODO:** read the PDF and quote the bands if we use the index-threshold policy.

**Methodology:** the forecast covers large metered power stations, interconnector imports, and transmission/distribution losses, plus embedded wind and solar. Emission factors come from DUKES. The regional model follows DNO boundaries (NESO regional methodology v2, May 2024). These are **average (attributional)** intensities, not marginal.

Implementation: [src/carbonsched/carbon/uk_api.py](../src/carbonsched/carbon/uk_api.py), downloader [scripts/fetch_carbon_data.py](../scripts/fetch_carbon_data.py).

## 2. NESO Historic generation mix & carbon intensity (bulk cross-check)

- Page: https://www.neso.energy/data-portal/historic-generation-mix
- CSV: `https://api.neso.energy/dataset/88313ae5-94e4-4ddc-a790-593554d8c6b9/resource/f93d1835-75bc-43e5-84ad-12472b180a98/download/df_fuel_ckan.csv`
- Licence: the dataset page lists **CC BY 4.0**. The portal says each dataset is licensed individually, so confirm on the page.
- 2009 onwards, half-hourly (inferred from timestamps), with columns `DATETIME`, per-fuel MW and %, and `CARBON_INTENSITY`.
- Caveat: NESO says values change as data are cleansed. Record the download date and SHA-256 (the downloader prints it).
- Use: validate the API's `actual` series, and get a long history (2009→) to show how shifting potential grows as GB decarbonises.

## 3. Electricity Maps (secondary / optional)

- **Datasets (CSV):** historically free downloads under the **ODbL** (attribution + share-alike), at hourly/daily/monthly/yearly grain for 2021-2024+, with direct and life-cycle intensity, carbon-free % and renewable %.
- **Status change:** an Electricity Maps help article (seen via search, ~Aug 2026) says the datasets product was **sunset for general users**. Academic users may still download CSVs for approved research. `app.electricitymaps.com/datasets` now returns 403 without login. **Action:** someone in the group should make a free account and check. If academic access needs approval, apply early or substitute (see below).
- **Free API tier:** non-commercial only, needs a **free API key**, and covers latest + past 24 h only. That is fine for a live demo of the online scheduler but useless for a year-long backtest.
- Zone codes: `GB`; India uses regional zones (`IN-SO` South, `IN-WE` West, `IN-NO` North, `IN-EA` East, `IN-NE` North-East). Verify against the portal list.
- Why it matters: Electricity Maps uses **consumption-based, flow-traced, life-cycle** intensity. The GB API gives **direct, production-based** intensity. If we compare the two, we must state this difference.

**Substitution justification (if Electricity Maps CSVs are unavailable):** the notes allow substituting a comparable public dataset with an explanation. NESO's historic dataset and the GB API come from the same national system operator, are CC BY 4.0, need no key, and have finer grain (30 min vs 60 min). Our substitution note should say this.

## 4. Average vs marginal intensity (methodology choice)

- **Average** = total emissions / total generation in that period. This is what the GB API and Electricity Maps (default) provide.
- **Marginal (MOER)** = emissions of the generator that responds to an extra kWh (e.g. WattTime). It is arguably the right signal for load shifting, but it is model-based and mostly proprietary.
- "Let's Wait Awhile" (Wiesner et al. 2021, §3.4) also uses average intensity and argues marginal data was "no reliable alternative" at the time.
- **Decision:** use average intensity and say so as a limitation in the report. This is the standard GHG Protocol location-based approach.

## 5. What we downloaded

See the data cards in [../datacards/](../datacards/) and the SHA-256 hashes printed by the downloader. Files go to `data/raw/carbon/`.

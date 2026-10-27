# 03: Carbon-aware scheduling: literature & design ideas

Items marked ✅ were read/verified in this session. Items marked ⚠ come from memory: **check the citation details before putting them in the report.**

## Core paper ✅: Wiesner et al., "Let's Wait Awhile: How Temporal Workload Shifting Can Reduce Carbon Emissions in the Cloud", Middleware '21, pp. 260-272. arXiv:2110.13234. Code + data: https://github.com/dos-group/lets-wait-awhile

- Regions DE, GB, FR, California, all of 2020. Uses **average** carbon intensity (§3.4 argues marginal data is unreliable).
- Workload taxonomy: duration, execution time (scheduled vs ad hoc), **interruptibility**. Batch jobs are ~60% of processing on large clusters, and >40% of these run daily (nightly builds, backups, ETL).
- **Scenario I (nightly jobs, which is our case):** 366 daily jobs, 30 min each, non-interruptible, baseline at 01:00. The flexibility window grows ±0.5 h … ±8 h.
  - Forecast error model: the NESO 48 h forecast MAE ≈ 10 gCO2/kWh ≈ 5% of the yearly mean, so they add **N(0, 0.05·mean)** noise and average 10 runs. They also run with perfect forecasts.
  - **GB results:** ±2 h → **4.3%** saved; ±8 h → **7.4%** saved. FR 3.0% / 4.1%. DE 11.2% (±8 h). CA 33.7% (±8 h, solar).
  - Insight: in GB and FR, night-time intensity is already near its daily minimum, so shifting *within the night* gains little. Big gains need windows that reach into solar/wind-rich hours.
- **Scenario II (ML project, ad hoc jobs):** "Next Workday" and "Semi-Weekly" deadlines. Interrupting saved 5.7-8.5% and 13.3-18.9% respectively. Non-interrupting saved 2.5-6.3% and 6.1-14.4%. Interruptibility improves savings by 24-37% (EU) and 131% (CA).
- Scheduling strategies: **Non-interrupting** = the contiguous window with the lowest mean CI. **Interrupting** = the N individual lowest-CI slots.

## Related work to cite (⚠ verify each)

- Radovanovic et al., "Carbon-Aware Computing for Datacenters", IEEE Trans. Power Systems 2022 (Google's carbon-intelligent computing platform: day-ahead "virtual capacity curves" for flexible workloads).
- Sukprasert et al., "On the Limitations of Carbon-Aware Temporal and Spatial Workload Shifting in the Cloud", EuroSys 2024. A critical counterpoint: most of the benefit comes from simple policies and short windows, and the gains are bounded. **Good for our discussion section.**
- Hanafy et al., "CarbonScaler: Leveraging Cloud Workload Elasticity for Optimizing Carbon-Efficiency", SIGMETRICS 2024 (scale resources up when the grid is clean).
- Hanafy et al., "Going Green for Less Green: Optimizing the Cost of Reducing Cloud Carbon Emissions" (GAIA), ASPLOS 2024.
- Souza et al., "Ecovisor: A Virtual Energy System for Carbon-Efficient Applications", ASPLOS 2023.
- Green Software Foundation **Carbon Aware SDK** (open source; wraps WattTime / Electricity Maps; gives a "best time to run" API).
- **SCI (Software Carbon Intensity)**: `SCI = ((E × I) + M) per R` ✅ (GSF guide). Standardised as ISO/IEC 21031:2024 (⚠ verify). We can report SCI per nightly run (R = one nightly batch).

## Design for our scheduler (proposal)

**Problem:** N jobs released at time r each night (e.g. 22:00 local), hard deadline D (e.g. 07:00, before the analysts arrive). Job j has measured duration d_j and energy E_j, and maybe dependencies (DAG) and an interruptible flag. A cluster capacity of k concurrent jobs. Minimise Σ_j Σ_t E_j/d_j · CI_forecast(t) subject to all jobs finishing by D.

| Policy | Idea | Why include |
|---|---|---|
| **P0 Baseline** | Fixed cron: start at r, run back to back | What teams do today |
| **P1 Threshold** | Start when the forecast index is ≤ "low" (or CI ≤ x-th percentile), with deadline fallback | Simplest practical rule |
| **P2 Best window (non-interrupting)** | For each job, the contiguous slot window with min mean forecast CI inside [r, D − d_j] | LWA Scenario I strategy |
| **P3 Interruptible / stage-split** | Split jobs at query boundaries (checkpoints) into the lowest-CI slots | LWA "interrupting"; Spark jobs are naturally multi-query |
| **P4 Multi-job, capacity-aware greedy** | Sort by energy (largest first) and assign the best feasible windows under capacity k, with EDF fallback to guarantee deadlines | Realistic shared cluster |
| (stretch) **P5 MILP optimal** | Exact time-indexed ILP (PuLP/CBC) | Upper bound to show the greedy gap |

**Forecast realism (each policy evaluated three ways):**
1. Oracle: decide on `actual` (upper bound).
2. **Real API forecast**: the `forecast` field stored in the history.
3. LWA-style noise: actual + N(0, 0.05·mean), 10 seeds.

**Metrics:** gCO2/night and % saved vs P0; mean/p95 **added delay** (completion time − baseline completion); deadline misses (must be 0); **gCO2 saved per hour of delay**; results split by season, weekday/weekend, and region (North Scotland vs London vs South Wales); bootstrap 95% CIs over 365 nights.

**Sensitivity:** window length (±1…±8 h, plus "daytime allowed"), deadline, job size mix, capacity k, region.

## Talking points for the report

- GB nights are already fairly clean (wind, low demand). Expect single-digit % savings within the night and more if deadlines allow the early-afternoon solar peak. That is an honest, literature-backed finding.
- Shifting does not reduce energy. It reduces the carbon per kWh. Combine it with efficiency (AQE, right-sizing, columnar formats) for a full story.
- Rebound risk: if every flexible load shifts to the same "green" slot, the marginal plant may change. That is a limitation of using average intensity.

# 02: Measuring Spark job energy

## The test machine

| | |
|---|---|
| CPU | Intel Core i5-12450H (Alder Lake-H, 4P+4E cores, 12 threads). Intel spec: 45 W base power, 95 W max turbo |
| RAM | 16 GB |
| OS | Windows 11 Home, bare metal (not a VM) |
| Spark | 4.2.0, `local[*]` (driver = executor, 12 task slots), JDK Temurin 21 (portable, `.tools/`) |

## Three independent energy signals (all verified working 2026-10-27)

1. **Intel RAPL via the Windows Energy Meter Interface (EMI)** (*primary, measured*)
   - Exposed as the perf-counter set `\Energy Meter(RAPL_Package0_<domain>)\Energy|Power`.
   - Domains: `PKG` (whole package), `PP0` (cores), `PP1` (iGPU), `DRAM` (reads **0** on this laptop, so not supported).
   - Units: `Energy` is cumulative in **picowatt-hours** (×3.6e-9 → J), `Power` in mW. We checked this: the Power counter and the Energy delta agree (10.32 W both ways).
   - Updates roughly once per second, so jobs shorter than ~10 s carry a few % quantisation error. Our jobs run for tens of seconds or more.
   - CodeCarbon documents the same path: "Windows: reads RAPL-style counters through the Windows Energy Meter Interface. Needs Windows 11 on bare metal."
2. **Battery discharge rate** (*measured, whole-system, cross-check*)
   - WMI `root\wmi:BatteryStatus.DischargeRate` (mW). Valid only when unplugged. It includes the screen, SSD, Wi-Fi, etc.
   - The firmware smooths it, so it **lags** by several seconds. It only works for long jobs (>1 min) and for sanity-checking the order of magnitude.
3. **Utilisation × linear power model** (*estimate, portable*)
   - `P = P_idle + (P_max − P_idle)·u + 0.375 W/GB × RAM_GB`, times the PUE.
   - This is the CodeCarbon fallback / Cloud Carbon Footprint method. 0.375 W/GB is CodeCarbon v2's "3 W per 8 GB". CodeCarbon v3 uses 5 W per DIMM with a 10 W x86 minimum.
   - We **calibrate** `P_idle`/`P_max` against RAPL (least squares; `energy/model.py::calibrate`). The calibrated model is how we would attribute energy on a YARN/K8s cluster or cloud VM without RAPL access.

Plus **Spark task metrics** from the REST API (`/api/v1/applications/{id}/stages`): `executorCpuTime`, `executorRunTime`, `inputBytes`, shuffle bytes and spills. Together these give an **energy-per-CPU-second** attribution that scales from the laptop to a cluster.

First test (CPU burn, 12 processes): RAPL 68.9 J, model 69.2 J, battery 20.6 J (lagging). Idle ≈ 7.4 W package.

## Measurement protocol (for the report's "measurement method" section)

1. Plug in to AC, select the Windows "Best performance" power mode, close other apps, keep the screen on at fixed brightness, and keep Wi-Fi as is.
2. Warm-up: one untimed run of each job (JIT, OS file cache, parquet footers).
3. **Idle baseline:** 60 s idle, giving `P_idle`. Repeat at the start and end of the session.
4. Run each job **n = 5** times in randomised order, with 20 s cool-down between runs (thermal throttling bias).
5. For each run record: wall time, RAPL PKG/PP0 energy, mean utilisation, Spark CPU-seconds, bytes read and shuffled.
6. Report the mean ± std and 95% CI, both **gross** energy (RAPL PKG) and **attributable** energy (gross − P_idle × duration).
7. Convert: `E_kWh = J / 3.6e6`, then `CO2_g = E_kWh × PUE × CI(t)`. PUE = 1.0 for the laptop. For data-centre extrapolation use the Uptime Institute 2024 global average PUE ≈ 1.56 (**verify the figure before citing**).

## What RAPL does not capture (limitations to state)

- DRAM (no counter here), SSD, NIC, motherboard, fans, PSU losses, and the screen. We add the RAM model term and note the rest.
- Package power includes background OS activity, which the idle baseline subtraction handles.
- RAPL is a model inside the CPU, not a power meter. Published validations find it accurate on modern Intel parts, but it is not wall-socket power.
- **Embodied carbon** (manufacturing) is out of scope for *shifting*, because it is the same whichever hour a job runs. It belongs in the SCI formula for completeness (see notes 03).

## Why this matters for the scheduler

Emissions = E × CI(t). Shifting does not change E (same job). It changes CI(t). The **percentage** saving therefore does not depend on the energy figure: it depends only on job duration (how many half-hour slots the job spans) and the window. Energy measurement turns % into grams and lets us rank which jobs are worth delaying (big E × big CI spread).

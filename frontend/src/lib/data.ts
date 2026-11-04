// Typed access to the JSON that scripts/export_site_data.py writes to public/data/.
// Every number on the site comes from these files; nothing is typed in by hand.

export type History = { start_utc: string; slot_minutes: number; days: string[]; actual: (number | null)[][] }

export type Region = { id: number; name: string; mean: number; profile_local: (number | null)[]; mix: Record<string, number> }
export type Regions = { regions: Region[]; national_profile_local: (number | null)[] }

export type Eda = {
  national_mean_actual: number
  mean_22_to_07_local: number
  mean_07_to_22_local: number
  mean_weekday: number
  mean_weekend: number
  national_long_gap_slots: number
  forecast_error: { n: number; mae: number; bias: number; rmse: number; mae_pct_of_mean: number }
  forecast_mae_by_hour_local: Record<string, number>
  neso_vs_api_actual: { n: number; pearson_r: number; mae: number; bias_neso_minus_api: number; exact_match_pct: number }
  share_of_days_min_in_local_hour: Record<string, number>
  hourly_mean_by_season_local: Record<string, Record<string, number>>
  hourly_mean_weekday_weekend_local: Record<string, Record<string, number>>
  regional_mean_forecast: Record<string, number>
}

export type CatalogueJob = { name: string; queries: number[]; character: string; interruptible: boolean; repeats: number; sf1_seconds: number; energy_kwh: number | null }
export type Attempt = { id: string; status: string; recorded_at_utc: string | null; cpu: string | null; scale_factor: number | null; runs: number; jobs_covered: number; reason: string | null }
export type Energy = {
  campaign: { complete: boolean; summary: Record<string, number | string>[] | null; attempts: Attempt[]; machine: Record<string, unknown> | null }
  validation: { machine: string; test: string; duration_s: number; rapl_j: number; model_j: number; util: number; note?: string }[]
  idle_w: Record<string, number>
  cpu: string
  tpcds_sf1: { machine: string; date: string; query_seconds: Record<string, number>; note: string }
  jobs: CatalogueJob[]
  scale_factor: number | null
  window: { release_local: string; deadline_local: string; tz: string }
}

export type Mode = 'api' | 'noisy' | 'oracle'
export type T1Row = {
  capacity_k: number; policy: string; forecast_mode: Mode; saved_pct: number; ci_low: number; ci_high: number; nights: number
  delay_median_min: number; delay_p95_min: number; delay_mean_min: number; deadline_misses: number; interrupted_share: number
  laptop_g_saved_per_job: number | null; fleet_kg_saved_per_year: number | null
}
export type T2Row = { window_h: number; forecast_mode: Mode; saved_pct: number; ci_low: number; ci_high: number; nights: number; mean_abs_shift_min: number; paper_gb_pct: number | null }
export type T3Row = { capacity_k: number; policy: string; forecast_mode: Mode; saved_pct: number; oracle_pct: number; ratio: number | null }
export type GroupRow = { group: string; forecast_mode: Mode; saved_pct: number; ci_low: number; ci_high: number; nights: number }
export type Dist = { median: number; mean: number; bins_from: number; bin_width: number; counts: number[]; share_nights_worse: number; share_nights_zero: number }
export type SizedJob = { name: string; duration_slots: number; interruptible: boolean; energy_kwh: number | null }
export type Results = {
  status: 'measured' | 'placeholder' | 'not_run'
  note?: string
  generated_utc: string
  source_dir: string
  backtest_sha256: string
  git_commit: string | null
  rows: number
  nights_nightly: number
  nights_wiesner: number
  nights_skipped: number
  deadline_misses_total: number
  job_sizing: { source: string; scale: number | null; pue: number; energy_basis: string }
  jobs: SizedJob[]
  headline: { capacity_k: number; policy: string } & Record<Mode, T1Row>
  table1: T1Row[]
  table2: T2Row[]
  table3: T3Row[]
  by_season: GroupRow[]
  by_weekday: GroupRow[]
  intensity: { policy: string; forecast_mode: Mode; g_per_kwh: number }[]
  distribution: Record<'api' | 'oracle', Dist>
  example_night: {
    night: string; saved_pct: number; release_utc: string; deadline_utc: string
    series: { t: string; actual: number | null; forecast: number | null }[]
    jobs: { job: string; p0_start_utc: string; p0_end_utc: string; start_utc: string; end_utc: string; delay_min: number }[]
  }
  noisy_seeds: { policy: string; seeds: number[]; noisy_min: number; noisy_max: number; noisy_sd: number }[]
  paper_gb: Record<string, number>
  verification: Verification | null
  tests: Tests | null
}

export type PythonPlan = {
  night: string; release_utc: string; deadline_utc: string; capacity_k: number
  forecast: { source: string; fetched_at_utc: string; fallback_reason?: string }
  jobs: { job: string; start_utc: string; end_utc: string; baseline_start_utc: string; forecast_ci: number | null; baseline_ci: number | null; expected_saving_pct: number | null }[]
}

/** One half-hour of forecast: start time (UTC ms) and gCO2/kWh. */
export type Slot = { t: number; ci: number | null }
export type Forecast = { fetchedAt: Date; live: boolean; national: Slot[]; regional: Record<number, Slot[]> }

async function json<T>(name: string): Promise<T> {
  const r = await fetch(`./data/${name}`)
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`)
  return r.json() as Promise<T>
}

// Cached so moving between pages never refetches or flashes.
const cache = new Map<string, Promise<unknown>>()
function once<T>(name: string): Promise<T> {
  if (!cache.has(name)) cache.set(name, json<T>(name))
  return cache.get(name) as Promise<T>
}

export const loadHistory = () => once<History>('history.json')
export const loadRegions = () => once<Regions>('regions.json')
export const loadEda = () => once<Eda>('eda.json')
export const loadEnergy = () => once<Energy>('energy.json')
export const loadResults = () => once<Results>('results.json')
export const loadPythonPlan = () => once<PythonPlan>('python_plan.json').catch(() => null)

const API = 'https://api.carbonintensity.org.uk'
type ApiNat = { data: { from: string; intensity: { forecast: number | null } }[] }
type ApiReg = { data: { from: string; regions: { regionid: number; intensity: { forecast: number | null } }[] }[] }
type Stored = { fetched_at_utc: string; national: { from: string; forecast: number | null }[]; regional: { from: string; regions: Record<string, number | null> }[] }

// The API writes times as 2026-10-27T06:30Z.
export const ms = (s: string) => Date.parse(s.endsWith('Z') && s.length === 17 ? s.replace('Z', ':00Z') : s)

function fromRows(fetchedAt: Date, live: boolean, nat: { from: string; ci: number | null }[], reg: { from: string; byId: Record<number, number | null> }[]): Forecast {
  const national = nat.map((d) => ({ t: ms(d.from), ci: d.ci }))
  const regional: Record<number, Slot[]> = {}
  for (const row of reg) for (const [id, ci] of Object.entries(row.byId)) (regional[Number(id)] ??= []).push({ t: ms(row.from), ci })
  return { fetchedAt, live, national, regional }
}

export async function loadStoredForecast(): Promise<Forecast> {
  const s = await json<Stored>('forecast_fallback.json')
  return fromRows(new Date(ms(s.fetched_at_utc)), false,
    s.national.map((d) => ({ from: d.from, ci: d.forecast })),
    s.regional.map((d) => ({ from: d.from, byId: Object.fromEntries(Object.entries(d.regions).map(([k, v]) => [Number(k), v])) })))
}

/** Live 48 h forecast from the API; falls back to the stored copy (labelled) when offline. */
export async function loadForecast(signal?: AbortSignal): Promise<Forecast> {
  const now = new Date()
  const from = now.toISOString().slice(0, 16) + 'Z'
  try {
    const timeout = AbortSignal.timeout(8000)
    const sig = signal ? AbortSignal.any([signal, timeout]) : timeout
    const get = <T,>(path: string) => fetch(`${API}${path}`, { signal: sig }).then((x) => (x.ok ? (x.json() as Promise<T>) : Promise.reject(new Error(`HTTP ${x.status}`))))
    const [n, r] = await Promise.all([get<ApiNat>(`/intensity/${from}/fw48h`), get<ApiReg>(`/regional/intensity/${from}/fw48h`)])
    return fromRows(now, true,
      n.data.map((d) => ({ from: d.from, ci: d.intensity.forecast })),
      r.data.map((d) => ({ from: d.from, byId: Object.fromEntries(d.regions.map((g) => [g.regionid, g.intensity.forecast])) })))
  } catch (err) {
    if (signal?.aborted) throw err // the caller moved on; never surface a fallback it did not ask for
    return loadStoredForecast()
  }
}

export const REGION_NAMES: Record<number, string> = {
  1: 'North Scotland', 2: 'South Scotland', 3: 'North West England', 4: 'North East England', 5: 'Yorkshire', 6: 'North Wales', 7: 'South Wales',
  8: 'West Midlands', 9: 'East Midlands', 10: 'East England', 11: 'South West England', 12: 'South England', 13: 'London', 14: 'South East England',
  15: 'England', 16: 'Scotland', 17: 'Wales', 18: 'GB',
}

export const MODE_NAME: Record<Mode, string> = { api: 'API forecast', noisy: 'Noisy (Wiesner)', oracle: 'Oracle' }
export const POLICY_NAME: Record<string, string> = { P0: 'P0 cron baseline', P2: 'P2 best window', P3: 'P3 interruptible', P4: 'P4 multi-job greedy' }

export type Verification = { status: string; rows: number; plans: number; deadline_misses: number; capacity_violations: number; actual_accounting_rows_checked: number; energy_conserved: boolean; backtest_sha256: string }
export type Tests = { passed: number; failed: number; total: number; platform: string; python: string; ran_at_utc: string; duration_s: number }

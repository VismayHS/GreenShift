// Typed access to the JSON that scripts/export_site_data.py writes to public/data/.

export type History = { start_utc: string; slot_minutes: number; days: string[]; actual: (number | null)[][] }

export type Region = {
  id: number
  name: string
  mean: number
  profile_local: (number | null)[]
  mix: Record<string, number>
}
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
  regional_mean_forecast: Record<string, number>
}

export type Job = {
  name: string
  queries: number[]
  character: string
  interruptible: boolean
  sf1_seconds: number
  energy_kwh: number | null
}
export type Energy = {
  validation: { machine: string; test: string; duration_s: number; rapl_j: number; model_j: number; util: number; note?: string }[]
  idle_w: Record<string, number>
  cpu: string
  tpcds_sf1: { machine: string; date: string; query_seconds: Record<string, number>; note: string }
  jobs: Job[]
  window: { release_local: string; deadline_local: string; tz: string }
}

export type Results = { backtest: null | Record<string, unknown>; note: string }

/** One half-hour of forecast: start time (UTC ms) and gCO2/kWh. */
export type Slot = { t: number; ci: number | null }
export type Forecast = {
  fetchedAt: Date
  live: boolean
  national: Slot[]
  /** region id -> slots aligned with national */
  regional: Record<number, Slot[]>
}

async function json<T>(name: string): Promise<T> {
  const r = await fetch(`./data/${name}`)
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`)
  return r.json() as Promise<T>
}

export const loadHistory = () => json<History>('history.json')
export const loadRegions = () => json<Regions>('regions.json')
export const loadEda = () => json<Eda>('eda.json')
export const loadEnergy = () => json<Energy>('energy.json')
export const loadResults = () => json<Results>('results.json')

const API = 'https://api.carbonintensity.org.uk'

type ApiNat = { data: { from: string; intensity: { forecast: number | null } }[] }
type ApiReg = { data: { from: string; regions: { regionid: number; intensity: { forecast: number | null } }[] }[] }
type Stored = {
  fetched_at_utc: string
  national: { from: string; forecast: number | null }[]
  regional: { from: string; regions: Record<string, number | null> }[]
}

// The API writes times as 2026-10-27T06:30Z.
const ms = (s: string) => Date.parse(s.endsWith('Z') && s.length === 17 ? s.replace('Z', ':00Z') : s)

function fromRows(
  fetchedAt: Date,
  live: boolean,
  nat: { from: string; ci: number | null }[],
  reg: { from: string; byId: Record<number, number | null> }[],
): Forecast {
  const national = nat.map((d) => ({ t: ms(d.from), ci: d.ci }))
  const regional: Record<number, Slot[]> = {}
  for (const row of reg) {
    for (const [id, ci] of Object.entries(row.byId)) {
      ;(regional[Number(id)] ??= []).push({ t: ms(row.from), ci })
    }
  }
  return { fetchedAt, live, national, regional }
}

/** Live 48 h forecast from the API; falls back to the stored copy (labelled) when offline. */
export async function loadForecast(signal?: AbortSignal): Promise<Forecast> {
  const now = new Date()
  const from = now.toISOString().slice(0, 16) + 'Z'
  try {
    const [n, r] = await Promise.all([
      fetch(`${API}/intensity/${from}/fw48h`, { signal }).then((x) => (x.ok ? (x.json() as Promise<ApiNat>) : Promise.reject(x.status))),
      fetch(`${API}/regional/intensity/${from}/fw48h`, { signal }).then((x) => (x.ok ? (x.json() as Promise<ApiReg>) : Promise.reject(x.status))),
    ])
    return fromRows(
      now,
      true,
      n.data.map((d) => ({ from: d.from, ci: d.intensity.forecast })),
      r.data.map((d) => ({ from: d.from, byId: Object.fromEntries(d.regions.map((g) => [g.regionid, g.intensity.forecast])) })),
    )
  } catch {
    const s = await json<Stored>('forecast_fallback.json')
    return fromRows(
      new Date(ms(s.fetched_at_utc)),
      false,
      s.national.map((d) => ({ from: d.from, ci: d.forecast })),
      s.regional.map((d) => ({ from: d.from, byId: Object.fromEntries(Object.entries(d.regions).map(([k, v]) => [Number(k), v])) })),
    )
  }
}

export const REGION_NAMES: Record<number, string> = {
  1: 'North Scotland', 2: 'South Scotland', 3: 'North West England', 4: 'North East England',
  5: 'Yorkshire', 6: 'North Wales', 7: 'South Wales', 8: 'West Midlands', 9: 'East Midlands',
  10: 'East England', 11: 'South West England', 12: 'South England', 13: 'London',
  14: 'South East England', 15: 'England', 16: 'Scotland', 17: 'Wales', 18: 'GB',
}

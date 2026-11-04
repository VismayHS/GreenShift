import { useMemo, useState } from 'react'
import { Heatmap, HBars, INK, LineChart } from '../charts/charts'
import { EmptyNote, ExtLink, Field, Page, PageHead, Panel, Register, SectionHead, Segmented, Skeleton, Stamp } from '../vx/primitives'
import { useEda, useHistory } from '../lib/hooks'

const hh = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`
const SEASON_COLOURS: Record<string, { color: string; dash?: string }> = {
  Winter: { color: INK.ink }, Spring: { color: INK.lilac }, Summer: { color: INK.violet }, Autumn: { color: INK.grey, dash: '6 4' },
}

export function Carbon() {
  const { data: eda, error } = useEda()
  const { data: history } = useHistory()
  const [split, setSplit] = useState<'season' | 'week'>('season')

  const weeks = useMemo(() => {
    if (!history) return null
    const rows: (number | null)[][] = [], labels: string[] = []
    for (let d = 0; d < history.days.length; d += 7) {
      const block = history.actual.slice(d, d + 7)
      labels.push(history.days[d])
      rows.push(Array.from({ length: 48 }, (_, s) => {
        const xs = block.map((r) => r[s]).filter((x): x is number => x != null)
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
      }))
    }
    return { rows, labels }
  }, [history])

  const profile = eda ? (split === 'season' ? eda.hourly_mean_by_season_local : eda.hourly_mean_weekday_weekend_local) : null

  return (
    <Page>
      <PageHead title="Carbon data"
        lede="Two years (2024-25) of half-hourly GB grid carbon intensity from the NESO Carbon Intensity API: the forecast the scheduler decides on, and the actual value every saving is scored against." />
      {error && <EmptyNote tone="failed" title="Carbon summary could not be loaded">{error}</EmptyNote>}
      {!eda ? <Skeleton className="h-28 w-full rounded-[10px]" /> : (
        <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
          <Field label="National mean (actual)" value={`${eda.national_mean_actual} gCO₂/kWh`} note="35,088 half-hours, 2024-01-01 to 2026-01-01 UTC" />
          <Field label="Night vs day" value={`${eda.mean_22_to_07_local} vs ${eda.mean_07_to_22_local}`} note="22:00-07:00 vs 07:00-22:00 UK local, gCO₂/kWh" />
          <Field label="Weekday vs weekend" value={`${eda.mean_weekday} vs ${eda.mean_weekend}`} note="gCO₂/kWh" />
          <Field label="Forecast MAE" value={`${eda.forecast_error.mae.toFixed(2)} gCO₂/kWh`} note={`${eda.forecast_error.mae_pct_of_mean.toFixed(1)}% of mean, bias ${eda.forecast_error.bias.toFixed(2)}, n = ${eda.forecast_error.n.toLocaleString()}`} />
          <Field label="NESO cross-check" value={`r = ${eda.neso_vs_api_actual.pearson_r}`} note={`MAE ${eda.neso_vs_api_actual.mae} gCO₂/kWh vs the independent NESO historic series`} />
          <Field label="Source outages" value={`${eda.national_long_gap_slots} forecast slots`} note="Three outages (Jun 2024, Jan 2025, Aug 2025); never interpolated, nights skipped" />
        </div>
      )}

      <SectionHead title="Every half-hour of two years" tip="Weekly mean of the national actual intensity per half-hour, UTC. Grey cells are source outages." />
      <Panel>
        {weeks ? (
          <Heatmap rows={weeks.rows} unit="gCO₂/kWh" height={440}
            label="National carbon intensity for every half-hour of 2024 and 2025, weekly means. Cleaner bands appear overnight, at midday in summer, and in windy spells."
            rowLabel={(i) => { const d = weeks.labels[i]; const prev = weeks.labels[i - 1]; return !prev || prev.slice(0, 7) !== d.slice(0, 7) ? (['01', '04', '07', '10'].includes(d.slice(5, 7)) ? new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : null) : null }}
            colLabel={(j) => (j % 12 === 0 ? `${hh(j / 2)} UTC` : null)} />
        ) : <Skeleton className="h-[440px] w-full" />}
      </Panel>

      <SectionHead title="A typical day" tip="Mean actual intensity by half-hour of the UK-local day.">
        <Segmented label="Split by" value={split} onChange={setSplit} options={[['season', 'Season'], ['week', 'Weekday or weekend']]} />
      </SectionHead>
      <Panel>
        {profile ? (
          <LineChart label="Mean carbon intensity by time of day" yTitle="gCO₂/kWh" xTitle="Time of day (UK local)" height={320}
            xTicks={[0, 4, 8, 12, 16, 20, 23.5]} xFmt={hh}
            series={Object.entries(profile).map(([name, v], i) => ({
              name, color: (SEASON_COLOURS[name] ?? { color: i ? INK.violet : INK.ink }).color, dash: SEASON_COLOURS[name]?.dash,
              points: Object.entries(v).map(([h, y]) => ({ x: Number(h), y })),
            }))} readFmt={(_, p) => `${Math.round(p.y!)} g`} />
        ) : <Skeleton className="h-[320px] w-full" />}
        <p className="mt-3 max-w-[75ch] text-[15px] leading-relaxed text-vx-ink-2">
          Nights are cleaner than evenings all year, which is why a 22:00 cron is already a fair start. In summer the solar midday dip is cleaner than the night, but it lies outside the 22:00-07:00 window, so the scheduler cannot reach it.
          {eda && <> The day's cleanest half-hour falls inside the night window on {Math.round(100 * Object.entries(eda.share_of_days_min_in_local_hour).filter(([h]) => Number(h) >= 22 || Number(h) < 7).reduce((s, [, v]) => s + v, 0))}% of days.</>}
        </p>
      </Panel>

      <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <SectionHead title="Forecast error by hour" tip="Mean absolute error of the national forecast against the actual, by UK-local half-hour." />
          <Panel>
            {eda ? (
              <LineChart label="Forecast mean absolute error by time of day" yTitle="MAE, gCO₂/kWh" height={260} xTicks={[0, 6, 12, 18, 23.5]} xFmt={hh}
                series={[{ name: 'Forecast MAE', color: INK.violet, points: Object.entries(eda.forecast_mae_by_hour_local).map(([h, y]) => ({ x: Number(h), y })) }]} />
            ) : <Skeleton className="h-[260px] w-full" />}
          </Panel>
        </div>
        <div>
          <SectionHead title="Regions differ tenfold" tip="Mean regional forecast 2024-25. The API publishes no regional actuals, so the backtest uses the national series." />
          <Panel>
            {eda ? (
              <HBars label="Mean forecast carbon intensity by region" unit="Mean forecast, gCO₂/kWh"
                rows={Object.entries(eda.regional_mean_forecast).sort((a, b) => a[1] - b[1]).map(([name, value]) => ({ name, value }))} />
            ) : <Skeleton className="h-[240px] w-full" />}
          </Panel>
        </div>
      </div>

      <SectionHead title="Sources" count={4} />
      <Register caption="Data sources">
        <thead><tr><th>Dataset</th><th>Use</th><th>Licence</th><th>State</th></tr></thead>
        <tbody>
          <tr><td><ExtLink href="https://carbon-intensity.github.io/api-definitions/">GB Carbon Intensity API (NESO)</ExtLink></td><td>Forecast for decisions, national actual for scoring</td><td>CC BY 4.0, no key</td><td><Stamp tone="done">Primary</Stamp></td></tr>
          <tr><td><ExtLink href="https://www.neso.energy/data-portal/historic-generation-mix">NESO historic generation mix</ExtLink></td><td>Independent cross-check of the actual series</td><td>CC BY 4.0</td><td><Stamp tone="done">Cross-check</Stamp></td></tr>
          <tr><td><ExtLink href="https://www.electricitymaps.com/platform/datasets">Electricity Maps</ExtLink></td><td>Suggested by the brief; historical datasets now need academic approval</td><td>ODbL / non-commercial API</td><td><Stamp tone="rejected">Substituted</Stamp></td></tr>
          <tr><td><ExtLink href="https://www.tpc.org/tpc_documents_current_versions/current_specifications5.asp">TPC-DS (via DuckDB dsdgen)</ExtLink></td><td>Synthetic retail data and SQL for the Spark jobs</td><td>TPC EULA, fair use</td><td><Stamp tone="done">Workload</Stamp></td></tr>
        </tbody>
      </Register>
      <p className="mt-3 text-[14.5px] text-vx-ink-3">Workload derived from TPC-DS; not comparable with published TPC-DS results. Data cards for all four are in <code className="font-vxmono">datacards/</code>.</p>
    </Page>
  )
}

import { useState } from 'react'
import { GroupedBars, Histogram, INK, Key, Scatter, Timeline, type ScatterPoint } from '../charts/charts'
import { EmptyNote, Field, Page, PageHead, Panel, Register, SectionHead, Segmented, Skeleton, Stamp } from '../vx/primitives'
import { Notice, StatsStrip } from '../vx/recipes'
import { minutes, pct, useResults } from '../lib/hooks'
import { MODE_NAME, POLICY_NAME, type Mode, type Results } from '../lib/data'
import { clock, SLOT_MS } from '../lib/plan'

const MODE_COLOUR: Record<Mode, string> = { api: INK.violet, noisy: INK.lilac, oracle: INK.ink }
const SHAPE = { P2: 'circle', P3: 'square', P4: 'triangle' } as const
const MODES: Mode[] = ['api', 'noisy', 'oracle']

export function ResultsPage() {
  const { data: r, error } = useResults()
  const [k, setK] = useState(1)
  const [policy, setPolicy] = useState<'P2' | 'P3' | 'P4'>('P4')

  if (error) return <Page><EmptyNote tone="failed" title="Results could not be loaded">{error}</EmptyNote></Page>
  if (!r) return <Page><Skeleton className="h-[480px] w-full rounded-[10px]" /></Page>
  if (r.status === 'not_run') return <Page><PageHead title="Savings and delay" /><EmptyNote title="The backtest has not been summarised yet">Run <code className="font-vxmono">python scripts/run_all.py --skip-measure</code>.</EmptyNote></Page>

  const row = (m: Mode) => r.table1.find((x) => x.capacity_k === k && x.policy === policy && x.forecast_mode === m)!
  const api = row('api'), oracle = row('oracle')
  const placeholder = r.status === 'placeholder'
  const headlineScope = `${POLICY_NAME[r.headline.policy]}, k=${r.headline.capacity_k}`

  return (
    <Page wide>
      <PageHead title="Savings and delay"
        lede={`Every night of 2024 and 2025 (${r.nights_nightly} usable), five jobs, four policies, three forecast modes and two capacities, scored on the grid's actual carbon intensity against the 22:00 cron.`}
        meta={<Stamp tone={placeholder ? 'lead' : 'done'}>{placeholder ? 'Placeholder job sizes' : 'Measured job sizes'}</Stamp>}
        actions={<>
          <Segmented label="Capacity" value={k} onChange={setK} options={[[1, 'k = 1'], [2, 'k = 2']]} />
          <Segmented label="Policy" value={policy} onChange={setPolicy} options={[['P2', 'P2'], ['P3', 'P3'], ['P4', 'P4']]} />
        </>} />

      {placeholder && (
        <div className="mb-6">
          <Notice tone="possible">
            Job lengths are the documented placeholders (30 min to 2 h) and every job has the same synthetic energy, so these percentages are real scheduler results for that job mix, not yet for the measured workload. No grams are shown until the RAPL campaign passes.
          </Notice>
        </div>
      )}

      <StatsStrip stats={[
        { n: pct(api.saved_pct, 2), label: `CO₂ saved · ${MODE_NAME.api}`, note: `95% CI ${api.ci_low.toFixed(2)} to ${api.ci_high.toFixed(2)}% over ${api.nights} nights` },
        { n: pct(oracle.saved_pct, 2), label: 'Ceiling · perfect forecast', note: `The API forecast gets ${Math.round((100 * api.saved_pct) / oracle.saved_pct)}% of the way there` },
        { n: minutes(api.delay_median_min), label: 'Median added delay', note: `p95 ${minutes(api.delay_p95_min)} · mean ${minutes(api.delay_mean_min)}` },
        { n: api.deadline_misses, label: 'Deadline misses', color: api.deadline_misses ? 'var(--vx-fail)' : 'var(--vx-strong)', note: 'Every job ends by 07:00 UK' },
      ]} />

      <SectionHead title="Carbon saved against delay added" tip="Each mark is one policy × forecast × capacity, pooled over every night. Delay is the job's completion time minus its cron completion time." />
      <Panel>
        <Scatter label="Percentage CO2 saved against median added delay for each policy, forecast mode and capacity"
          xTitle="Median added delay per job (hours)" yTitle="CO₂ saved vs cron (%)"
          legend={<>
            {MODES.map((m) => <Key key={m} color={MODE_COLOUR[m]} shape="dot">{MODE_NAME[m]}</Key>)}
            <span className="text-vx-ink-3">○ P2 · □ P3 · △ P4 · hollow = k 2</span>
          </>}
          points={[
            { x: 0, y: 0, color: INK.grey, shape: 'cross', label: 'P0 cron at 22:00: 0% saved, no delay' } as ScatterPoint,
            ...r.table1.map((t): ScatterPoint => ({
              x: t.delay_median_min / 60, y: t.saved_pct, color: MODE_COLOUR[t.forecast_mode], shape: SHAPE[t.policy as keyof typeof SHAPE], hollow: t.capacity_k === 2,
              label: `${POLICY_NAME[t.policy]}, ${MODE_NAME[t.forecast_mode]}, k=${t.capacity_k}: ${t.saved_pct.toFixed(2)}% saved [${t.ci_low.toFixed(2)}, ${t.ci_high.toFixed(2)}], median delay ${minutes(t.delay_median_min)}`,
            })),
          ]} />
      </Panel>

      <SectionHead title={`Table 1 · k = ${k}`} tip="% saved = 1 − Σ policy grams / Σ cron grams over every job and night. Brackets: 95% bootstrap over nights." />
      <Register caption="Savings and delay by policy and forecast">
        <thead><tr><th>Policy</th><th>Forecast</th><th className="num">CO₂ saved</th><th className="num">95% CI</th><th className="num">Median delay</th><th className="num">p95 delay</th><th className="num">Misses</th><th className="num">Fleet kg/yr</th></tr></thead>
        <tbody>
          {r.table1.filter((t) => t.capacity_k === k).map((t) => (
            <tr key={t.policy + t.forecast_mode} className={t.policy === policy ? 'font-medium' : ''}>
              <td className="whitespace-nowrap">{POLICY_NAME[t.policy]}</td>
              <td>{MODE_NAME[t.forecast_mode]}</td>
              <td className="num font-semibold">{pct(t.saved_pct, 2)}</td>
              <td className="num text-vx-ink-2">{t.ci_low.toFixed(2)} to {t.ci_high.toFixed(2)}</td>
              <td className="num">{minutes(t.delay_median_min)}</td>
              <td className="num">{minutes(t.delay_p95_min)}</td>
              <td className="num">{t.deadline_misses}</td>
              <td className="num">{t.fleet_kg_saved_per_year ?? <span className="text-vx-ink-3">pending</span>}</td>
            </tr>
          ))}
        </tbody>
      </Register>

      <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <SectionHead title="By season and night of the week" tip={`${headlineScope}. Season is the month of the 22:00 release.`} />
          <Panel>
            <GroupedBars label="CO2 saved by season and by weekday or weekend night" yTitle="CO₂ saved (%)"
              groups={[...r.by_season, ...r.by_weekday].reduce<{ label: string; bars: { name: string; value: number; lo: number; hi: number; color: string }[] }[]>((acc, g) => {
                const label = g.group.replace(' night', '').replace('Mon-Fri', 'Mon–Fri').replace('Sat/Sun', 'Sat–Sun')
                let grp = acc.find((a) => a.label === label)
                if (!grp) acc.push((grp = { label, bars: [] }))
                grp.bars.push({ name: MODE_NAME[g.forecast_mode], value: g.saved_pct, lo: g.ci_low, hi: g.ci_high, color: MODE_COLOUR[g.forecast_mode] })
                return acc
              }, [])} />
          </Panel>
        </div>
        <div>
          <SectionHead title="Night by night" tip={`${headlineScope}. Percentage saved on each night separately.`} />
          <Panel>
            <Histogram label="Distribution of nightly percentage savings" xTitle="CO₂ saved on the night (%)" from={r.distribution.api.bins_from} width={r.distribution.api.bin_width}
              series={[{ name: MODE_NAME.api, color: INK.violet, counts: r.distribution.api.counts }, { name: MODE_NAME.oracle, color: INK.grey, counts: r.distribution.oracle.counts }]} />
            <div className="mt-4 vx-tag-fields rounded-[6px]">
              <Field label="Median night · API" value={pct(r.distribution.api.median, 2)} />
              <Field label="Nights worse than cron" value={pct(100 * r.distribution.api.share_nights_worse, 1)} note="The forecast was wrong in the scheduler's favour; the actual grid was dirtier" />
            </div>
          </Panel>
        </div>
      </div>

      <ExampleNight r={r} />

      <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <SectionHead title="Forecast regret" tip="How much of the perfect-forecast saving each realistic forecast captures." />
          <Register caption="Forecast regret">
            <thead><tr><th>k</th><th>Policy</th><th>Forecast</th><th className="num">Saved</th><th className="num">Oracle</th><th className="num">Share</th></tr></thead>
            <tbody>{r.table3.filter((t) => t.policy === policy).map((t) => (
              <tr key={`${t.capacity_k}${t.forecast_mode}`}><td>{t.capacity_k}</td><td>{t.policy}</td><td>{MODE_NAME[t.forecast_mode]}</td><td className="num">{pct(t.saved_pct, 2)}</td><td className="num">{pct(t.oracle_pct, 2)}</td><td className="num font-semibold">{t.ratio != null ? `${Math.round(t.ratio * 100)}%` : '—'}</td></tr>
            ))}</tbody>
          </Register>
        </div>
        <div>
          <SectionHead title="Carbon intensity the batch ran at" tip="Energy-weighted actual intensity across all jobs and nights. This is the I term of the Software Carbon Intensity (SCI)." />
          <Register caption="Effective carbon intensity">
            <thead><tr><th>Policy</th><th>Forecast</th><th className="num">gCO₂/kWh</th></tr></thead>
            <tbody>{r.intensity.map((t) => <tr key={t.policy + t.forecast_mode}><td>{POLICY_NAME[t.policy]}</td><td>{t.policy === 'P0' ? '—' : MODE_NAME[t.forecast_mode]}</td><td className="num font-semibold">{t.g_per_kwh.toFixed(1)}</td></tr>)}</tbody>
          </Register>
          <p className="mt-2 text-[14px] text-vx-ink-3">{headlineScope}. Multiply by a batch's measured kWh for grams.</p>
        </div>
      </div>

      <SectionHead title="Noisy forecast: spread across seeds" tip="Ten independent noise draws; the narrow spread shows the noisy result is not luck." />
      <Register caption="Noisy seeds">
        <thead><tr><th>Policy</th><th className="num">Lowest</th><th className="num">Highest</th><th className="num">Std dev</th><th>Seeds 0-9 (% saved)</th></tr></thead>
        <tbody>{r.noisy_seeds.map((s) => <tr key={s.policy}><td>{POLICY_NAME[s.policy]}</td><td className="num">{pct(s.noisy_min, 2)}</td><td className="num">{pct(s.noisy_max, 2)}</td><td className="num">{s.noisy_sd.toFixed(3)}</td><td className="font-vxmono text-[13px] text-vx-ink-2">{s.seeds.map((v) => v.toFixed(2)).join('  ')}</td></tr>)}</tbody>
      </Register>
      <p className="mt-3 text-[14.5px] text-vx-ink-3">Backtest {r.rows.toLocaleString()} rows · generated {r.generated_utc} · source <span className="font-vxmono">{r.source_dir}</span>. The same numbers are in <span className="font-vxmono">report/results_tables.md</span>.</p>
    </Page>
  )
}

function ExampleNight({ r }: { r: Results }) {
  const ex = r.example_night
  const times = ex.series.map((s) => Date.parse(s.t))
  return (
    <>
      <SectionHead title={`One typical night: ${new Date(ex.release_utc).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })}`}
        tip={`The night whose API saving (${ex.saved_pct.toFixed(2)}%) is closest to the median, ${POLICY_NAME[r.headline.policy]}, k=${r.headline.capacity_k}.`} />
      <Panel>
        <Timeline label="Actual and forecast carbon intensity on an example night with cron and GreenShift job placements"
          times={times} slotMs={SLOT_MS} window={{ from: Date.parse(ex.release_utc), to: Date.parse(ex.deadline_utc) }}
          lines={[{ name: 'Actual', color: INK.ink, values: ex.series.map((s) => s.actual) }, { name: 'API forecast', color: INK.violet, dash: '5 4', values: ex.series.map((s) => s.forecast) }]}
          rows={ex.jobs.map((j) => ({ label: j.job, blocks: [{ start: Date.parse(j.p0_start_utc), end: Date.parse(j.p0_end_utc), kind: 'base' as const }, { start: Date.parse(j.start_utc), end: Date.parse(j.end_utc), kind: 'best' as const }] }))}
          tick={(t) => new Date(t).getUTCMinutes() === 0 && new Date(t).getUTCHours() % 2 === 0} fmt={clock} />
        <p className="mt-3 max-w-[80ch] text-[15px] leading-relaxed text-vx-ink-2">
          Grey bars are where cron runs each job; violet bars are where GreenShift put it using only the forecast (dashed line).
          It moved {ex.jobs.filter((j) => j.start_utc !== j.p0_start_utc).length} of {ex.jobs.length} jobs, the last finishing at {clock(Math.max(...ex.jobs.map((j) => Date.parse(j.end_utc))))}, and the batch emitted {ex.saved_pct.toFixed(1)}% less CO₂ measured against the actual line.
        </p>
      </Panel>
    </>
  )
}

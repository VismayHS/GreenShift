import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, TerminalSquare } from 'lucide-react'
import { INK, Timeline } from '../charts/charts'
import { Button, CopyValue, EmptyNote, Field, Labelled, Page, PageHead, Panel, Register, SectionHead, Segmented, Skeleton, Stamp, Tip } from '../vx/primitives'
import { Notice, StatsStrip } from '../vx/recipes'
import { loadForecast, loadStoredForecast, REGION_NAMES, type Forecast } from '../lib/data'
import { usePythonPlan, useResults } from '../lib/hooks'
import { clock, day, planTonight, reason, SLOT_MS, type PlanJob } from '../lib/plan'

type Source = 'live' | 'stored'
const REGIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export function Tonight() {
  const { data: results } = useResults()
  const { data: py } = usePythonPlan()
  const [source, setSource] = useState<Source>('live')
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [now, setNow] = useState(0)
  const [loading, setLoading] = useState(true)
  const [k, setK] = useState(1)
  const [region, setRegion] = useState<'national' | number>('national')

  const fetchIt = useCallback((src: Source) => {
    setLoading(true)
    const ac = new AbortController()
    ;(src === 'live' ? loadForecast(ac.signal) : loadStoredForecast()).then((f) => {
      if (ac.signal.aborted) return
      // A stored forecast is replayed at the moment it was fetched, exactly as run_scheduler.py does.
      setNow(f.live ? Date.now() : f.fetchedAt.getTime())
      setForecast(f)
      setLoading(false)
    }).catch(() => { if (!ac.signal.aborted) setLoading(false) })
    return ac
  }, [])
  useEffect(() => { const ac = fetchIt(source); return () => ac.abort() }, [source, fetchIt])

  const jobs: PlanJob[] = useMemo(() => (results?.jobs ?? []).map((j) => ({ name: j.name, slots: j.duration_slots, energy: j.energy_kwh ?? 0.001 })), [results])
  const series = useMemo(() => (forecast ? (region === 'national' ? forecast.national : forecast.regional[region] ?? []) : []), [forecast, region])
  const plan = useMemo(() => (forecast && jobs.length ? planTonight(now, series, jobs, k) : null), [forecast, jobs, k, now, series])

  const saving = plan && plan.baseTotal && plan.bestTotal != null ? (100 * (plan.baseTotal - plan.bestTotal)) / plan.baseTotal : null
  const lastEnd = plan ? Math.max(...plan.rows.map((r) => r.best.end)) : 0
  const ci22 = plan ? series.find((s) => s.t === plan.win.cronRelease)?.ci ?? null : null

  // Cross-check against the Python reference when both planned the same stored forecast.
  const comparable = !!(py && forecast && !forecast.live && region === 'national' && py.capacity_k === k && Date.parse(py.forecast.fetched_at_utc.replace(/Z$/, ':00Z')) === forecast.fetchedAt.getTime())
  const matches = comparable && plan ? plan.rows.every((r) => { const q = py!.jobs.find((j) => j.job === r.name); return q && Date.parse(q.start_utc) === r.best.start && Date.parse(q.end_utc) === r.best.end }) : null

  const times = useMemo(() => {
    if (!plan) return []
    const out: number[] = []
    for (let t = plan.win.cronRelease - 2 * 3600e3; t < plan.win.deadline + 3600e3; t += SLOT_MS) out.push(t)
    return out
  }, [plan])
  const byT = useMemo(() => new Map(series.map((s) => [s.t, s.ci])), [series])

  return (
    <Page wide>
      <PageHead title="Plan tonight"
        lede="Tonight's real carbon forecast, and where GreenShift would run each nightly job. This page runs the same P4 policy as the Python scheduler, in the browser."
        meta={forecast ? (forecast.live ? <Stamp tone="running">Live forecast</Stamp> : <Stamp tone="lead">Stored forecast</Stamp>) : null}
        actions={<>
          <Segmented label="Forecast source" value={source} onChange={setSource} options={[['live', 'Live API'], ['stored', 'Stored copy']]} />
          <Segmented label="Capacity" value={k} onChange={setK} options={[[1, 'k = 1'], [2, 'k = 2']]} />
          <Button icon={RefreshCw} loading={loading} onClick={() => fetchIt(source)}>Refresh</Button>
        </>} />

      {forecast && !forecast.live && (
        <div className="mb-6">
          <Notice tone="possible">
            {source === 'live' ? 'The live API could not be reached, so this is ' : 'This is '}the stored forecast fetched {forecast.fetchedAt.toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' })} UK time, replayed as of that moment. It is not tonight's forecast.
          </Notice>
        </div>
      )}

      {!plan ? (
        loading || !results ? <Skeleton className="h-[420px] w-full rounded-[10px]" /> : <EmptyNote tone="failed" title="No plan could be made">The forecast does not cover a night window long enough for the jobs. Try the stored copy.</EmptyNote>
      ) : (
        <>
          <StatsStrip stats={[
            { n: saving != null ? `${saving.toFixed(1)}%` : '—', label: 'Forecast CO₂ saving', note: saving != null ? 'Expected, from the forecast; the real saving is only known after the night' : 'Forecast incomplete, so cron is kept' },
            { n: ci22 != null ? `${Math.round(ci22)}` : '—', label: 'gCO₂/kWh at 22:00', note: `Night of ${day(plan.win.cronRelease)}` },
            { n: clock(lastEnd), label: 'Last job finishes', note: `Deadline ${clock(plan.win.deadline)} UK` },
            { n: plan.rows.every((r) => r.best.end <= plan.win.deadline) ? 'Met' : 'Missed', label: 'Deadline', color: plan.rows.every((r) => r.best.end <= plan.win.deadline) ? 'var(--vx-strong)' : 'var(--vx-fail)', note: `${plan.rows.length} jobs, at most ${k} at once` },
          ]} />

          <SectionHead title="Tonight's window" tip="Shaded: the 22:00-07:00 window. Upper rows of each job: cron. Lower violet bars: GreenShift's plan.">
            <Labelled label="Region" htmlFor="region">
              <select id="region" value={String(region)} onChange={(e) => setRegion(e.target.value === 'national' ? 'national' : Number(e.target.value))}
                className="h-10 rounded-[8px] border border-vx-rule-strong bg-vx-sheet px-3 pr-8 text-[15px] text-vx-ink focus:border-vx-stamp focus:outline-none">
                <option value="national">Great Britain (national)</option>
                {REGIONS.filter((id) => forecast?.regional[id]?.length).map((id) => <option key={id} value={id}>{REGION_NAMES[id]}</option>)}
              </select>
            </Labelled>
          </SectionHead>
          <Panel>
            <Timeline label="Forecast carbon intensity tonight with cron and GreenShift job placements" times={times} slotMs={SLOT_MS}
              window={{ from: plan.win.cronRelease, to: plan.win.deadline }}
              lines={[{ name: region === 'national' ? 'GB forecast' : `${REGION_NAMES[region as number]} forecast`, color: INK.violet, values: times.map((t) => byT.get(t) ?? null) }]}
              rows={plan.rows.map((r) => ({ label: r.name, blocks: [{ start: r.base.start, end: r.base.end, kind: 'base' as const }, { start: r.best.start, end: r.best.end, kind: 'best' as const }] }))}
              tick={(t) => new Date(t).getUTCMinutes() === 0 && new Date(t).getUTCHours() % 2 === 0} fmt={clock} />
            {region !== 'national' && <p className="mt-2 text-[14.5px] text-vx-ink-3">Regional view is a what-if: the API publishes no regional actuals, so the backtest and the Python demo use the national series.</p>}
          </Panel>

          <SectionHead title="Decision log" count={plan.rows.length} tip="Why each job runs where it does. The Python command writes the same log to results/plans/ for audit." />
          <Register caption="Decision log">
            <thead><tr><th>Job</th><th>Cron slot</th><th>Planned slot</th><th className="num">g/kWh at cron</th><th className="num">g/kWh planned</th><th className="num">Change</th><th>Reason</th></tr></thead>
            <tbody>{plan.rows.map((r) => (
              <tr key={r.name}>
                <td className="font-vxmono text-[14px]">{r.name}</td>
                <td className="whitespace-nowrap">{clock(r.base.start)}–{clock(r.base.end)}</td>
                <td className="whitespace-nowrap font-semibold">{clock(r.best.start)}–{clock(r.best.end)}</td>
                <td className="num">{r.baseCi?.toFixed(1) ?? '—'}</td>
                <td className="num">{r.bestCi?.toFixed(1) ?? '—'}</td>
                <td className="num">{r.savingPct == null ? '—' : `${r.savingPct > 0 ? '−' : '+'}${Math.abs(r.savingPct).toFixed(1)}%`}</td>
                <td className="w-[32%] min-w-[220px] text-[14.5px] text-vx-ink-2">{reason(r)}</td>
              </tr>
            ))}</tbody>
          </Register>

          <SectionHead title="Python reference" tip="scripts/run_scheduler.py --dry-run --offline plans the stored forecast with the reference scheduler and saves the plan; the browser plan must match it slot for slot.">
            {comparable ? (matches ? <Stamp tone="strong" press>Matches Python</Stamp> : <Stamp tone="failed">Differs from Python</Stamp>) : <Stamp tone="queued">Not comparable now</Stamp>}
          </SectionHead>
          <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
            <Field label="Reference plan" value={py ? `Night of ${py.night}, k=${py.capacity_k}` : undefined} empty="Not exported; run run_all.py" note={py ? `Stored forecast fetched ${py.forecast.fetched_at_utc}` : undefined} />
            <Field label="Check" value={comparable ? (matches ? 'Every job starts and ends in the same slot' : 'At least one job differs') : 'Switch to “Stored copy”, GB and k=1 to compare'} />
            <Field label="Run it in a terminal"><CopyValue value="python scripts/run_scheduler.py --dry-run" /></Field>
            <Field label="Offline rehearsal" tip="Uses the stored forecast and says so; it never relabels an old forecast as tonight's."><CopyValue value="python scripts/run_scheduler.py --dry-run --offline" /></Field>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-vx-ink-3"><TerminalSquare className="mr-1.5 inline h-4 w-4 align-[-3px]" aria-hidden="true" />On the Windows laptop, <span className="font-vxmono">--now --job daily_sales_report</span> runs one real Spark job under the RAPL meter. <Tip text="It refuses to run without RAPL, and reports grams with the actual intensity only once NESO publishes it." /></p>
        </>
      )}
    </Page>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { NightPlan } from '../components/NightPlan'
import { REGION_NAMES } from '../lib/data'
import { clock, day, hm, reason, SLOT_MS, type Placed } from '../lib/plan'
import { DEFAULT_SLOTS, usePlans, useTonight } from '../lib/useTonight'

const LENGTHS = [1, 2, 3, 4] // half-hours
const REGIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export function Tonight() {
  const { forecast, energy, error } = useTonight()
  const [region, setRegion] = useState<number | 'national'>('national')
  const [lengths, setLengths] = useState<Record<string, number>>({})
  const [mode, setMode] = useState<'greenshift' | 'cron'>('greenshift')
  const [manual, setManual] = useState<Record<string, number>>({})

  const jobs = useMemo(() => (energy?.jobs ?? []).map((j) => ({ name: j.name, slots: lengths[j.name] ?? DEFAULT_SLOTS })), [energy, lengths])
  const plans = usePlans(forecast, region, jobs)
  const win = plans?.win
  useEffect(() => setManual({}), [region, lengths])

  const shown: Placed[] = useMemo(() => {
    if (!plans || !win) return []
    const base = mode === 'cron' ? plans.base.jobs : plans.best.jobs
    return base.map((p) => {
      const s = manual[p.name]
      if (s == null) return p
      const n = (p.end - p.start) / SLOT_MS
      const m = mean(plans.ci, s, n)
      return { ...p, start: win.release + s * SLOT_MS, end: win.release + (s + n) * SLOT_MS, meanCi: m }
    })
  }, [plans, win, mode, manual])

  function move(name: string, s: number) {
    if (!plans || !win) return
    const p = shown.find((q) => q.name === name)!
    const n = (p.end - p.start) / SLOT_MS
    if (s < 0 || s + n > plans.ci.length) return
    const clash = shown.some((q) => q.name !== name && s < (q.end - win.release) / SLOT_MS && (q.start - win.release) / SLOT_MS < s + n)
    if (clash) return
    setManual((m) => ({ ...m, [name]: s }))
  }

  if (error) return <Shell><p className="text-[19px]">Could not load the plan: {error}</p></Shell>
  if (!forecast || !win || !plans || !energy) return <Shell><p className="text-[19px]">Reading tonight’s forecast…</p></Shell>

  const sum = summary(plans.base.jobs, shown)
  const place = region === 'national' ? 'Great Britain' : REGION_NAMES[region]

  return (
    <Shell>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-[clamp(40px,5vw,72px)] font-extrabold">
          {win.running ? 'Tonight, running now' : 'Tonight'} · {day(win.release)}
        </h1>
        <p className={`rounded-full px-4 py-1.5 text-[15px] font-bold ${forecast.live ? 'bg-paper-2 text-ink' : 'bg-high text-paper'}`} role="status">
          {forecast.live ? 'Live forecast' : 'Offline: stored forecast'} · fetched {day(forecast.fetchedAt.getTime())} {clock(forecast.fetchedAt.getTime())}
        </p>
      </div>
      <p className="mt-3 text-[19px]">
        Release {clock(win.release)}, deadline {clock(win.deadline)} UK time · {place} · Carbon Intensity API, NESO
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-8" aria-label="Plan settings">
          <label className="block">
            <span className="block text-[16px] font-bold">Grid region</span>
            <select
              value={String(region)}
              onChange={(e) => setRegion(e.target.value === 'national' ? 'national' : Number(e.target.value))}
              className="mt-2 w-full rounded-md bg-paper-2 px-3 py-2.5 text-[17px] text-ink"
            >
              <option value="national">Great Britain (national)</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {REGION_NAMES[r]}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-[16px] font-bold">Plan</legend>
            <div className="mt-2 grid grid-cols-2 rounded-full bg-paper-2 p-1 text-[16px]">
              {(['greenshift', 'cron'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    setMode(m)
                    setManual({})
                  }}
                  className="rounded-full px-3 py-2 font-bold transition-colors duration-200 aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  {m === 'greenshift' ? 'GreenShift' : 'Cron 22:00'}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[16px] font-bold">Job length</legend>
            <p className="mt-1 text-[14px] text-ink-2">30 min each by default (Wiesner et al. Scenario I) until our SF5 timings are measured.</p>
            <div className="mt-3 space-y-3">
              {energy.jobs.map((j) => (
                <label key={j.name} className="flex items-center justify-between gap-3 text-[16px]">
                  <span>{j.name.replaceAll('_', ' ')}</span>
                  <select
                    value={lengths[j.name] ?? DEFAULT_SLOTS}
                    onChange={(e) => setLengths((l) => ({ ...l, [j.name]: Number(e.target.value) }))}
                    className="rounded-md bg-paper-2 px-2 py-1.5 text-ink"
                  >
                    {LENGTHS.map((n) => (
                      <option key={n} value={n}>
                        {hm(n * 30)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          {Object.keys(manual).length > 0 && (
            <button type="button" onClick={() => setManual({})} className="text-[16px] font-bold text-ink underline">
              Undo my moves
            </button>
          )}
        </aside>

        <div>
          {sum && (
            <p className="max-w-[64ch] text-[21px] leading-relaxed">
              {mode === 'cron' && !Object.keys(manual).length ? (
                <>All five jobs run back to back from {clock(win.release)} at {Math.round(sum.base)} g/kWh on average.</>
              ) : (
                <>
                  This plan runs the jobs at <strong>{Math.round(sum.shown)} g/kWh</strong> on average, against {Math.round(sum.base)} at the cron time:{' '}
                  <strong className={sum.pct >= 0 ? 'text-low' : 'text-high'}>
                    {sum.pct >= 0 ? `${sum.pct}% less` : `${-sum.pct}% more`} carbon per kWh
                  </strong>
                  . Last job ends {clock(sum.lastEnd)}, {sum.lastEnd <= win.deadline ? 'before the deadline' : 'after the deadline'}; longest wait {hm(sum.maxDelayMin)}.
                </>
              )}
            </p>
          )}
          <p className="mt-2 text-[15px] text-ink-2">Drag a job, or focus it and use the arrow keys, to try another slot. Dashed outlines show the cron time.</p>

          <div className="mt-8">
            <NightPlan ci={plans.ci} release={win.release} baseline={plans.base.jobs} plan={shown} onMove={move} />
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-[17px]">
              <caption className="mb-3 text-left text-[18px] font-bold text-ink">Decision log</caption>
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="py-2 pr-4">Job</th>
                  <th className="py-2 pr-4">Cron</th>
                  <th className="py-2 pr-4">Runs</th>
                  <th className="py-2 pr-4 text-right">g/kWh</th>
                  <th className="py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const b = plans.base.jobs.find((q) => q.name === p.name)!
                  return (
                    <tr key={p.name} className={/* taste-skill-ignore: real table row */ 'border-b border-paper-3 align-top'}>
                      <td className="py-3 pr-4 font-bold">{p.name.replaceAll('_', ' ')}</td>
                      <td className="py-3 pr-4">{clock(b.start)}</td>
                      <td className="py-3 pr-4">
                        {clock(p.start)}–{clock(p.end)}
                      </td>
                      <td className="py-3 pr-4 text-right">{p.meanCi == null ? '–' : Math.round(p.meanCi)}</td>
                      <td className="py-3">{manual[p.name] != null ? 'Moved by hand.' : reason(b, p)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-[70ch] text-[15px] text-ink-2">
            Forecast-based plan: the backtest counts emissions with the actual intensity afterwards. Percentages are per kWh, so they hold whatever each job’s energy turns out to be.
          </p>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-10 sm:px-8">{children}</div>
}

function mean(ci: (number | null)[], s: number, n: number): number | null {
  let t = 0
  for (let k = s; k < s + n; k++) {
    if (ci[k] == null) return null
    t += ci[k]!
  }
  return t / n
}

function summary(base: Placed[], shown: Placed[]) {
  if (base.some((j) => j.meanCi == null) || shown.some((j) => j.meanCi == null)) return null
  // Energy-weighted by duration: each slot of each job counts once.
  const w = (js: Placed[]) => js.reduce((s, j) => s + j.meanCi! * (j.end - j.start), 0) / js.reduce((s, j) => s + (j.end - j.start), 0)
  const b = w(base), p = w(shown)
  return {
    base: b,
    shown: p,
    pct: Math.round((100 * (b - p)) / b),
    lastEnd: Math.max(...shown.map((j) => j.end)),
    maxDelayMin: Math.round(Math.max(0, ...shown.map((j) => j.start - base.find((q) => q.name === j.name)!.start)) / 60000),
  }
}

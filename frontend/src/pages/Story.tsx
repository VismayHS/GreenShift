import { useEffect, useMemo, useState } from 'react'
import { CarbonField } from '../components/CarbonField'
import { HistoryField, ProfileChart } from '../components/Charts'
import { NightPlan } from '../components/NightPlan'
import CountUp from '../components/reactbits/CountUp'
import { LEGEND, SERIES } from '../lib/colour'
import { loadEda, loadHistory, loadRegions, loadResults, type Eda, type History, type Regions, type Results } from '../lib/data'
import { clock, day, hm, reason } from '../lib/plan'
import { DEFAULT_SLOTS, usePlans, useTonight } from '../lib/useTonight'
import { useReveal } from '../lib/useWidth'

const HOUR = 3600 * 1000

function Section({ id, title, lead, children, tone }: { id: string; title: string; lead: React.ReactNode; children: React.ReactNode; tone?: 'field' }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <section id={id} className={tone === 'field' ? 'bg-paper-2 py-24 sm:py-32' : 'py-24 sm:py-36'}>
      <div ref={ref} className="rise mx-auto max-w-[1440px] px-4 sm:px-8">
        <h2 className="max-w-[18ch] text-[clamp(40px,6vw,88px)] font-extrabold">{title}</h2>
        <div className="mt-6 max-w-[62ch] text-[20px] leading-relaxed">{lead}</div>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  )
}

function Fact({ value, decimals = 0, suffix = '', children }: { value: number; decimals?: number; suffix?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[clamp(48px,6vw,80px)] font-extrabold leading-none tracking-[-0.04em]">
        <CountUp to={value} decimals={decimals} duration={1.4} suffix={suffix} />
      </p>
      <p className="mt-3 max-w-[30ch] text-[18px] leading-snug">{children}</p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-[14px]" aria-label="Colour scale, gCO2/kWh">
      <span className="mr-2 font-bold">gCO2/kWh</span>
      {LEGEND.slice(0, 10).map((b) => (
        <span key={b.from} className="flex items-center gap-1 pr-2">
          <span className="inline-block h-4 w-6 rounded-sm" style={{ background: b.color }} />
          {b.to == null ? `${b.from}+` : b.from}
        </span>
      ))}
    </div>
  )
}

export function Story() {
  const { forecast, energy } = useTonight()
  const [hist, setHist] = useState<History | null>(null)
  const [regs, setRegs] = useState<Regions | null>(null)
  const [eda, setEda] = useState<Eda | null>(null)
  const [res, setRes] = useState<Results | null>(null)
  useEffect(() => {
    loadHistory().then(setHist)
    loadRegions().then(setRegs)
    loadEda().then(setEda)
    loadResults().then(setRes)
  }, [])

  const jobs = useMemo(() => (energy?.jobs ?? []).map((j) => ({ name: j.name, slots: DEFAULT_SLOTS })), [energy])
  const plans = usePlans(forecast, 'national', jobs)
  const win = plans?.win
  const saving = plans && plansSaving(plans.base.jobs, plans.best.jobs)

  return (
    <>
      {/* First viewport: tonight's grid as a synoptic chart. */}
      <section className="mx-auto max-w-[1440px] px-4 pb-16 pt-10 sm:px-8 sm:pt-14">
        <h1 className="max-w-[15ch] text-[clamp(52px,8.4vw,128px)] font-extrabold leading-[0.9] tracking-[-0.045em] lg:max-w-none">Run tonight’s jobs in the low.</h1>
        <div className="mt-8 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div className="max-w-[52ch]">
            <p className="text-[20px] leading-relaxed">
              GreenShift reads the GB grid’s carbon forecast and moves flexible nightly Spark jobs into its cleanest half-hours, without missing the 07:00 deadline.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="#/tonight" className="rounded-full bg-low px-7 py-3.5 text-[19px] font-bold text-paper no-underline transition-colors duration-200 hover:bg-low-2 active:scale-[0.97] motion-reduce:active:scale-100">
                Plan tonight
              </a>
              <a href="#s-measure" className="text-[18px] font-bold text-ink">
                How we measured
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10">
          {forecast && win ? (
            <>
              <CarbonField forecast={forecast} from={win.release - 4 * HOUR} to={win.deadline + 5 * HOUR} release={win.release} deadline={win.deadline} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <Legend />
                <p className="text-[15px] text-ink-2">
                  {forecast.live ? 'Live' : 'Stored'} regional forecast, fetched {day(forecast.fetchedAt.getTime())} {clock(forecast.fetchedAt.getTime())} UK time
                  {forecast.live ? '' : ' (offline copy)'}. Carbon Intensity API, NESO.
                </p>
              </div>
            </>
          ) : (
            <div className="grid h-[460px] place-items-center rounded bg-paper-2 text-[18px]">Reading tonight’s forecast…</div>
          )}
        </div>

        {plans && win && saving && (
          <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="text-[clamp(32px,3.6vw,52px)] font-extrabold">Tonight’s five jobs, moved.</h2>
              <p className="mt-4 text-[19px] leading-relaxed">
                At the {clock(win.release)} cron time the jobs would run at {Math.round(saving.base)} g/kWh on average. GreenShift’s plan runs them at {Math.round(saving.best)}:
                <strong> {saving.pct}% less carbon per kWh</strong>, every job done by {clock(win.deadline)}, longest wait {hm(Math.round(saving.maxDelay / 60000))}.
              </p>
              <p className="mt-4 text-[15px] text-ink-2">National forecast. Each job assumed 30 min, as in Wiesner et al. Scenario I, until our SF5 timings are in.</p>
            </div>
            <NightPlan ci={plans.ci} release={win.release} baseline={plans.base.jobs} plan={plans.best.jobs} compact />
          </div>
        )}
      </section>

      <Section
        id="s-history"
        tone="field"
        title="Every half‑hour is different."
        lead={
          <p>
            Two years of the GB grid, 35,088 half-hours, as one chart. Green bands are clean power, brick bands are gas. Nights and weekends run cleaner, and in summer the cleanest hour is often lunchtime, when solar peaks.
          </p>
        }
      >
        {hist ? <HistoryField history={hist} /> : <div className="h-[520px]" />}
        <div className="mt-6">
          <Legend />
        </div>
        {eda && (
          <>
            <div className="mt-20 grid gap-12 md:grid-cols-3">
              <Fact value={eda.mean_22_to_07_local} decimals={1}>
                g/kWh on average between 22:00 and 07:00, against {eda.mean_07_to_22_local} during the day.
              </Fact>
              <Fact value={Math.round(eda.share_of_days_min_in_local_hour ? 100 * nightShare(eda) : 0)} suffix="%">
                of days have their cleanest half-hour inside the nightly window. On the rest it falls around midday.
              </Fact>
              <Fact value={eda.mean_weekend} decimals={1}>
                g/kWh at weekends, against {eda.mean_weekday} on weekdays.
              </Fact>
            </div>
            <div className="mt-20">
              <h3 className="text-[28px] font-bold">The same day in four seasons</h3>
              <ProfileChart
                label="Mean national carbon intensity by half-hour of day for each season, 2024-25"
                series={['Winter', 'Spring', 'Summer', 'Autumn'].map((s, i) => ({
                  name: s,
                  color: SERIES[i],
                  values: Array.from({ length: 48 }, (_, k) => eda.hourly_mean_by_season_local[s]?.[(k / 2).toFixed(1)] ?? null),
                }))}
              />
            </div>
          </>
        )}
      </Section>

      <Section
        id="s-regions"
        title="Where it runs matters more."
        lead={
          <p>
            The same half-hour can be eleven times cleaner in one part of Britain than another. In the regional mix, wind supplies 57 to 80% of Scotland’s power and gas 63% of South Wales’s. A data centre’s region sets its baseline before any scheduling starts.
          </p>
        }
      >
        {regs && (
          <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
            <ol className="space-y-3" aria-label="Mean forecast carbon intensity by region, 2024-25">
              {[...regs.regions].sort((a, b) => a.mean - b.mean).map((r) => (
                <li key={r.id} className="grid grid-cols-[11ch_1fr] items-center gap-4 text-[17px] sm:grid-cols-[17ch_1fr]">
                  <span>{r.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="block h-7 rounded-r" style={{ width: `${(r.mean / 260) * 100}%`, background: regionColour(r.mean) }} />
                    <span className="font-bold">{Math.round(r.mean)}</span>
                  </span>
                </li>
              ))}
            </ol>
            <ProfileChart
              label="Mean forecast carbon intensity by half-hour of day per region, 2024-25"
              series={[...regs.regions].sort((a, b) => a.mean - b.mean).map((r, i) => ({ name: r.name, color: SERIES[i], values: r.profile_local }))}
            />
          </div>
        )}
      </Section>

      <Section
        id="s-forecast"
        tone="field"
        title="Good enough to plan on."
        lead={
          <p>
            The scheduler decides on the forecast and is judged on what actually happened. Over 2024-25 the national forecast missed by {eda ? eda.forecast_error.mae.toFixed(1) : '…'} g/kWh on average, with almost no bias.
          </p>
        }
      >
        {eda && (
          <div className="grid gap-12 md:grid-cols-3">
            <Fact value={eda.forecast_error.mae} decimals={1}>
              g/kWh mean absolute error over {eda.forecast_error.n.toLocaleString('en-GB')} half-hours: {eda.forecast_error.mae_pct_of_mean.toFixed(1)}% of the mean. Wiesner et al. assumed 5% for 2020.
            </Fact>
            <Fact value={eda.forecast_error.bias} decimals={2}>
              g/kWh bias. The forecast is not systematically high or low, so shifting on it does not flatter the result.
            </Fact>
            <Fact value={eda.neso_vs_api_actual.pearson_r} decimals={3}>
              correlation between the API’s actual values and NESO’s own historic record, our independent check of the data.
            </Fact>
          </div>
        )}
        <p className="mt-12 max-w-[62ch] text-[18px] leading-relaxed">
          Three outages in the source left the national forecast blank for 8 to 16 hours (11 June 2024, 12 January 2025, 10 August 2025). We do not fill those for decisions: on a night with no forecast, the job runs at the cron time.
        </p>
      </Section>

      <Section
        id="s-measure"
        title="We measured the energy."
        lead={
          <p>
            Shifting changes when a job runs, not how much energy it uses. We read Intel RAPL energy counters on an {energy?.cpu ?? 'Intel i5-12450H'} while Spark ran, and checked them against a utilisation model.
          </p>
        }
      >
        {energy && (
          <div className="grid gap-16 lg:grid-cols-[1.3fr_1fr]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-[17px]">
                <caption className="mb-3 text-left text-[15px] text-ink-2">Energy meter validation: RAPL package energy against the linear utilisation model.</caption>
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="py-2 pr-4">Machine</th>
                    <th className="py-2 pr-4">Test</th>
                    <th className="py-2 pr-4 text-right">Time</th>
                    <th className="py-2 pr-4 text-right">RAPL</th>
                    <th className="py-2 text-right">Model</th>
                  </tr>
                </thead>
                <tbody>
                  {energy.validation.map((v) => (
                    <tr key={v.machine + v.test} className={/* taste-skill-ignore: real table row */ 'border-b border-paper-3'}>
                      <td className="py-2 pr-4">{v.machine}</td>
                      <td className="py-2 pr-4">{v.test}</td>
                      <td className="py-2 pr-4 text-right">{v.duration_s} s</td>
                      <td className="py-2 pr-4 text-right font-bold">{v.rapl_j} J</td>
                      <td className="py-2 text-right">
                        {v.model_j} J{v.note ? '*' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[15px] text-ink-2">
                * The model’s default limits came from the Windows run; it is recalibrated against RAPL before use on Linux. Idle package power: {energy.idle_w['Windows 11']} W (Windows), {energy.idle_w['Ubuntu 24.04']} W (Linux).
              </p>
            </div>
            <div>
              <h3 className="text-[28px] font-bold">Five nightly jobs from 99 queries</h3>
              <p className="mt-3 text-[18px] leading-relaxed">All 99 TPC-DS-derived queries run on Spark 4.2. The jobs group them the way a data team would. Times are at scale factor 1; the measured runs use SF5.</p>
              <ul className="mt-6 space-y-4">
                {energy.jobs.map((j) => (
                  <li key={j.name}>
                    <p className="font-bold">
                      {j.name.replaceAll('_', ' ')} <span className="font-normal text-ink-2">· {j.queries.length} queries · {j.sf1_seconds} s at SF1</span>
                    </p>
                    <p className="text-[16px] text-ink-2">{j.character}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Section>

      <Section
        id="s-decide"
        tone="field"
        title="How a job gets moved."
        lead={
          <p>
            Jobs are released at 22:00 and must finish by 07:00 UK time. Inside that window the scheduler picks, for each job, the run of half-hours with the lowest forecast that still lets every other job finish. If nothing better fits, the job runs at the cron time. Every move is written down with its reason.
          </p>
        }
      >
        {plans && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[17px]">
              <caption className="mb-3 text-left text-[15px] text-ink-2">Tonight’s decision log (national forecast, 30-min jobs).</caption>
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="py-2 pr-4">Job</th>
                  <th className="py-2 pr-4">Cron</th>
                  <th className="py-2 pr-4">Planned</th>
                  <th className="py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {plans.best.jobs.map((p) => {
                  const b = plans.base.jobs.find((q) => q.name === p.name)!
                  return (
                    <tr key={p.name} className={/* taste-skill-ignore: real table row */ 'border-b border-paper-3 align-top'}>
                      <td className="py-3 pr-4 font-bold">{p.name.replaceAll('_', ' ')}</td>
                      <td className="py-3 pr-4">{clock(b.start)}</td>
                      <td className="py-3 pr-4">{clock(p.start)}</td>
                      <td className="py-3">{reason(b, p)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        id="s-savings"
        title="What it saves, over two years."
        lead={
          <p>
            Tonight is one night. The claim rests on replaying the scheduler over all 731 nights of 2024-25, deciding on the forecast and counting emissions with the actual intensity.
          </p>
        }
      >
        {res?.backtest == null && (
          <div className="rounded bg-ink p-8 text-paper sm:p-12">
            <p className="text-[clamp(28px,3.4vw,44px)] font-extrabold leading-tight">The backtest has not run yet.</p>
            <p className="mt-4 max-w-[60ch] text-[19px] leading-relaxed text-paper/90">
              When it has, this section shows emissions saved against delay added for each policy, with zero missed deadlines. For comparison, Wiesner et al. (2021) report 4.3% saved with a ±2 h window and 7.4% with ±8 h for GB in 2020.
            </p>
          </div>
        )}
        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-[28px] font-bold">What this does not show</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[18px] leading-relaxed">
              <li>Average, not marginal, carbon intensity: the standard location-based method, but not the plant that answers an extra kWh.</li>
              <li>RAPL covers the CPU package only: no memory, disk, network or cooling.</li>
              <li>One laptop, not a cluster. Percentages carry over; grams scale with the hardware.</li>
              <li>If every flexible load chased the same low, the low would move.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-[28px] font-bold">Where the numbers come from</h3>
            <p className="mt-4 text-[18px] leading-relaxed">
              Carbon data: Carbon Intensity API, NESO (CC BY 4.0), 1 Jan 2024 to 1 Jan 2026, national and seven regions. Energy: our own RAPL readings. Every figure on this page is produced by the scripts in the repository and exported to this site.
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}

function nightShare(eda: Eda) {
  return Object.entries(eda.share_of_days_min_in_local_hour).reduce((s, [h, v]) => (Number(h) >= 22 || Number(h) < 7 ? s + v : s), 0)
}

function regionColour(mean: number) {
  return mean < 60 ? 'var(--color-low)' : mean < 130 ? '#7cb08d' : 'var(--color-high)'
}

function plansSaving(base: { start: number; meanCi: number | null }[], best: { start: number; meanCi: number | null }[]) {
  const b = base.map((j) => j.meanCi), p = best.map((j) => j.meanCi)
  if (b.some((v) => v == null) || p.some((v) => v == null)) return null
  const mb = b.reduce<number>((s, v) => s + (v ?? 0), 0) / b.length
  const mp = p.reduce<number>((s, v) => s + (v ?? 0), 0) / p.length
  // Both lists are in catalogue order, so index i is the same job.
  const maxDelay = Math.max(0, ...best.map((j, i) => j.start - base[i].start))
  return { base: mb, best: mp, pct: Math.round((100 * (mb - mp)) / mb), maxDelay }
}

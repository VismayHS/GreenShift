import { ArrowRight, Ruler } from 'lucide-react'
import { Button, EmptyNote, Field, Page, PageHead, Register, SectionHead, Skeleton, Stamp } from '../vx/primitives'
import { FirstStepCallout, ListCard, StatsStrip } from '../vx/recipes'
import { minutes, pct, useEda, useEnergy, useResults } from '../lib/hooks'
import { POLICY_NAME } from '../lib/data'

export function Summary() {
  const { data: r, error } = useResults()
  const { data: eda } = useEda()
  const { data: energy } = useEnergy()
  const placeholder = r?.status === 'placeholder'
  const h = r?.headline
  const rep2 = r?.table2.find((x) => x.window_h === 2 && x.forecast_mode === 'noisy')

  return (
    <Page>
      <PageHead
        title="Carbon-aware nightly batch scheduling"
        lede="A data team runs Spark jobs every night between 22:00 and 07:00. GreenShift reads the GB grid's carbon forecast and moves each job into the cleanest window that still finishes before the deadline, then reports the carbon saved and the delay added."
        actions={<Button variant="primary" href="#/tonight" icon={ArrowRight}>Plan tonight</Button>}
      />

      {placeholder && (
        <FirstStepCallout icon={Ruler} step="Step 1 · Pending" title="Finish the RAPL measurement campaign"
          action={<Button href="#/energy" size="sm">See the campaign</Button>}>
          Percentages below come from the full 2024-25 backtest with placeholder job lengths. Grams and kilograms appear once five clean runs per job are measured.
        </FirstStepCallout>
      )}

      {error && <EmptyNote tone="failed" title="Results could not be loaded">{error}. Run <code>python scripts/run_all.py --skip-measure</code> and reload.</EmptyNote>}
      {!r && !error && <Skeleton className="h-[132px] w-full rounded-[10px]" />}
      {h && r && (
        <StatsStrip stats={[
          { n: pct(h.api.saved_pct), label: 'CO₂ saved, real forecast', note: `${POLICY_NAME[h.policy]}, k=${h.capacity_k}; 95% CI ${h.api.ci_low.toFixed(1)} to ${h.api.ci_high.toFixed(1)}%` },
          { n: pct(h.oracle.saved_pct), label: 'Perfect-forecast ceiling', note: 'Oracle mode: an upper bound, never a claim' },
          { n: minutes(h.api.delay_median_min), label: 'Median added delay', note: `p95 ${minutes(h.api.delay_p95_min)}; every job still ends by 07:00` },
          { n: r.deadline_misses_total, label: 'Deadline misses', color: r.deadline_misses_total === 0 ? 'var(--vx-strong)' : 'var(--vx-fail)', note: `Every backtest row: ${r.nights_nightly} nights × every policy, forecast and seed` },
        ]} />
      )}

      <SectionHead title="The brief, answered" />
      <Register caption="Deliverables">
        <thead><tr><th>The brief asks</th><th>Where it is answered</th><th>State</th></tr></thead>
        <tbody>
          <tr>
            <td>Measure the energy use of representative Spark jobs</td>
            <td><a className="text-vx-stamp underline decoration-vx-stamp/40" href="#/energy">Energy measurement</a>: RAPL meter, protocol, validation, 5 TPC-DS-derived jobs</td>
            <td>{energy ? (energy.campaign.complete ? <Stamp tone="done">Measured</Stamp> : <Stamp tone="possible">Method done, campaign pending</Stamp>) : null}</td>
          </tr>
          <tr>
            <td>Use public grid carbon data to shift flexible jobs</td>
            <td><a className="text-vx-stamp underline decoration-vx-stamp/40" href="#/scheduler">Scheduler</a>: P0 to P4, forecast-only decisions, EDF deadline guard</td>
            <td><Stamp tone="done">Built and tested</Stamp></td>
          </tr>
          <tr>
            <td>Report emissions saved and any added delay</td>
            <td><a className="text-vx-stamp underline decoration-vx-stamp/40" href="#/results">Savings and delay</a> and <a className="text-vx-stamp underline decoration-vx-stamp/40" href="#/replication">paper replication</a></td>
            <td>{r ? (placeholder ? <Stamp tone="lead">Placeholder sizes</Stamp> : <Stamp tone="done">Final</Stamp>) : null}</td>
          </tr>
          <tr>
            <td>Record every dataset in a data card</td>
            <td><a className="text-vx-stamp underline decoration-vx-stamp/40" href="#/governance">Responsible AI</a>: 4 data cards, licences, limitations</td>
            <td><Stamp tone="done">Done</Stamp></td>
          </tr>
        </tbody>
      </Register>

      <SectionHead title="How a night is planned" />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListCard title="1. Read the forecast" stamp={<Stamp tone="info">NESO API</Stamp>}>
          <p className="mt-2 text-[15px] leading-relaxed text-vx-ink-2">Half-hourly GB carbon-intensity forecast for the next 48 hours. No key, CC BY 4.0. If the network is down, a stored copy is used and labelled.</p>
        </ListCard>
        <ListCard title="2. Size the jobs" stamp={<Stamp tone={placeholder ? 'lead' : 'done'}>{placeholder ? 'Placeholder' : 'Measured'}</Stamp>}>
          <p className="mt-2 text-[15px] leading-relaxed text-vx-ink-2">Each job's length and energy come from Intel RAPL readings of real Spark runs, scaled to a fleet. Until the campaign completes, documented placeholder lengths are used.</p>
        </ListCard>
        <ListCard title="3. Pick the cleanest feasible windows" stamp={<Stamp tone="info">P4</Stamp>}>
          <p className="mt-2 text-[15px] leading-relaxed text-vx-ink-2">Largest job first, into the window with the lowest mean forecast. Before accepting a slot, an earliest-deadline-first check proves every remaining job still fits before 07:00.</p>
        </ListCard>
        <ListCard title="4. Score against what actually happened" stamp={<Stamp tone="info">Actual CI</Stamp>}>
          <p className="mt-2 text-[15px] leading-relaxed text-vx-ink-2">Decisions only ever see the forecast. Emissions are always counted with the grid's actual intensity, so a bad forecast shows up as a smaller saving, never a hidden one.</p>
        </ListCard>
      </ul>

      <SectionHead title="What the data says" />
      <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
        <Field label="Night vs day, 2024-25" value={eda ? `${eda.mean_22_to_07_local.toFixed(1)} vs ${eda.mean_07_to_22_local.toFixed(1)} gCO₂/kWh` : undefined} note="22:00-07:00 vs 07:00-22:00 UK, national actual" />
        <Field label="Forecast error (MAE)" value={eda ? `${eda.forecast_error.mae.toFixed(2)} gCO₂/kWh` : undefined} note={eda ? `${eda.forecast_error.mae_pct_of_mean.toFixed(1)}% of the mean; Wiesner et al. assumed 5%` : undefined} />
        <Field label="Replication at ±2 h" value={rep2 ? `${rep2.saved_pct.toFixed(2)}% vs paper 4.3%` : undefined} note="One 30 min job a night, noisy forecast as in the paper" />
        <Field label="Backtest nights" value={r ? `${r.nights_nightly} of 731` : undefined} note={r ? `${r.nights_skipped} night-scenarios skipped for source outages, listed in backtest_meta.json` : undefined} />
      </div>
    </Page>
  )
}

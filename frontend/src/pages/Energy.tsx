import { EmptyNote, Field, Page, PageHead, Register, SectionHead, Skeleton, Stamp, Tip, type Tone } from '../vx/primitives'
import { ListCard } from '../vx/recipes'
import { ukDateTime, useEnergy, useResults } from '../lib/hooks'

const ATTEMPT: Record<string, { tone: Tone; label: string }> = {
  failed: { tone: 'failed', label: 'Failed' },
  interrupted: { tone: 'failed', label: 'Interrupted' },
  invalidated: { tone: 'rejected', label: 'Invalidated' },
  paused_by_user: { tone: 'skipped', label: 'Paused' },
  complete: { tone: 'done', label: 'Complete' },
}

const PROTOCOL = [
  'AC power, Windows “Best performance”, other apps closed; sleep is blocked and an AC disconnect aborts the session.',
  '60 s idle baseline at the start and the end of the session gives P_idle.',
  'One warm-up run per job (JIT, file cache), discarded.',
  'Five measured runs per job in randomised order, 20 s cool-down between runs.',
  'Per run: wall time, RAPL package and core joules, CPU utilisation, Spark executor CPU-seconds, bytes read and shuffled.',
  'Report gross (RAPL package) and attributable (gross − P_idle × duration) energy: mean, standard deviation, 95% CI. Accept a job only if its coefficient of variation is below 10%.',
  'kWh = J / 3.6×10⁶; gCO₂ = kWh × PUE × carbon intensity. PUE 1.0 for the laptop.',
]

export function EnergyPage() {
  const { data: e, error } = useEnergy()
  const { data: r } = useResults()
  const m = e?.campaign.machine as Record<string, string | number | boolean> | null | undefined

  return (
    <Page>
      <PageHead title="Energy measurement"
        lede="Energy is read from the CPU's own counters (Intel RAPL) while each Spark job runs, then idle power is subtracted so only the job's share is counted. Shifting a job does not change its energy; it changes the carbon per kWh it runs on." />
      {error && <EmptyNote tone="failed" title="Energy data could not be loaded">{error}</EmptyNote>}
      {!e && !error && <Skeleton className="h-40 w-full rounded-[10px]" />}

      {e && (
        <>
          <SectionHead title="Measurement campaign" tip="Five clean runs per job, idle-bookended, with a 10% variation gate. Only then do measured sizes replace the placeholders.">
            {e.campaign.complete ? <Stamp tone="done" press>Accepted</Stamp> : <Stamp tone="possible">Not yet accepted</Stamp>}
          </SectionHead>
          {e.campaign.complete && e.campaign.summary ? (
            <Register caption="Measured energy per job">
              <thead><tr>{Object.keys(e.campaign.summary[0]).map((k) => <th key={k}>{k.replaceAll('_', ' ')}</th>)}</tr></thead>
              <tbody>{e.campaign.summary.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className={typeof v === 'number' ? 'num' : ''}>{typeof v === 'number' ? v.toPrecision(4) : v}</td>)}</tr>)}</tbody>
            </Register>
          ) : (
            <EmptyNote tone="possible" title="No session has passed the quality gate yet">
              {e.campaign.attempts.length} sessions were run on the Windows laptop and each stopped before completing, for the reasons listed below. Their readings are kept and never pooled. The longest has 16 runs but no closing idle baseline, and its attributable energy varies by more than 10% between runs, so it is not used for sizing.
            </EmptyNote>
          )}
          <div className="mt-4">
            <Register caption="Measurement sessions">
              <thead><tr><th>Session</th><th>State</th><th className="num">Runs</th><th className="num">Jobs</th><th>Why it stopped</th></tr></thead>
              <tbody>
                {e.campaign.attempts.map((a) => (
                  <tr key={a.id}>
                    <td className="font-vxmono text-[14px]">{a.id}</td>
                    <td><Stamp tone={(ATTEMPT[a.status] ?? { tone: 'info' as Tone }).tone}>{(ATTEMPT[a.status] ?? { label: a.status }).label}</Stamp></td>
                    <td className="num">{a.runs}</td>
                    <td className="num">{a.jobs_covered}</td>
                    <td className="max-w-[56ch] text-[14.5px] text-vx-ink-2">{a.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Register>
          </div>

          {m && (
            <>
              <SectionHead title="Measurement machine" />
              <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
                <Field label="CPU" value={String(m.cpu)} />
                <Field label="RAM" value={`${(Number(m.ram_bytes) / 2 ** 30).toFixed(1)} GiB`} />
                <Field label="OS" value={String(m.os)} />
                <Field label="Sensor" value="RAPL via Windows Energy Meter Interface" note="PKG and PP0 domains; no DRAM counter" />
                <Field label="Checked" value={m.recorded_at_utc ? ukDateTime(String(m.recorded_at_utc)) : undefined} />
                <Field label="Workload" value={`TPC-DS SF${e.scale_factor ?? 1}, Spark 4.2 local mode`} note="SF5 ran out of heap twice; SF1 with repeated query batches keeps each run above 30 s" />
              </div>
            </>
          )}

          <SectionHead title="Three signals" />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ListCard title="Intel RAPL" stamp={<Stamp tone="strong">Primary</Stamp>}>
              <p className="mt-2 text-[15px] leading-relaxed text-vx-ink-2">The CPU package's cumulative energy counter, read through the Windows Energy Meter Interface (powercap on Linux). Measured, about one update a second.</p>
            </ListCard>
            <ListCard title="Battery discharge" stamp={<Stamp tone="info">Cross-check</Stamp>}>
              <p className="mt-2 text-[15px] leading-relaxed text-vx-ink-2">Whole-laptop draw from the battery firmware, only when unplugged. It lags by seconds, so it only checks long runs.</p>
            </ListCard>
            <ListCard title="Utilisation model" stamp={<Stamp tone="lead">Estimate</Stamp>}>
              <p className="mt-2 text-[15px] leading-relaxed text-vx-ink-2">P = P_idle + (P_max − P_idle) × utilisation, calibrated against RAPL. Used only where no counter exists, such as a cluster node, and always labelled.</p>
            </ListCard>
          </ul>

          <SectionHead title="Meter validation" tip="Short CPU-burn tests run while building the meter. They check that the signals agree, not how much a job uses." />
          <Register caption="RAPL versus the utilisation model">
            <thead><tr><th>Machine</th><th>Test</th><th className="num">Seconds</th><th className="num">RAPL J</th><th className="num">Model J</th><th className="num">Gap</th><th className="num">CPU util</th></tr></thead>
            <tbody>
              {e.validation.map((v) => (
                <tr key={v.machine + v.test}>
                  <td>{v.machine}</td><td>{v.test}{v.note ? <> <Tip text={v.note} /></> : null}</td>
                  <td className="num">{v.duration_s}</td><td className="num">{v.rapl_j}</td><td className="num">{v.model_j}</td>
                  <td className="num">{(((v.model_j - v.rapl_j) / v.rapl_j) * 100).toFixed(1)}%</td>
                  <td className="num">{Math.round(v.util * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </Register>
          <p className="mt-3 text-[14.5px] text-vx-ink-3">The Windows rows agree within 5%. The Linux row used the uncalibrated default P_max, which is why the protocol recalibrates the model on every machine.</p>

          <SectionHead title="Protocol" count={PROTOCOL.length} />
          <ol className="grid gap-2">
            {PROTOCOL.map((p, i) => (
              <li key={i} className="flex gap-3 rounded-[6px] border border-vx-rule bg-vx-sheet px-4 py-3 text-[15.5px] leading-relaxed">
                <span className="font-vxmono text-[13px] font-semibold text-vx-stamp">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-vx-ink-2">{p}</span>
              </li>
            ))}
          </ol>

          <SectionHead title="Job catalogue" count={e.jobs.length} tip="Five nightly jobs built from groups of TPC-DS queries. The scheduler sees each as a length in half-hours and an energy in kWh." />
          <Register caption="Nightly Spark jobs">
            <thead><tr><th>Job</th><th>Character</th><th>TPC-DS queries</th><th className="num">Repeats</th><th>Splittable</th><th className="num">Length used</th></tr></thead>
            <tbody>
              {e.jobs.map((j) => {
                const sized = r?.jobs.find((x) => x.name === j.name)
                return (
                  <tr key={j.name}>
                    <td className="font-vxmono text-[14px]">{j.name}</td>
                    <td className="text-vx-ink-2">{j.character}</td>
                    <td className="font-vxmono text-[14px]">{j.queries.join(', ')}</td>
                    <td className="num">{j.repeats}</td>
                    <td>{j.interruptible ? <Stamp tone="info">Yes</Stamp> : <Stamp tone="skipped">No</Stamp>}</td>
                    <td className="num whitespace-nowrap">{sized ? `${sized.duration_slots * 30} min` : '—'}{r?.status === 'placeholder' && <div className="text-[13px] text-vx-ink-3">placeholder</div>}</td>
                  </tr>
                )
              })}
            </tbody>
          </Register>

          <SectionHead title="What the meter does not see" />
          <ul className="grid gap-1.5 text-[15.5px] leading-relaxed text-vx-ink-2">
            <li>DRAM, SSD, network, fans, screen and power-supply losses: RAPL covers the CPU package only, so absolute energy is an underestimate.</li>
            <li>Embodied carbon of the hardware: unchanged by shifting, so it does not affect the saving, but it belongs in a full SCI figure.</li>
            <li>Laptop to fleet: grams are scaled to a cluster by a stated factor and labelled a projection; the percentage saved does not depend on that factor.</li>
          </ul>
        </>
      )}
    </Page>
  )
}

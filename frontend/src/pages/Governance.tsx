import { CopyValue, ExtLink, Field, Page, PageHead, Register, SectionHead } from '../vx/primitives'
import { useResults } from '../lib/hooks'

const LIMITS: [string, string, string][] = [
  ['Average, not marginal, carbon intensity', 'We use the grid average (GHG Protocol location-based), like Wiesner et al. The plant that actually responds to extra load may be dirtier or cleaner, so true avoided emissions can differ.', 'Stated on every result; marginal data is model-based and mostly proprietary.'],
  ['The meter sees the CPU package only', 'RAPL misses DRAM, disk, network, fans and power-supply losses, so absolute kWh are low.', 'The % saved does not depend on kWh; grams are labelled CPU-package energy.'],
  ['Forecast error', 'The national forecast is off by 9.7 gCO₂/kWh on average (7.6% of the mean). Some nights the scheduler moves a job and the grid turns out dirtier.', 'Every saving is scored on actual values; the share of worse nights is reported.'],
  ['Laptop to fleet', 'One laptop’s Spark run is not a cluster. Scaling to a fleet uses a stated factor and PUE.', 'Fleet numbers are labelled projections and never mixed with measured ones.'],
  ['Who pays for the delay', 'Moving a job later delays whoever reads its output. Teams with 07:00 dashboards bear the cost of a greener batch.', 'Hard 07:00 deadline for every job, median and p95 delay reported per policy, jobs can be marked non-movable.'],
  ['Greenwashing risk', 'Quoting the oracle (perfect forecast) number, or forecast-scored savings, would overstate the benefit.', 'Headline = real API forecast, scored on actual CI, with a 95% interval. Oracle is shown only as a ceiling.'],
  ['Rebound effect', 'Cheaper-feeling compute can lead to more jobs, cancelling the saving.', 'Out of scope to measure; named as a risk for the team adopting it.'],
  ['The scheduler’s own footprint', 'Planning costs a few milliseconds of CPU and one API call per night.', 'Negligible next to an hour-long Spark job; not subtracted.'],
  ['Placeholder job sizes', 'Until the RAPL campaign passes, job lengths are placeholders with equal energy.', 'Marked on every page; percentages only, no grams.'],
]

export function Governance() {
  const { data: r } = useResults()
  const i0 = r?.intensity.find((x) => x.policy === 'P0')
  const i4 = r?.intensity.find((x) => x.policy === r?.headline.policy && x.forecast_mode === 'api')
  return (
    <Page>
      <PageHead title="Responsible AI"
        lede="What the numbers do and do not show, who is affected by shifting work, how every dataset may be used, and how anyone can reproduce the results." />

      <SectionHead title="Limitations and how they are handled" count={LIMITS.length} />
      <Register caption="Limitations">
        <thead><tr><th>Limitation</th><th>Why it matters</th><th>What we do</th></tr></thead>
        <tbody>{LIMITS.filter(([a]) => r?.status !== 'measured' || !a.startsWith('Placeholder')).map(([a, b, c]) => <tr key={a}><td className="min-w-[180px] font-medium">{a}</td><td className="text-[15px] text-vx-ink-2">{b}</td><td className="text-[15px] text-vx-ink-2">{c}</td></tr>)}</tbody>
      </Register>

      <SectionHead title="Software Carbon Intensity" tip="Green Software Foundation SCI specification: SCI = ((E × I) + M) per R." />
      <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
        <Field label="Formula" mono value="SCI = (E × I + M) / R" />
        <Field label="R, functional unit" value="One nightly batch of five jobs" />
        <Field label="I, carbon intensity" value={i0 && i4 ? `${i0.g_per_kwh} → ${i4.g_per_kwh} gCO₂/kWh` : undefined} note="Energy-weighted actual intensity: cron vs GreenShift (API forecast)" />
        <Field label="E, energy per batch" value={r?.status === 'measured' ? 'See measurement table' : undefined} empty="Pending the RAPL campaign" />
        <Field label="M, embodied" value="Not included" note="Unchanged by shifting a job in time" />
      </div>

      <SectionHead title="Data use and licences" />
      <Register caption="Licences">
        <thead><tr><th>Source</th><th>Terms</th><th>How we comply</th></tr></thead>
        <tbody>
          <tr><td>NESO Carbon Intensity API</td><td>CC BY 4.0, no key</td><td>Attributed on every page; raw CSVs committed with download dates</td></tr>
          <tr><td>NESO historic generation mix</td><td>CC BY 4.0</td><td>Cross-check only; download date and SHA-256 recorded; not redistributed</td></tr>
          <tr><td>Electricity Maps</td><td>ODbL (datasets), non-commercial API</td><td>Not used: historical files need academic approval. The brief allows a justified substitute</td></tr>
          <tr><td>TPC-DS</td><td>TPC EULA and fair-use policy</td><td>“Workload derived from TPC-DS; not comparable with published TPC-DS results.” Synthetic data, no personal information</td></tr>
        </tbody>
      </Register>
      <p className="mt-3 text-[14.5px] text-vx-ink-3">Each dataset has a data card in <span className="font-vxmono">datacards/</span>: owner, licence, access, provenance, download date, known gaps.</p>

      <SectionHead title="Reproduce every number" />
      <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
        <Field label="Everything, one command"><CopyValue value="python scripts/run_all.py --skip-measure" /></Field>
        <Field label="Tests"><CopyValue value="python -m pytest -q" /></Field>
        <Field label="Backtest SHA-256">{r?.backtest_sha256 ? <CopyValue value={r.backtest_sha256.slice(0, 16)} /> : null}</Field>
        <Field label="Built from commit">{r?.git_commit ? <CopyValue value={r.git_commit.slice(0, 10)} /> : null}</Field>
        <Field label="Random seeds" value="Noise 0-9 · bootstrap 0 · campaign order 20261031" />
        <Field label="Versions" value="Python 3.12 · Spark 4.2.0 · JDK 21 · pandas 2.3" />
      </div>

      <p className="mt-6 text-[14.5px] text-vx-ink-3">Carbon intensity data: Carbon Intensity API, NESO (<ExtLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExtLink>). Method compared with Wiesner et al., Middleware ’21.</p>
    </Page>
  )
}

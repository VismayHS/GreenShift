import { EmptyNote, Field, Page, PageHead, Register, SectionHead, Skeleton, Stamp } from '../vx/primitives'
import { CopyValue } from '../vx/primitives'
import { useResults } from '../lib/hooks'

const POLICIES = [
  { id: 'P0', name: 'Cron baseline', rule: 'Every job starts at 22:00, back to back in catalogue order (k at a time). What the team does today.', state: <Stamp tone="info">Baseline</Stamp> },
  { id: 'P2', name: 'Best window', rule: 'Each job takes the contiguous block with the lowest mean forecast that still ends by 07:00. Wiesner et al. “non-interrupting”.', state: <Stamp tone="done">Built</Stamp> },
  { id: 'P3', name: 'Interruptible', rule: 'Jobs marked splittable take their lowest-forecast half-hours, even if not adjacent; others fall back to P2.', state: <Stamp tone="done">Built</Stamp> },
  { id: 'P4', name: 'Multi-job greedy', rule: 'Largest energy first, each into its best window under capacity k. Before accepting a window, an earliest-deadline-first check builds a full feasible plan for every remaining job; if the final plan would cost more forecast carbon than cron, cron is kept.', state: <Stamp tone="strong">Headline</Stamp> },
  { id: 'P5', name: 'ILP optimum', rule: 'A time-indexed integer program giving the true optimum, to measure how far P4 is from it.', state: <Stamp tone="skipped">Not built</Stamp> },
]

const MODES = [
  { id: 'api', name: 'API forecast', rule: 'The real NESO forecast as published. A missing slot takes the actual from 24 h earlier (counted). This is what a deployment would see.', state: <Stamp tone="strong">Realistic</Stamp> },
  { id: 'noisy', name: 'Noisy', rule: 'Actual plus Gaussian noise, σ = 5% of the yearly mean, 10 seeds. The forecast model Wiesner et al. assumed.', state: <Stamp tone="info">Comparison</Stamp> },
  { id: 'oracle', name: 'Oracle', rule: 'The actual values, as if the future were known. An upper bound only; never quoted as a saving.', state: <Stamp tone="lead">Bound</Stamp> },
]

export function SchedulerPage() {
  const { data: r, error } = useResults()
  const v = r?.verification
  const t = r?.tests
  return (
    <Page>
      <PageHead title="Scheduler"
        lede="Each night, five jobs are released at 22:00 UK and must finish by 07:00. Time is cut into 30-minute slots. The scheduler chooses slots that minimise forecast carbon, never misses the deadline, and never runs more than k jobs at once." />

      <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
        <Field label="Release · deadline" value="22:00 · 07:00 UK" note="Stored in UTC, so GMT/BST changes are handled (16 or 20 slots on clock-change nights, 18 otherwise)" />
        <Field label="Time step" value="30 minutes" note="The API's native grain" />
        <Field label="Objective" value="Σ energy × mean forecast CI" note="Over each job's occupied slots" />
        <Field label="Capacity k" value="1 or 2 jobs at once" note="A YARN queue's slots; both are backtested" />
      </div>

      <SectionHead title="Policies" count={POLICIES.length} />
      <Register caption="Scheduling policies">
        <thead><tr><th>Policy</th><th>Rule</th><th>State</th></tr></thead>
        <tbody>{POLICIES.map((p) => <tr key={p.id}><td className="whitespace-nowrap"><span className="font-vxmono font-semibold">{p.id}</span> {p.name}</td><td className="max-w-[68ch] text-vx-ink-2">{p.rule}</td><td>{p.state}</td></tr>)}</tbody>
      </Register>

      <SectionHead title="Forecast modes" count={MODES.length} tip="Decisions use only the forecast; emissions are always scored with the actual intensity." />
      <Register caption="Forecast modes">
        <thead><tr><th>Mode</th><th>What the scheduler sees</th><th>Role</th></tr></thead>
        <tbody>{MODES.map((m) => <tr key={m.id}><td className="whitespace-nowrap font-medium">{m.name}</td><td className="max-w-[68ch] text-vx-ink-2">{m.rule}</td><td>{m.state}</td></tr>)}</tbody>
      </Register>

      <SectionHead title="Two rules that keep the numbers honest" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[10px] border border-vx-rule bg-vx-sheet p-5">
          <div className="font-vxmono text-[12px] uppercase tracking-[0.12em] text-vx-ink-3">No lookahead</div>
          <p className="mt-1.5 text-[15.5px] leading-relaxed text-vx-ink-2">The policy functions receive only the forecast array. A test changes the actual values the scheduler must not see and checks that the API-mode plans do not change.</p>
        </div>
        <div className="rounded-[10px] border border-vx-rule bg-vx-sheet p-5">
          <div className="font-vxmono text-[12px] uppercase tracking-[0.12em] text-vx-ink-3">Score on actual</div>
          <p className="mt-1.5 text-[15.5px] leading-relaxed text-vx-ink-2">Every gram in every table is energy × the grid's actual intensity in the slots the job really occupied. Scoring on the forecast would inflate savings; this is the check that the results sit near the paper's few percent.</p>
        </div>
      </div>

      <SectionHead title="Independent audit of the backtest" tip="scheduler/verification.py re-derives every row from the slot table, separately from the simulator.">
        {v ? <Stamp tone={v.status === 'passed' ? 'strong' : 'failed'}>{v.status === 'passed' ? 'Passed' : v.status}</Stamp> : null}
      </SectionHead>
      {error && <EmptyNote tone="failed" title="Results could not be loaded">{error}</EmptyNote>}
      {!r && !error && <Skeleton className="h-24 w-full rounded-[10px]" />}
      {r && !v && <EmptyNote title="No audit file">Run <code className="font-vxmono">python scripts/verify_results.py</code> to produce verification.json.</EmptyNote>}
      {v && (
        <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
          <Field label="Rows checked" value={v.rows.toLocaleString()} note={`${v.plans.toLocaleString()} nightly plans`} />
          <Field label="Deadline misses" value={v.deadline_misses} />
          <Field label="Capacity violations" value={v.capacity_violations} />
          <Field label="Energy conserved" value={v.energy_conserved ? 'Yes, every plan' : 'No'} note="Shifting never changes a job's kWh" />
          <Field label="Backtest SHA-256"><CopyValue value={v.backtest_sha256.slice(0, 16)} /></Field>
        </div>
      )}

      <SectionHead title="Automated tests">
        {t ? <Stamp tone={t.failed === 0 ? 'done' : 'failed'}>{t.failed === 0 ? `${t.passed} passed` : `${t.failed} failed`}</Stamp> : <Stamp tone="queued">Not run here</Stamp>}
      </SectionHead>
      <Register caption="What the tests prove">
        <thead><tr><th>Property</th><th>Test</th></tr></thead>
        <tbody>
          {[
            ['Random workloads: no deadline missed, capacity k never exceeded, exact slots per job', 'test_policies::test_random_invariants'],
            ['A flat carbon curve gives a saving of exactly 0; a missing forecast keeps cron', 'test_policies::test_constant_carbon_and_missing_signal'],
            ['A 2-job case with a hand-checked answer', 'test_policies::test_hand_checkable_two_jobs'],
            ['Best window equals brute force for a single job', 'test_policies::test_single_job_best_window_matches_brute_force'],
            ['The EDF check keeps an urgent job feasible when a large job wants its slot', 'test_policies::test_edf_preserves_urgent_job_when_large_job_prefers_its_slot'],
            ['Changing future actual values leaves API decisions unchanged (no lookahead)', 'test_forecast::test_api_has_no_actual_lookahead'],
            ['Output matches the contract; emissions are scored on actual CI', 'test_simulator::test_contract_and_actual_accounting'],
            ['Perfect information never does worse for a single job', 'test_replication::test_oracle_is_upper_bound_for_single_job'],
            ['Clock-change nights have the right number of slots', 'test_models::test_dst_window'],
            ['The independent auditor catches corrupted energy', 'test_verification::test_independent_verifier_detects_corrupted_energy'],
            ['RAPL counter wrap-around; missing forecast keys from the API', 'test_energy::test_rapl_wrap, test_carbon::test_missing_forecast_key'],
          ].map(([a, b]) => <tr key={a}><td>{a}</td><td className="font-vxmono text-[13.5px] text-vx-ink-2">{b}</td></tr>)}
        </tbody>
      </Register>
      {t && <p className="mt-3 text-[14.5px] text-vx-ink-3">Last run: {t.total} tests on {t.platform}, Python {t.python}, {t.duration_s.toFixed(1)} s.</p>}
    </Page>
  )
}

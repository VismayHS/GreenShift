import { INK, LineChart } from '../charts/charts'
import { EmptyNote, ExtLink, Field, Page, PageHead, Panel, Register, SectionHead, Skeleton, Stamp } from '../vx/primitives'
import { pct, useResults } from '../lib/hooks'
import { MODE_NAME, type Mode } from '../lib/data'

const COLOUR: Record<Mode, { color: string; dash?: string }> = { api: { color: INK.violet }, noisy: { color: INK.lilac, dash: '6 4' }, oracle: { color: INK.ink } }
const lg = (w: number) => Math.log2(w)

export function Replication() {
  const { data: r, error } = useResults()
  const t2 = r?.table2 ?? []
  const at = (w: number, m: Mode) => t2.find((x) => x.window_h === w && x.forecast_mode === m)
  return (
    <Page>
      <PageHead title="Paper replication"
        lede="Wiesner et al. (Middleware ’21) shifted one 30-minute nightly job around a 01:00 start and reported GB savings of 4.3% for a ±2 h window and 7.4% for ±8 h, using 2020 data and a noisy forecast. GreenShift runs the same experiment on 2024-25 data."
        meta={<Stamp tone="info">Scenario I</Stamp>} />
      {error && <EmptyNote tone="failed" title="Results could not be loaded">{error}</EmptyNote>}
      {!r && !error && <Skeleton className="h-[360px] w-full rounded-[10px]" />}
      {r && t2.length === 0 && <EmptyNote title="Replication not in this backtest">Run <code className="font-vxmono">python scripts/run_backtest.py</code> without <code className="font-vxmono">--nightly-only</code>.</EmptyNote>}
      {t2.length > 0 && (
        <>
          <div className="vx-tag-fields rounded-[6px] bg-vx-sheet">
            <Field label="±2 h · noisy, like the paper" value={`${pct(at(2, 'noisy')!.saved_pct, 2)} vs 4.3%`} note={`95% CI ${at(2, 'noisy')!.ci_low.toFixed(2)} to ${at(2, 'noisy')!.ci_high.toFixed(2)}%`} />
            <Field label="±8 h · noisy, like the paper" value={`${pct(at(8, 'noisy')!.saved_pct, 2)} vs 7.4%`} note="Above the paper's figure: a different year and generation mix" />
            <Field label="±2 h · real API forecast" value={pct(at(2, 'api')!.saved_pct, 2)} note="The real forecast errs more than the paper's 5% noise assumed" />
            <Field label="Nights" value={at(2, 'api')!.nights} note="One job per night, normalised to 1 kWh" />
          </div>

          <SectionHead title="Savings grow with the window" tip="Shaded bands: 95% bootstrap intervals over nights. Stars: the two GB figures quoted in the paper." />
          <Panel>
            <LineChart label="Percentage CO2 saved by flexibility window, with the paper's GB results marked" height={340}
              yTitle="CO₂ saved vs 01:00 start (%)" xTitle="Flexibility window around 01:00 UK (hours, log scale)"
              xTicks={[-1, 0, 1, 2, 3]} xFmt={(x) => `±${2 ** x}`}
              stars={[{ x: lg(2), y: 4.3, name: 'Wiesner et al. 2021, GB 2020' }, { x: lg(8), y: 7.4, name: 'Wiesner et al. 2021, GB 2020' }]}
              series={(['api', 'noisy', 'oracle'] as Mode[]).map((m) => {
                const rows = t2.filter((x) => x.forecast_mode === m).sort((a, b) => a.window_h - b.window_h)
                return { name: `GreenShift, ${MODE_NAME[m]}`, ...COLOUR[m], markers: true,
                  points: rows.map((x) => ({ x: lg(x.window_h), y: x.saved_pct })), band: rows.map((x) => ({ x: lg(x.window_h), lo: x.ci_low, hi: x.ci_high })) }
              })}
              readFmt={(_, p) => `${p.y!.toFixed(2)}%`} />
          </Panel>

          <SectionHead title="Table 2" />
          <Register caption="Replication results">
            <thead><tr><th>Window</th><th>Forecast</th><th className="num">CO₂ saved</th><th className="num">95% CI</th><th className="num">Mean shift</th><th className="num">Paper, GB 2020</th></tr></thead>
            <tbody>{[...t2].sort((a, b) => a.window_h - b.window_h || a.forecast_mode.localeCompare(b.forecast_mode)).map((x) => (
              <tr key={`${x.window_h}${x.forecast_mode}`}>
                <td className="font-vxmono">±{x.window_h} h</td><td>{MODE_NAME[x.forecast_mode]}</td>
                <td className="num font-semibold">{pct(x.saved_pct, 2)}</td><td className="num text-vx-ink-2">{x.ci_low.toFixed(2)} to {x.ci_high.toFixed(2)}</td>
                <td className="num">{Math.round(x.mean_abs_shift_min)} min</td>
                <td className="num">{x.paper_gb_pct != null && x.forecast_mode === 'noisy' ? `${x.paper_gb_pct}%` : <span className="text-vx-ink-3">—</span>}</td>
              </tr>
            ))}</tbody>
          </Register>

          <SectionHead title="Reading it fairly" />
          <ul className="grid gap-1.5 text-[15.5px] leading-relaxed text-vx-ink-2">
            <li>Same method, different years: the GB generation mix in 2024-25 differs from 2020 (more wind; the last coal plant closed in 2024), so this checks the method; it does not reproduce the paper's numbers.</li>
            <li>The paper's other window values are not quoted here because only these two figures appear in its text.</li>
            <li>The real API forecast saves less than the noisy model because its error (MAE {'≈'} 7.6% of the mean) is larger than the 5% the paper assumed.</li>
          </ul>
          <p className="mt-4 text-[14.5px] text-vx-ink-3">Source: <ExtLink href="https://arxiv.org/abs/2110.13234">Wiesner, Behnke, Scheinert, Gontarska, Thamsen. Let’s Wait Awhile, Middleware ’21 (arXiv:2110.13234)</ExtLink></p>
        </>
      )}
    </Page>
  )
}

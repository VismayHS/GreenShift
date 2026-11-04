// SVG charts in the register's inks. Green, amber and red never appear here (the Verdict Rule);
// series are told apart by violet, ink, light violet and grey, plus dash and marker shape.
import { scaleBand, scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { useMemo, useState, type ReactNode } from 'react'
import { useWidth } from '../lib/useWidth'

export const INK = { violet: 'var(--vx-chart-1)', ink: 'var(--vx-chart-2)', lilac: 'var(--vx-chart-3)', grey: 'var(--vx-chart-4)', rule: 'var(--vx-rule)', text: 'var(--vx-ink-3)' }
const AXIS_FONT = 12.5

/** Sequential ramp for carbon intensity: pale (clean) to deep ink-violet (dirty). */
const RAMP = scaleLinear<string>().domain([0, 60, 120, 180, 260]).range(['#f3f1fa', '#cbbfea', '#8f74d0', '#4f3596', '#1f1640']).clamp(true)
export const rampColor = (v: number) => RAMP(v)

function Frame({ label, height, children, legend, readout }: { label: string; height: number; children: (w: number) => ReactNode; legend?: ReactNode; readout?: ReactNode }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  return (
    <figure className="m-0 w-full">
      {legend ? <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-vx-ink-2">{legend}</div> : null}
      <div ref={ref} className="w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label} className="block touch-pan-y overflow-visible">
            {children(width)}
          </svg>
        )}
      </div>
      {readout !== undefined ? <figcaption className="mt-2 min-h-[1.5em] text-[14.5px] text-vx-ink-2" aria-live="polite">{readout}</figcaption> : null}
    </figure>
  )
}

export function Key({ color, dash, shape = 'line', children }: { color: string; dash?: string; shape?: 'line' | 'dot' | 'box' | 'star'; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="22" height="12" aria-hidden="true">
        {shape === 'line' && <line x1="1" x2="21" y1="6" y2="6" stroke={color} strokeWidth="2.5" strokeDasharray={dash} />}
        {shape === 'dot' && <circle cx="11" cy="6" r="4.5" fill={color} />}
        {shape === 'box' && <rect x="3" y="1" width="16" height="10" rx="2" fill={color} />}
        {shape === 'star' && <path d={star(11, 6, 6)} fill={color} />}
      </svg>
      {children}
    </span>
  )
}

function star(cx: number, cy: number, r: number) {
  const p: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    p.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`)
  }
  return `M${p.join('L')}Z`
}

function YAxis({ y, left, right, ticks, fmt = (v: number) => String(v), title }: { y: ReturnType<typeof scaleLinear<number, number>>; left: number; right: number; ticks?: number; fmt?: (v: number) => string; title: string }) {
  return (
    <g>
      {y.ticks(ticks ?? 5).map((t) => (
        <g key={t}>
          <line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke={INK.rule} strokeDasharray={t === 0 ? undefined : '2 4'} />
          <text x={left - 8} y={y(t)} dy="0.35em" textAnchor="end" fontSize={AXIS_FONT} fill={INK.text}>{fmt(t)}</text>
        </g>
      ))}
      <text x={4} y={10} fontSize={AXIS_FONT} fill={INK.text}>{title}</text>
    </g>
  )
}

// ---------------------------------------------------------------------------- line chart
export type LinePoint = { x: number; y: number | null }
export type LineSeries = { name: string; color: string; points: LinePoint[]; dash?: string; band?: { x: number; lo: number; hi: number }[]; markers?: boolean; width?: number }

export function LineChart({ series, height = 320, label, xTicks, xFmt, yTitle, xTitle, stars, yMin, readFmt }: {
  series: LineSeries[]; height?: number; label: string; xTicks: number[]; xFmt: (x: number) => string; yTitle: string; xTitle?: string
  stars?: { x: number; y: number; name: string }[]; yMin?: number; readFmt?: (s: LineSeries, p: LinePoint) => string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const xs = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b), [series])
  return (
    <Frame label={label} height={height}
      legend={<>{series.map((s) => <Key key={s.name} color={s.color} dash={s.dash}>{s.name}</Key>)}{stars?.length ? <Key color={INK.ink} shape="star">{stars[0].name}</Key> : null}</>}
      readout={hover != null ? `${xFmt(hover)}: ` + series.map((s) => { const p = s.points.find((q) => q.x === hover); return `${s.name} ${p?.y == null ? 'n/a' : readFmt ? readFmt(s, p) : p.y.toFixed(1)}` }).join(' · ') : 'Point at the chart to read each value.'}>
      {(width) => {
        const left = 48, right = width - 12, top = 22, bottom = height - (xTitle ? 46 : 28)
        const x = scaleLinear().domain([xTicks[0], xTicks[xTicks.length - 1]]).range([left, right])
        const vals = series.flatMap((s) => [...s.points.map((p) => p.y), ...(s.band ?? []).flatMap((b) => [b.lo, b.hi])]).concat(stars?.map((s) => s.y) ?? []).filter((v): v is number => v != null)
        const y = scaleLinear().domain([yMin ?? Math.min(0, ...vals), Math.max(...vals) * 1.08]).nice().range([bottom, top])
        const ln = line<LinePoint>().defined((p) => p.y != null).x((p) => x(p.x)).y((p) => y(p.y ?? 0))
        return (
          <g onPointerMove={(e) => { const b = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); const px = x.invert(e.clientX - b.left); setHover(xs.reduce((a, c) => (Math.abs(c - px) < Math.abs(a - px) ? c : a), xs[0])) }} onPointerLeave={() => setHover(null)}>
            <rect x={left} y={top} width={right - left} height={bottom - top} fill="transparent" />
            <YAxis y={y} left={left} right={right} title={yTitle} />
            {xTicks.map((t) => <text key={t} x={x(t)} y={bottom + 18} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{xFmt(t)}</text>)}
            {xTitle ? <text x={(left + right) / 2} y={height - 6} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{xTitle}</text> : null}
            {series.map((s) => s.band ? (
              <path key={`b${s.name}`} fill={s.color} opacity={0.13}
                d={`M${s.band.map((b) => `${x(b.x)},${y(b.hi)}`).join('L')}L${[...s.band].reverse().map((b) => `${x(b.x)},${y(b.lo)}`).join('L')}Z`} />
            ) : null)}
            {series.map((s) => (
              <g key={s.name}>
                <path d={ln(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={s.width ?? 2.25} strokeDasharray={s.dash} strokeLinejoin="round" />
                {s.markers && s.points.map((p) => p.y != null && <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r={4} fill={s.color} stroke="var(--vx-sheet)" strokeWidth={1.5} />)}
              </g>
            ))}
            {stars?.map((s) => <path key={s.x} d={star(x(s.x), y(s.y), 9)} fill={INK.ink} stroke="var(--vx-sheet)" strokeWidth={1.2}><title>{`${s.name}: ${s.y}%`}</title></path>)}
            {hover != null && <line x1={x(hover)} x2={x(hover)} y1={top} y2={bottom} stroke={INK.ink} strokeDasharray="3 4" pointerEvents="none" />}
          </g>
        )
      }}
    </Frame>
  )
}

// ---------------------------------------------------------------------------- grouped bars
export type BarGroup = { label: string; bars: { name: string; value: number; lo?: number; hi?: number; color: string }[] }

export function GroupedBars({ groups, height = 280, label, yTitle, fmt = (v) => `${v.toFixed(1)}%` }: { groups: BarGroup[]; height?: number; label: string; yTitle: string; fmt?: (v: number) => string }) {
  const [hover, setHover] = useState<{ g: number; b: number } | null>(null)
  const names = groups[0]?.bars.map((b) => ({ name: b.name, color: b.color })) ?? []
  const h = hover ? groups[hover.g].bars[hover.b] : null
  return (
    <Frame label={label} height={height} legend={names.map((n) => <Key key={n.name} color={n.color} shape="box">{n.name}</Key>)}
      readout={h && hover ? `${groups[hover.g].label}, ${h.name}: ${fmt(h.value)}${h.lo != null ? ` (95% CI ${fmt(h.lo)} to ${fmt(h.hi!)})` : ''}` : 'Point at a bar to read it. Whiskers are 95% bootstrap intervals over nights.'}>
      {(width) => {
        const left = 48, right = width - 8, top = 22, bottom = height - 28
        const vals = groups.flatMap((g) => g.bars.flatMap((b) => [b.value, b.hi ?? b.value, b.lo ?? b.value]))
        const y = scaleLinear().domain([Math.min(0, ...vals), Math.max(...vals) * 1.1]).nice().range([bottom, top])
        const gx = scaleBand().domain(groups.map((g) => g.label)).range([left, right]).paddingInner(0.25).paddingOuter(0.1)
        const bx = scaleBand().domain(names.map((n) => n.name)).range([0, gx.bandwidth()]).padding(0.08)
        return (
          <g onPointerLeave={() => setHover(null)}>
            <YAxis y={y} left={left} right={right} title={yTitle} fmt={(v) => `${v}`} />
            {groups.map((g, gi) => (
              <g key={g.label} transform={`translate(${gx(g.label)},0)`}>
                {g.bars.map((b, bi) => (
                  <g key={b.name} onPointerEnter={() => setHover({ g: gi, b: bi })}>
                    <rect x={bx(b.name)} y={Math.min(y(b.value), y(0))} width={bx.bandwidth()} height={Math.abs(y(0) - y(b.value))} fill={b.color} rx={2}
                      opacity={hover && (hover.g !== gi || hover.b !== bi) ? 0.55 : 1} />
                    {b.lo != null && b.hi != null && (
                      <g stroke={INK.ink} strokeWidth={1.2}>
                        <line x1={bx(b.name)! + bx.bandwidth() / 2} x2={bx(b.name)! + bx.bandwidth() / 2} y1={y(b.lo)} y2={y(b.hi)} />
                        <line x1={bx(b.name)! + bx.bandwidth() / 2 - 4} x2={bx(b.name)! + bx.bandwidth() / 2 + 4} y1={y(b.hi)} y2={y(b.hi)} />
                        <line x1={bx(b.name)! + bx.bandwidth() / 2 - 4} x2={bx(b.name)! + bx.bandwidth() / 2 + 4} y1={y(b.lo)} y2={y(b.lo)} />
                      </g>
                    )}
                  </g>
                ))}
                <text x={gx.bandwidth() / 2} y={bottom + 18} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{g.label}</text>
              </g>
            ))}
          </g>
        )
      }}
    </Frame>
  )
}

// ---------------------------------------------------------------------------- horizontal bars
export function HBars({ rows, label, unit, height }: { rows: { name: string; value: number; highlight?: boolean }[]; label: string; unit: string; height?: number }) {
  const h = height ?? rows.length * 30 + 30
  return (
    <Frame label={label} height={h}>
      {(width) => {
        const left = Math.min(170, width * 0.42), right = width - 48
        const x = scaleLinear().domain([0, Math.max(...rows.map((r) => r.value)) * 1.02]).range([left, right])
        return (
          <g>
            {rows.map((r, i) => (
              <g key={r.name} transform={`translate(0,${i * 30 + 6})`}>
                <text x={left - 8} y={11} dy="0.35em" textAnchor="end" fontSize={13.5} fill="var(--vx-ink-2)">{r.name}</text>
                <rect x={left} y={1} width={Math.max(1, x(r.value) - left)} height={20} rx={2} fill={rampColor(r.value)} stroke={r.highlight ? INK.ink : 'none'} strokeWidth={1.5} />
                <text x={x(r.value) + 6} y={11} dy="0.35em" fontSize={13} fill="var(--vx-ink)" fontWeight={600}>{Math.round(r.value)}</text>
              </g>
            ))}
            <text x={left} y={h - 4} fontSize={AXIS_FONT} fill={INK.text}>{unit}</text>
          </g>
        )
      }}
    </Frame>
  )
}

// ---------------------------------------------------------------------------- histogram
export function Histogram({ series, from, width: bw, label, xTitle }: { series: { name: string; color: string; counts: number[] }[]; from: number; width: number; label: string; xTitle: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const n = series[0].counts.length
  return (
    <Frame label={label} height={280} legend={series.map((s) => <Key key={s.name} color={s.color} shape="box">{s.name}</Key>)}
      readout={hover != null ? `${from + hover * bw}% to ${from + (hover + 1) * bw}% saved: ` + series.map((s) => `${s.name} ${s.counts[hover]} nights`).join(' · ') : 'Each bar counts nights by their percentage saving. Left of the dark line, the night came out worse than cron.'}>
      {(width) => {
        const left = 48, right = width - 8, top = 22, bottom = 280 - 46
        const x = scaleLinear().domain([from, from + n * bw]).range([left, right])
        const y = scaleLinear().domain([0, Math.max(...series.flatMap((s) => s.counts)) * 1.08]).nice().range([bottom, top])
        const ticks = x.ticks(8)
        return (
          <g onPointerMove={(e) => { const b = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); const i = Math.floor((x.invert(e.clientX - b.left) - from) / bw); setHover(i >= 0 && i < n ? i : null) }} onPointerLeave={() => setHover(null)}>
            <rect x={left} y={top} width={right - left} height={bottom - top} fill="transparent" />
            <YAxis y={y} left={left} right={right} title="Nights" />
            {series.map((s, si) => s.counts.map((c, i) => (
              <rect key={`${si}-${i}`} x={x(from + i * bw) + 0.5} y={y(c)} width={Math.max(0, x(from + bw) - x(from) - 1)} height={bottom - y(c)} fill={s.color} opacity={si ? 0.55 : 0.85} />
            )))}
            <line x1={x(0)} x2={x(0)} y1={top} y2={bottom} stroke={INK.ink} strokeWidth={1.5} />
            {ticks.map((t) => <text key={t} x={x(t)} y={bottom + 18} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{t}</text>)}
            <text x={(left + right) / 2} y={280 - 6} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{xTitle}</text>
            {hover != null && <rect x={x(from + hover * bw)} y={top} width={x(from + bw) - x(from)} height={bottom - top} fill="none" stroke={INK.ink} strokeDasharray="3 3" pointerEvents="none" />}
          </g>
        )
      }}
    </Frame>
  )
}

// ---------------------------------------------------------------------------- scatter
export type ScatterPoint = { x: number; y: number; color: string; shape: 'circle' | 'square' | 'triangle' | 'cross'; hollow?: boolean; label: string }

function Mark({ p, cx, cy, r = 7 }: { p: ScatterPoint; cx: number; cy: number; r?: number }) {
  const fill = p.hollow ? 'var(--vx-sheet)' : p.color
  const common = { fill, stroke: p.color, strokeWidth: 2 }
  if (p.shape === 'square') return <rect x={cx - r * 0.85} y={cy - r * 0.85} width={r * 1.7} height={r * 1.7} {...common} />
  if (p.shape === 'triangle') return <path d={`M${cx},${cy - r}L${cx + r},${cy + r * 0.8}L${cx - r},${cy + r * 0.8}Z`} {...common} />
  if (p.shape === 'cross') return <path d={`M${cx - r},${cy - r}L${cx + r},${cy + r}M${cx + r},${cy - r}L${cx - r},${cy + r}`} stroke={p.color} strokeWidth={3} />
  return <circle cx={cx} cy={cy} r={r} {...common} />
}

export function Scatter({ points, label, xTitle, yTitle, legend }: { points: ScatterPoint[]; label: string; xTitle: string; yTitle: string; legend: ReactNode }) {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <Frame label={label} height={340} legend={legend} readout={hover != null ? points[hover].label : 'Point at a mark to read it. Up and to the left is better: more carbon saved for less waiting.'}>
      {(width) => {
        const left = 48, right = width - 16, top = 22, bottom = 340 - 46
        const x = scaleLinear().domain([0, Math.max(...points.map((p) => p.x)) * 1.1]).nice().range([left, right])
        const y = scaleLinear().domain([Math.min(0, ...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)) * 1.12]).nice().range([bottom, top])
        return (
          <g>
            <YAxis y={y} left={left} right={right} title={yTitle} />
            {x.ticks(6).map((t) => <text key={t} x={x(t)} y={bottom + 18} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{t}</text>)}
            <text x={(left + right) / 2} y={340 - 6} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{xTitle}</text>
            {points.map((p, i) => (
              <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} opacity={hover != null && hover !== i ? 0.45 : 1}>
                <circle cx={x(p.x)} cy={y(p.y)} r={14} fill="transparent" />
                <Mark p={p} cx={x(p.x)} cy={y(p.y)} r={hover === i ? 9 : 7} />
              </g>
            ))}
          </g>
        )
      }}
    </Frame>
  )
}

// ---------------------------------------------------------------------------- timeline (CI + job blocks)
export type TimeRow = { label: string; blocks: { start: number; end: number; kind: 'base' | 'best' }[] }

export function Timeline({ times, lines, rows, window: win, label, tick, fmt, slotMs, readValue }: {
  times: number[]; lines: { name: string; color: string; dash?: string; values: (number | null)[] }[]; rows: TimeRow[]
  window: { from: number; to: number }; label: string; tick: (t: number) => boolean; fmt: (t: number) => string; slotMs: number
  readValue?: (i: number) => string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const rowH = 30
  const chartH = 220
  const height = chartH + rows.length * rowH + 44
  return (
    <Frame label={label} height={height}
      legend={<>{lines.map((l) => <Key key={l.name} color={l.color} dash={l.dash}>{l.name}</Key>)}<Key color={INK.grey} shape="box">P0 cron baseline</Key><Key color={INK.violet} shape="box">P4 GreenShift plan</Key></>}
      readout={hover != null ? `${fmt(times[hover])}: ${readValue ? readValue(hover) : lines.map((l) => `${l.name} ${l.values[hover] == null ? 'n/a' : Math.round(l.values[hover]!)}`).join(' · ') + ' gCO₂/kWh'}` : 'Point at the chart to read the forecast for each half-hour.'}>
      {(width) => {
        const narrow = width < 560
        const left = narrow ? 92 : 168, right = width - 10, top = 22, bottom = chartH
        const t0 = times[0], t1 = times[times.length - 1] + slotMs
        const x = scaleLinear().domain([t0, t1]).range([left, right])
        const vals = lines.flatMap((l) => l.values).filter((v): v is number => v != null)
        const y = scaleLinear().domain([Math.min(...vals) * 0.9, Math.max(...vals) * 1.05]).nice().range([bottom, top])
        const step = (vs: (number | null)[]) => {
          let d = ''
          vs.forEach((v, i) => {
            if (v == null) return
            const prev = vs[i - 1]
            d += `${prev == null ? 'M' : 'L'}${x(times[i])},${y(v)}L${x(times[i] + slotMs)},${y(v)}`
          })
          return d
        }
        return (
          <g onPointerMove={(e) => { const b = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); const i = Math.floor((x.invert(e.clientX - b.left) - t0) / slotMs); setHover(i >= 0 && i < times.length ? i : null) }} onPointerLeave={() => setHover(null)}>
            <rect x={left} y={top} width={right - left} height={height - top} fill="transparent" />
            <rect x={x(win.from)} y={top} width={Math.max(0, x(win.to) - x(win.from))} height={height - 44 - top} fill="var(--vx-stamp-wash)" opacity={0.7} />
            <YAxis y={y} left={left} right={right} title="gCO₂/kWh" ticks={4} />
            {lines.map((l) => <path key={l.name} d={step(l.values)} fill="none" stroke={l.color} strokeWidth={2} strokeDasharray={l.dash} />)}
            {rows.map((r, i) => {
              const ry = chartH + 12 + i * rowH
              return (
                <g key={r.label}>
                  <line x1={left} x2={right} y1={ry + rowH - 3} y2={ry + rowH - 3} stroke={INK.rule} />
                  <text x={left - 8} y={ry + rowH / 2} dy="0.2em" textAnchor="end" fontSize={narrow ? 11 : 13} fill="var(--vx-ink-2)" fontFamily="var(--vx-mono)">{narrow ? r.label.split('_')[0] : r.label}</text>
                  {r.blocks.map((b, j) => (
                    <rect key={j} x={x(b.start) + 0.5} width={Math.max(1, x(b.end) - x(b.start) - 1)} rx={2}
                      y={b.kind === 'base' ? ry + 2 : ry + 13} height={b.kind === 'base' ? 9 : 13}
                      fill={b.kind === 'base' ? INK.grey : INK.violet} opacity={b.kind === 'base' ? 0.75 : 1} />
                  ))}
                </g>
              )
            })}
            {times.filter(tick).filter((t, i, all) => i % Math.max(1, Math.ceil(44 / Math.max(1, x(all[1] ?? t + 1) - x(t)))) === 0).map((t) => (
              <text key={t} x={x(t)} y={height - 22} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{fmt(t)}</text>
            ))}
            <text x={right} y={height - 4} textAnchor="end" fontSize={AXIS_FONT} fill={INK.text}>Time (UK local)</text>
            {hover != null && <line x1={x(times[hover] + slotMs / 2)} x2={x(times[hover] + slotMs / 2)} y1={top} y2={height - 40} stroke={INK.ink} strokeDasharray="3 4" pointerEvents="none" />}
          </g>
        )
      }}
    </Frame>
  )
}

// ---------------------------------------------------------------------------- heatmap
export function Heatmap({ rows, rowLabel, colLabel, label, height = 460, unit }: {
  rows: (number | null)[][]; rowLabel: (i: number) => string | null; colLabel: (j: number) => string | null; label: string; height?: number; unit: string
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  const cols = rows[0]?.length ?? 0
  const v = hover ? rows[hover.r][hover.c] : null
  return (
    <Frame label={label} height={height}
      legend={<span className="inline-flex flex-wrap items-center gap-2">Cleaner {[0, 60, 120, 180, 260].map((t) => <span key={t} className="inline-flex items-center gap-1"><span className="inline-block h-3 w-6 rounded-[2px]" style={{ background: rampColor(t) }} />{t}</span>)} dirtier ({unit})</span>}
      readout={hover ? `${rowLabel(hover.r) ?? ''} ${colLabel(hover.c) ?? ''}: ${v == null ? 'no data (source outage)' : `${Math.round(v)} ${unit}`}` : 'Point at the field to read it.'}>
      {(width) => {
        const left = 72, top = 4, bottom = height - 24, right = width - 4
        const cw = (right - left) / cols, rh = (bottom - top) / rows.length
        return (
          <g onPointerMove={(e) => { const b = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); const c = Math.floor((e.clientX - b.left - left) / cw), r = Math.floor((e.clientY - b.top - top) / rh); setHover(c >= 0 && c < cols && r >= 0 && r < rows.length ? { r, c } : null) }} onPointerLeave={() => setHover(null)}>
            {rows.map((row, r) => row.map((val, c) => (
              <rect key={`${r}-${c}`} x={left + c * cw} y={top + r * rh} width={cw + 0.4} height={rh + 0.4} fill={val == null ? 'var(--vx-rail)' : rampColor(val)} />
            )))}
            {rows.map((_, r) => { const l = rowLabel(r); return l ? <text key={r} x={left - 8} y={top + r * rh + rh / 2} dy="0.35em" textAnchor="end" fontSize={AXIS_FONT} fill={INK.text}>{l}</text> : null })}
            {Array.from({ length: cols }, (_, c) => { const l = colLabel(c); return l ? <text key={c} x={left + c * cw} y={height - 6} textAnchor="middle" fontSize={AXIS_FONT} fill={INK.text}>{l}</text> : null })}
            {hover && <rect x={left + hover.c * cw} y={top + hover.r * rh} width={cw} height={Math.max(rh, 2)} fill="none" stroke={INK.ink} strokeWidth={2} pointerEvents="none" />}
          </g>
        )
      }}
    </Frame>
  )
}

import { area, curveMonotoneX, line } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import { useRef, useState } from 'react'
import { clock, SLOT_MS, type Placed } from '../lib/plan'
import { useWidth } from '../lib/useWidth'

type Props = {
  ci: (number | null)[]
  release: number
  baseline: Placed[]
  plan: Placed[]
  /** When set, jobs can be dragged; called with the job name and its new start slot. */
  onMove?: (name: string, startSlot: number) => void
  compact?: boolean
}

const LANE = 46

export function NightPlan({ ci, release, baseline, plan, onMove, compact }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ name: string; dx: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const n = ci.length
  const curveH = compact ? 150 : 210
  const top = 18
  const lanesTop = top + curveH + 64
  const height = lanesTop + plan.length * LANE + 34
  const left = 44, right = 4
  const x = scaleLinear().domain([0, n]).range([left, Math.max(width - right, left + 10)])
  const known = ci.filter((v): v is number => v != null)
  // Fitted to tonight's range, with the axis labelled, so a 10 g/kWh swing is visible but not hidden.
  const lo = known.length ? Math.min(...known) : 0, hi = known.length ? Math.max(...known) : 100
  const pad = Math.max(5, (hi - lo) * 0.25)
  const y = scaleLinear().domain([Math.max(0, lo - pad), hi + pad]).nice(4).range([top + curveH, top])
  const pts = ci.map((v, i) => [i + 0.5, v] as const)
  const ln = line<readonly [number, number | null]>().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1] ?? 0)).curve(curveMonotoneX)
  const ar = area<readonly [number, number | null]>().defined((d) => d[1] != null).x((d) => x(d[0])).y0(top + curveH).y1((d) => y(d[1] ?? 0)).curve(curveMonotoneX)
  const slotOf = (t: number) => Math.round((t - release) / SLOT_MS)
  const minI = known.length ? ci.indexOf(Math.min(...known)) : -1

  function startDrag(e: React.PointerEvent, p: Placed) {
    if (!onMove) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const box = svgRef.current!.getBoundingClientRect()
    setDrag({ name: p.name, dx: e.clientX - box.left - x(slotOf(p.start)) })
  }
  function moveDrag(e: React.PointerEvent) {
    const box = svgRef.current!.getBoundingClientRect()
    const px = e.clientX - box.left
    setHover(Math.max(0, Math.min(n - 1, Math.floor(x.invert(px)))))
    if (!drag || !onMove) return
    const s = Math.round(x.invert(px - drag.dx))
    onMove(drag.name, s)
  }
  function keyMove(e: React.KeyboardEvent, p: Placed) {
    if (!onMove) return
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (d) {
      e.preventDefault()
      onMove(p.name, slotOf(p.start) + d)
    }
  }

  const ticks = Array.from({ length: n + 1 }, (_, i) => i).filter((i) => i % (width < 560 ? 4 : 2) === 0)

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="block touch-pan-y"
          onPointerMove={moveDrag}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => {
            setHover(null)
            setDrag(null)
          }}
          role="group"
          aria-label="Tonight's forecast and the planned start of each job"
        >
          {y.ticks(3).map((t) => (
            <text key={t} x={left - 8} y={y(t)} dy="0.35em" textAnchor="end" fontSize={13} fill="var(--color-ink-2)">
              {t}
            </text>
          ))}
          <text x={0} y={top - 4} fontSize={13} fill="var(--color-ink-2)">g/kWh</text>
          <path d={ar(pts) ?? ''} fill="var(--color-paper-2)" />
          <path d={ln(pts) ?? ''} fill="none" stroke="var(--color-ink)" strokeWidth={2.5} />
          {minI >= 0 && (
            <g transform={`translate(${x(minI + 0.5)},${y(ci[minI] ?? 0) - 26})`}>
              <text textAnchor="middle" fontSize={26} fontWeight={800} fill="var(--color-low)">
                L
              </text>
            </g>
          )}
          {ticks.map((i) => (
            <text key={i} x={x(i)} y={top + curveH + 18} textAnchor={i === 0 ? 'start' : i === n ? 'end' : 'middle'} fontSize={14} fill="var(--color-ink-2)">
              {clock(release + i * SLOT_MS)}
            </text>
          ))}

          {plan.map((p, k) => {
            const b = baseline.find((q) => q.name === p.name)!
            const yy = lanesTop + k * LANE
            const moved = p.start !== b.start
            const w = x(slotOf(p.end)) - x(slotOf(p.start))
            const tx = x(slotOf(p.start))
            const pct = b.meanCi && p.meanCi != null ? Math.round((100 * (b.meanCi - p.meanCi)) / b.meanCi) : null
            return (
              <g key={p.name}>
                <text x={0} y={yy - 6} fontSize={14} fontWeight={700} fill="var(--color-ink)">
                  {p.name.replaceAll('_', ' ')}
                  <tspan fontWeight={400} fill="var(--color-ink-2)">
                    {p.meanCi != null ? `  ${Math.round(p.meanCi)} g/kWh` : '  no forecast'}
                    {pct != null && moved ? `  ${pct >= 0 ? '−' : '+'}${Math.abs(pct)}% vs cron` : ''}
                  </tspan>
                </text>
                {moved && (
                  <rect x={x(slotOf(b.start))} y={yy} width={x(slotOf(b.end)) - x(slotOf(b.start))} height={20} rx={4} fill="none" stroke="var(--color-ink-2)" strokeWidth={1.5} strokeDasharray="4 3" />
                )}
                <rect
                  x={tx}
                  y={yy}
                  width={Math.max(w, 6)}
                  height={20}
                  rx={4}
                  fill={moved ? 'var(--color-low)' : 'var(--color-ink)'}
                  className={onMove ? 'cursor-grab transition-[x] duration-300 ease-out active:cursor-grabbing motion-reduce:transition-none' : 'transition-[x] duration-500 ease-out motion-reduce:transition-none'}
                  tabIndex={onMove ? 0 : -1}
                  role={onMove ? 'slider' : undefined}
                  aria-label={onMove ? `${p.name} starts ${clock(p.start)}. Arrow keys move it by half an hour.` : undefined}
                  aria-valuenow={onMove ? slotOf(p.start) : undefined}
                  aria-valuemin={onMove ? 0 : undefined}
                  aria-valuemax={onMove ? n - 1 : undefined}
                  onPointerDown={(e) => startDrag(e, p)}
                  onKeyDown={(e) => keyMove(e, p)}
                />
              </g>
            )
          })}

          {hover != null && !drag && ci[hover] != null && (
            <g pointerEvents="none">
              <line x1={x(hover + 0.5)} x2={x(hover + 0.5)} y1={top} y2={top + curveH} stroke="var(--color-ink)" strokeDasharray="3 4" />
              <circle cx={x(hover + 0.5)} cy={y(ci[hover] ?? 0)} r={6} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={2} />
              <text x={Math.min(Math.max(x(hover + 0.5), 60), width - 60)} y={top + 2} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--color-ink)" paintOrder="stroke" stroke="var(--color-paper)" strokeWidth={5}>
                {clock(release + hover * SLOT_MS)} · {Math.round(ci[hover] ?? 0)} g/kWh
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  )
}

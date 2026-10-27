import { contours } from 'd3-contour'
import { geoPath, geoTransform } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { useMemo, useRef, useState } from 'react'
import type { Forecast } from '../lib/data'
import { REGION_NAMES } from '../lib/data'
import { clock, SLOT_MS } from '../lib/plan'
import { useWidth } from '../lib/useWidth'
import { bandColor, THRESHOLDS } from '../lib/colour'

// North to south, so the chart reads like the map it stands for.
export const NORTH_TO_SOUTH = [1, 2, 4, 3, 5, 6, 9, 8, 10, 7, 11, 13, 12, 14]
const UPSAMPLE = 4

type Props = {
  forecast: Forecast
  from: number
  to: number
  release: number
  deadline: number
  height?: number
}

/** Bilinear upsample so the contour bands read as a smooth field, not a grid. */
function upsample(z: number[][], k: number) {
  const rows = z.length, cols = z[0].length
  const R = (rows - 1) * k + 1, C = (cols - 1) * k + 1
  const out = new Array<number>(R * C)
  for (let r = 0; r < R; r++) {
    const y = r / k, y0 = Math.floor(y), y1 = Math.min(y0 + 1, rows - 1), fy = y - y0
    for (let c = 0; c < C; c++) {
      const x = c / k, x0 = Math.floor(x), x1 = Math.min(x0 + 1, cols - 1), fx = x - x0
      const top = z[y0][x0] * (1 - fx) + z[y0][x1] * fx
      const bot = z[y1][x0] * (1 - fx) + z[y1][x1] * fx
      out[r * C + c] = top * (1 - fy) + bot * fy
    }
  }
  return { values: out, R, C }
}

export function CarbonField({ forecast, from, to, release, deadline, height = 460 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const narrow = width < 640
  const left = narrow ? 8 : 168
  const top = 34
  const bottom = 30
  const innerW = Math.max(width - left - 8, 10)
  const innerH = height - top - bottom

  const grid = useMemo(() => {
    const times: number[] = []
    for (let t = from; t < to; t += SLOT_MS) times.push(t)
    const rows = NORTH_TO_SOUTH.filter((id) => forecast.regional[id]?.length)
    const z = rows.map((id) => {
      const byT = new Map(forecast.regional[id].map((s) => [s.t, s.ci]))
      const row = times.map((t) => byT.get(t) ?? null)
      // Fill rare gaps from the neighbouring half-hour so the field stays continuous.
      return row.map((v, i) => v ?? row[i - 1] ?? row[i + 1] ?? 0)
    })
    return { times, rows, z }
  }, [forecast, from, to])

  const shapes = useMemo(() => {
    if (!grid.rows.length || grid.times.length < 2) return []
    const { values, R, C } = upsample(grid.z, UPSAMPLE)
    const sx = innerW / (C - 1), sy = innerH / (R - 1)
    const proj = geoTransform({
      point(x: number, y: number) {
        this.stream.point(left + (x - 0.5) * sx, top + (y - 0.5) * sy)
      },
    })
    const path = geoPath(proj)
    return contours().size([C, R]).thresholds(THRESHOLDS)(values).map((g) => ({ v: g.value, d: path(g) ?? '' }))
  }, [grid, innerW, innerH, left])

  if (!grid.rows.length) return <div ref={ref} className="h-40" />

  const x = scaleLinear().domain([from, to - SLOT_MS]).range([left, left + innerW])
  const y = (r: number) => top + (grid.rows.length === 1 ? innerH / 2 : (r * innerH) / (grid.rows.length - 1))

  // H and L inside the scheduling window.
  let lo = { r: 0, c: 0, v: Infinity }, hi = { r: 0, c: 0, v: -Infinity }
  grid.z.forEach((row, r) =>
    row.forEach((v, c) => {
      const t = grid.times[c]
      if (t < release || t >= deadline) return
      if (v < lo.v) lo = { r, c, v }
      if (v > hi.v) hi = { r, c, v }
    }),
  )

  const ticks = grid.times.filter((t) => new Date(t).getUTCMinutes() === 0 && (narrow ? new Date(t).getUTCHours() % 4 === 0 : new Date(t).getUTCHours() % 2 === 0))

  function onMove(e: React.PointerEvent) {
    const box = svgRef.current!.getBoundingClientRect()
    const px = e.clientX - box.left, py = e.clientY - box.top
    if (px < left || px > left + innerW || py < top - 8 || py > top + innerH + 8) return setHover(null)
    const c = Math.round(((px - left) / innerW) * (grid.times.length - 1))
    const r = Math.round(((py - top) / innerH) * (grid.rows.length - 1))
    setHover({ r: Math.max(0, Math.min(grid.rows.length - 1, r)), c: Math.max(0, Math.min(grid.times.length - 1, c)) })
  }

  const label = (id: number) => (narrow ? '' : REGION_NAMES[id])
  const hv = hover && { id: grid.rows[hover.r], t: grid.times[hover.c], v: grid.z[hover.r][hover.c] }

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Forecast carbon intensity by region from ${clock(from)} to ${clock(to)}, UK time. Lowest in the window: ${REGION_NAMES[grid.rows[lo.r]]} at ${clock(grid.times[lo.c])}, ${Math.round(lo.v)} gCO2/kWh.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="block touch-pan-y"
      >
        <defs>
          <clipPath id="field-clip">
            <rect x={left} y={top} width={innerW} height={innerH} rx={4} />
          </clipPath>
        </defs>
        <g clipPath="url(#field-clip)">
          {shapes.map((s) => (
            <path key={s.v} d={s.d} fill={bandColor(s.v)} />
          ))}
          {shapes.map((s) => (
            <path key={`i${s.v}`} d={s.d} fill="none" stroke="var(--color-ink)" strokeOpacity={0.28} strokeWidth={1.25} />
          ))}
          {/* Outside the window: veiled, still readable. */}
          <rect x={left} y={top} width={Math.max(0, x(release) - left)} height={innerH} fill="var(--color-paper)" opacity={0.55} />
          <rect x={x(deadline)} y={top} width={Math.max(0, left + innerW - x(deadline))} height={innerH} fill="var(--color-paper)" opacity={0.55} />
        </g>

        {[{ t: release, txt: `${clock(release)} release` }, { t: deadline, txt: `${clock(deadline)} deadline` }].map((m) =>
          m.t >= from && m.t <= to ? (
            <g key={m.txt}>
              <line x1={x(m.t)} x2={x(m.t)} y1={top - 6} y2={top + innerH} stroke="var(--color-ink)" strokeWidth={2} />
              <text x={x(m.t) + 6} y={top - 12} fontSize={14} fontWeight={700} fill="var(--color-ink)">
                {m.txt}
              </text>
            </g>
          ) : null,
        )}

        {grid.rows.map((id, r) =>
          label(id) ? (
            <text key={id} x={left - 12} y={y(r)} dy="0.35em" textAnchor="end" fontSize={14} fill="var(--color-ink-2)">
              {label(id)}
            </text>
          ) : null,
        )}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={height - 8} textAnchor="middle" fontSize={14} fill="var(--color-ink-2)">
            {clock(t)}
          </text>
        ))}

        {[{ p: lo, ch: 'L', fill: 'var(--color-low)' }, { p: hi, ch: 'H', fill: 'var(--color-high)' }].map(({ p, ch, fill }) =>
          Number.isFinite(p.v) ? (
            <g key={ch} transform={`translate(${Math.min(Math.max(x(grid.times[p.c]), left + 26), left + innerW - 26)},${Math.min(Math.max(y(p.r), top + 26), top + innerH - 44)})`}>
              <circle r={22} fill="var(--color-paper)" />
              <text textAnchor="middle" dy="0.36em" fontSize={30} fontWeight={800} fill={fill}>
                {ch}
              </text>
              <text textAnchor="middle" y={38} fontSize={13} fontWeight={700} fill="var(--color-ink)" paintOrder="stroke" stroke="var(--color-paper)" strokeWidth={4}>
                {Math.round(p.v)}
              </text>
            </g>
          ) : null,
        )}

        {hv && hover && (
          <g pointerEvents="none">
            <line x1={x(hv.t)} x2={x(hv.t)} y1={top} y2={top + innerH} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="3 4" />
            <circle cx={x(hv.t)} cy={y(hover.r)} r={6} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hv && hover && (
        <div
          className={/* taste-skill-ignore: floating tooltip */ 'pointer-events-none absolute z-10 rounded-md bg-ink px-3 py-2 text-[15px] leading-snug text-paper shadow-lg'}
          style={{ left: Math.min(x(hv.t) + 14, width - 220), top: Math.max(y(hover.r) - 56, 0) }}
        >
          <div className="font-bold">{REGION_NAMES[hv.id]}</div>
          <div>
            {clock(hv.t)} · {Math.round(hv.v)} gCO2/kWh
          </div>
        </div>
      )}
    </div>
  )
}

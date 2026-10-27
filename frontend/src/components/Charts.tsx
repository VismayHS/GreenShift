import { contours } from 'd3-contour'
import { geoPath, geoTransform } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import { useMemo, useState } from 'react'
import { bandColor, THRESHOLDS } from '../lib/colour'
import type { History } from '../lib/data'
import { useWidth } from '../lib/useWidth'

export type Series = { name: string; color: string; values: (number | null)[] }

const hh = (slot: number) => `${String(Math.floor(slot / 2)).padStart(2, '0')}:${slot % 2 ? '30' : '00'}` // taste-skill-ignore: clock time

/** Lines over the 48 half-hours of a UK-local day, labelled at their ends, with a crosshair readout. */
export function ProfileChart({ series, height = 360, label }: { series: Series[]; height?: number; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const narrow = width < 640
  const left = 44, right = narrow ? 12 : 170, top = 16, bottom = 34
  const x = scaleLinear().domain([0, 47]).range([left, Math.max(width - right, left + 10)])
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null))
  const y = scaleLinear().domain([0, Math.max(...all) * 1.08]).nice().range([height - bottom, top])
  const ln = line<number | null>().defined((v) => v != null).x((_, i) => x(i)).y((v) => y(v ?? 0)).curve(curveMonotoneX)

  // End labels, nudged apart so they never collide.
  const ends = series.map((s) => ({ s, y: y(s.values[47] ?? 0) })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 18)

  return (
    <figure ref={ref} className="w-full">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          className="block touch-pan-y"
          onPointerMove={(e) => {
            const b = e.currentTarget.getBoundingClientRect()
            setHover(Math.max(0, Math.min(47, Math.round(x.invert(e.clientX - b.left)))))
          }}
          onPointerLeave={() => setHover(null)}
        >
          {y.ticks(4).map((t) => (
            <text key={t} x={left - 8} y={y(t)} dy="0.35em" textAnchor="end" fontSize={13} fill="var(--color-ink-2)">
              {t}
            </text>
          ))}
          {[0, 12, 24, 36, 47].map((i) => (
            <text key={i} x={x(i)} y={height - 10} textAnchor="middle" fontSize={13} fill="var(--color-ink-2)">
              {i === 47 ? '24:00' : hh(i)}
            </text>
          ))}
          {series.map((s) => (
            <path key={s.name} d={ln(s.values) ?? ''} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />
          ))}
          {!narrow &&
            ends.map(({ s, y: ly }) => (
              <text key={s.name} x={x(47) + 10} y={ly} dy="0.35em" fontSize={14} fill="var(--color-ink)">
                <tspan fill={s.color} fontWeight={800}>— </tspan>
                {s.name}
              </text>
            ))}
          {hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={top} y2={height - bottom} stroke="var(--color-ink)" strokeDasharray="3 4" />
              {series.map((s) =>
                s.values[hover] != null ? <circle key={s.name} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={5} fill={s.color} stroke="var(--color-paper)" strokeWidth={2} /> : null,
              )}
            </g>
          )}
        </svg>
      )}
      {narrow && (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
          {series.map((s) => (
            <li key={s.name}>
              <span style={{ color: s.color }} className="font-extrabold">— </span>
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <figcaption className="mt-2 min-h-[1.5em] text-[15px] text-ink-2" aria-live="polite">
        {hover != null
          ? `${hh(hover)} UK time: ` + series.map((s) => `${s.name} ${s.values[hover] == null ? 'n/a' : Math.round(s.values[hover]!)}`).join(' · ') + ' gCO2/kWh'
          : 'Move across the chart to read each line.'}
      </figcaption>
    </figure>
  )
}

/** Two years of national actual intensity as one field: week down, half-hour across (UTC). */
export function HistoryField({ history, height = 520 }: { history: History; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<{ d: number; s: number } | null>(null)
  const left = 70, top = 8, bottom = 30
  const innerW = Math.max(width - left - 4, 10), innerH = height - top - bottom
  // Weekly means of each half-hour; source gaps are skipped, not filled.
  const weeks = useMemo(() => {
    const out: { day: string; v: (number | null)[] }[] = []
    for (let d = 0; d < history.days.length; d += 7) {
      const block = history.actual.slice(d, d + 7)
      out.push({ day: history.days[d], v: Array.from({ length: 48 }, (_, s) => {
        const xs = block.map((r) => r[s]).filter((x): x is number => x != null)
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
      }) })
    }
    return out
  }, [history])
  const rows = weeks.length

  const shapes = useMemo(() => {
    const vals: number[] = []
    // Gaps (source outages) take the value of the same slot the day before, for drawing only.
    weeks.forEach((w, d) => w.v.forEach((v, s) => vals.push(v ?? weeks[d - 1]?.v[s] ?? 120)))
    const sx = innerW / 48, sy = innerH / rows
    const path = geoPath(geoTransform({ point(px: number, py: number) { this.stream.point(left + px * sx, top + py * sy) } }))
    return contours().size([48, rows]).thresholds(THRESHOLDS)(vals).map((g) => ({ v: g.value, d: path(g) ?? '' }))
  }, [weeks, innerW, innerH, rows])

  const months = weeks.map((w, i) => ({ d: w.day, i })).filter(({ d, i }) => i === 0 || weeks[i - 1].day.slice(0, 7) !== d.slice(0, 7)).filter(({ d }) => ['01', '04', '07', '10'].includes(d.slice(5, 7))) // taste-skill-ignore: month numbers, not index labels
  const cell = hover && weeks[hover.d]?.v[hover.s]

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="National carbon intensity for every half-hour of 2024 and 2025. Lower values cluster at night, at weekends and in summer middays."
          className="block touch-pan-y"
          onPointerMove={(e) => {
            const b = e.currentTarget.getBoundingClientRect()
            const s = Math.floor(((e.clientX - b.left - left) / innerW) * 48)
            const d = Math.floor(((e.clientY - b.top - top) / innerH) * rows)
            setHover(s >= 0 && s < 48 && d >= 0 && d < rows ? { d, s } : null)
          }}
          onPointerLeave={() => setHover(null)}
        >
          {shapes.map((s) => (
            <path key={s.v} d={s.d} fill={bandColor(s.v)} />
          ))}
          {months.map(({ d, i }) => (
            <text key={d} x={left - 10} y={top + (i / rows) * innerH} dy="0.8em" textAnchor="end" fontSize={13} fill="var(--color-ink-2)">
              {new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
            </text>
          ))}
          {[0, 12, 24, 36].map((s) => (
            <text key={s} x={left + (s / 48) * innerW} y={height - 8} textAnchor="middle" fontSize={13} fill="var(--color-ink-2)">
              {hh(s)}
            </text>
          ))}
          <text x={left + innerW} y={height - 8} textAnchor="end" fontSize={13} fill="var(--color-ink-2)">
            UTC
          </text>
          {hover && <rect x={left + (hover.s / 48) * innerW} y={top + (hover.d / rows) * innerH} width={innerW / 48} height={Math.max(innerH / rows, 2)} fill="none" stroke="var(--color-ink)" strokeWidth={2} pointerEvents="none" />}
        </svg>
      )}
      <p className="mt-2 min-h-[1.5em] text-[15px] text-ink-2" aria-live="polite">
        {hover
          ? `Week of ${weeks[hover.d].day}, ${hh(hover.s)} UTC: ${cell == null ? 'no data' : `${Math.round(cell)} gCO2/kWh on average`}`
          : 'Each row is a week, each column a half-hour of the day. Point at the field to read it.'}
      </p>
    </div>
  )
}

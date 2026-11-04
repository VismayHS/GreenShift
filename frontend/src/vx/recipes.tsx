// Remaining Exhibit Register patterns (Vertex_design.md §6).
import type { ComponentType, ReactNode } from 'react'

type Icon = ComponentType<{ size?: number; className?: string }>

export function Notice({ tone = 'strong', children }: { tone?: 'strong' | 'fail' | 'possible'; children: ReactNode }) {
  const cls = tone === 'fail' ? 'border-vx-fail/30 bg-vx-fail-wash text-vx-fail'
    : tone === 'possible' ? 'border-vx-possible/30 bg-vx-possible-wash text-vx-possible'
    : 'border-vx-strong/30 bg-vx-strong-wash text-vx-strong'
  return <div role={tone === 'fail' ? 'alert' : 'status'} className={`rounded-[8px] border px-4 py-3 text-[15.5px] leading-relaxed ${cls}`}>{children}</div>
}

/** At most one per page: the thing that has to happen first. */
export function FirstStepCallout({ icon: I, step, title, children, action }: { icon: Icon; step: string; title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-4 rounded-[10px] border border-l-[5px] border-vx-stamp/40 border-l-vx-stamp bg-vx-stamp-wash px-5 py-4 shadow-sm">
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-vx-stamp text-white"><I size={22} /></span>
      <div className="min-w-[240px] flex-1">
        <div className="font-vxmono text-[12px] font-semibold uppercase tracking-[0.12em] text-vx-stamp">{step}</div>
        <div className="text-[17px] font-semibold text-vx-stamp-deep">{title}</div>
        <p className="mt-0.5 text-[14.5px] leading-snug text-vx-ink-2">{children}</p>
      </div>
      {action}
    </div>
  )
}

/** One summary strip of up to four numbers. Colour only when the number reports state. */
export function StatsStrip({ stats }: { stats: { n: ReactNode; label: ReactNode; color?: string; note?: ReactNode }[] }) {
  return (
    <div className={`grid grid-cols-1 gap-5 rounded-[10px] border border-vx-rule bg-vx-sheet p-5 sm:grid-cols-2 md:p-6 ${stats.length > 3 ? 'xl:grid-cols-4' : 'md:grid-cols-3'}`}>
      {stats.map(({ n, label, color = 'var(--vx-ink)', note }, i) => (
        <div key={i} className="min-w-0">
          <span className="text-[36px] font-bold leading-none tracking-[-0.02em] tabular-nums" style={{ color }}>{n}</span>
          <div className="mt-2 font-vxmono text-[12.5px] uppercase tracking-[0.12em] text-vx-ink-3">{label}</div>
          {note ? <div className="mt-1 text-[14px] leading-snug text-vx-ink-3">{note}</div> : null}
        </div>
      ))}
    </div>
  )
}

export function ListCard({ title, href, stamp, children }: { title: ReactNode; href?: string; stamp?: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex flex-col rounded-[6px] border border-vx-rule bg-vx-sheet p-4 transition-colors hover:border-vx-stamp" style={{ borderLeft: '5px solid var(--vx-rule)' }}>
      <div className="flex items-start justify-between gap-3">
        {href ? (
          <a href={href} className="min-w-0 text-[18px] font-semibold leading-snug text-vx-ink no-underline hover:underline">{title}</a>
        ) : (
          <span className="min-w-0 text-[18px] font-semibold leading-snug text-vx-ink">{title}</span>
        )}
        {stamp ? <span className="shrink-0">{stamp}</span> : null}
      </div>
      {children}
    </li>
  )
}

export function FilterPill({ selected, children, ...rest }: { selected: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-pressed={selected} {...rest}
      className={`inline-flex h-8 max-w-[280px] items-center gap-1.5 rounded-full border px-3 text-[14.5px] ${selected ? 'border-vx-ink bg-vx-ink text-white' : 'border-vx-rule bg-vx-sheet text-vx-ink-2 hover:border-vx-stamp'}`}>
      <span className="truncate">{children}</span>
    </button>
  )
}

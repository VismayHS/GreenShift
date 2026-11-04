// The rail, top bar and mobile drawer (Vertex_design.md §5).
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { ChevronRight, Menu, X } from 'lucide-react'

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>

/** GreenShift mark: a shifted block on a ruled line (a job moved later in the night). */
function Mark({ size = 36 }: { size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-[8px] bg-vx-ink">
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
        <path d="M3 17h18" stroke="#b8bcb2" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="4" y="11" width="5" height="4" rx="1" stroke="#b8bcb2" strokeWidth="1.4" strokeDasharray="2 1.6" />
        <rect x="13" y="7" width="7" height="8" rx="1.2" fill="#ffffff" />
        <path d="M9.6 9.5h2.2m0 0-1.1-1.1m1.1 1.1-1.1 1.1" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export type Brand = { name: string; tagline?: string; href?: string }

function BrandBlock({ name, tagline, href = '#/' }: Brand) {
  return (
    <a href={href} className="flex h-[68px] shrink-0 items-center gap-3.5 border-b border-vx-rule px-5 no-underline">
      <Mark />
      <span className="min-w-0">
        <span className="block text-[21px] font-bold leading-none tracking-[0.04em] text-vx-ink">{name}</span>
        {tagline && <span className="mt-1.5 block whitespace-nowrap font-vxmono text-[11px] uppercase leading-none tracking-[0.22em] text-vx-ink-3">{tagline}</span>}
      </span>
    </a>
  )
}

export function RailLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-3 px-4 font-vxmono text-[11px] font-medium uppercase tracking-[0.16em] text-vx-ink-3">
      <span className="shrink-0">{children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-vx-rule-strong to-transparent" />
    </div>
  )
}

export function RailGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="mt-7 first:mt-2">
      {label && <RailLabel>{label}</RailLabel>}
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  )
}

export function RailItem({ href, label, icon: I, active = false, count, highlight = false }: {
  href: string; label: string; icon: Icon; active?: boolean; count?: number; highlight?: boolean
}) {
  const cls = `group relative flex min-h-[48px] w-full items-center gap-3 rounded-[6px] py-2 pl-[18px] pr-4 text-left text-[15px] leading-tight no-underline transition-colors duration-150 ${
    active
      ? 'bg-gradient-to-r from-vx-stamp/[0.14] via-vx-stamp/[0.04] to-transparent font-semibold text-vx-ink before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-[3px] before:rounded-r-[3px] before:bg-vx-stamp before:shadow-[0_0_9px_1px_color-mix(in_srgb,var(--vx-stamp)_45%,transparent)]'
      : highlight
        ? 'bg-vx-stamp-wash font-semibold text-vx-stamp-deep ring-1 ring-inset ring-vx-stamp/25 hover:ring-vx-stamp/50'
        : 'text-vx-ink-2 hover:bg-vx-hover hover:text-vx-ink'
  }${highlight && !active ? ' vx-breathe' : ''}`
  return (
    <li>
      <a href={href} aria-current={active ? 'page' : undefined} className={cls}>
        <I className={`h-[18px] w-[18px] shrink-0 ${active || highlight ? 'text-vx-stamp' : 'text-vx-ink-3 group-hover:text-vx-ink'}`} aria-hidden="true" />
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{label}</span>
        {typeof count === 'number' && (
          <span className={`ml-auto min-w-[26px] shrink-0 rounded-full px-2 text-center text-[12.5px] font-semibold tabular-nums leading-6 ${count ? 'bg-vx-stamp-wash text-vx-stamp-deep' : 'bg-vx-sheet text-vx-ink-3'}`}>{count}</span>
        )}
      </a>
    </li>
  )
}

export type Crumb = { label: string; href?: string }

function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-[20px] leading-none md:flex">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-2">
            {i > 0 && <ChevronRight className="h-5 w-5 shrink-0 text-vx-ink-3" aria-hidden="true" />}
            {c.href && !last ? (
              <a href={c.href} className="truncate font-medium text-vx-ink-2 no-underline hover:text-vx-ink hover:underline">{c.label}</a>
            ) : (
              <span className={`max-w-[320px] truncate ${last ? 'font-semibold text-vx-ink' : 'font-medium text-vx-ink-2'}`}>{c.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default function AppShell({ brand, rail, crumbs, actions, children }: {
  brand: Brand; rail: ReactNode; crumbs: Crumb[]; actions?: ReactNode; children: ReactNode
}) {
  const [drawer, setDrawer] = useState(false)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    try { setHidden(localStorage.getItem('vx-rail') === 'hidden') } catch { /* storage blocked */ }
  }, [])
  useEffect(() => {
    const close = () => setDrawer(false)
    addEventListener('hashchange', close)
    return () => removeEventListener('hashchange', close)
  }, [])
  function toggleRail() {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setHidden((v) => {
        try { localStorage.setItem('vx-rail', v ? 'shown' : 'hidden') } catch { /* storage blocked */ }
        return !v
      })
    } else setDrawer((v) => !v)
  }
  const nav = <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">{rail}</nav>
  return (
    <div className="vx flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[6px] focus:bg-vx-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <aside aria-label="Navigation" className={`sticky top-0 z-30 hidden h-screen w-[280px] shrink-0 flex-col border-r border-vx-rule bg-vx-rail ${hidden ? '' : 'lg:flex'}`}>
        <BrandBlock {...brand} />
        {nav}
      </aside>

      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-[rgba(28,36,51,0.28)] backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} aria-hidden="true" />
          <aside aria-label="Navigation" className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,88vw)] flex-col border-r border-vx-rule bg-vx-rail shadow-lift lg:hidden">
            <div className="flex items-center">
              <div className="min-w-0 flex-1"><BrandBlock {...brand} /></div>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="mr-2 inline-flex h-10 w-10 items-center justify-center rounded-[6px] hover:bg-vx-hover">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center gap-3 border-b border-vx-rule bg-vx-rail px-3 md:gap-4 md:px-6">
          <button type="button" onClick={toggleRail} aria-label="Show or hide the menu" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-vx-ink-2 hover:bg-vx-hover hover:text-vx-ink">
            <Menu className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
          <a href={brand.href || '#/'} className={`shrink-0 items-center gap-2.5 no-underline ${hidden ? 'flex' : 'flex lg:hidden'}`}>
            <Mark />
            <span className="text-[21px] font-bold tracking-[0.05em] text-vx-ink">{brand.name}</span>
          </a>
          <Crumbs crumbs={crumbs} />
          {actions && <span className="ml-auto flex items-center gap-2.5">{actions}</span>}
        </header>
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

// One vocabulary for every page: a state is a Stamp, an action is a Button, a recorded value
// is a Field, and missing data is an EmptyNote that says WHY it is missing. (Vertex_design.md §4)
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { AlertTriangle, Check, CircleDashed, Copy, ExternalLink, Info, Loader2, Lock, ShieldCheck } from 'lucide-react'

export type Tone = 'info' | 'done' | 'strong' | 'possible' | 'failed' | 'running' | 'queued' | 'skipped' | 'rejected' | 'lead' | 'private' | 'sealed'
type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>

const STAMP_ICON: Partial<Record<Tone, Icon>> = { sealed: ShieldCheck, failed: AlertTriangle, done: Check, private: Lock, queued: CircleDashed }

export function Stamp({ tone = 'info', children, title, press = false, icon = true, className = '' }: {
  tone?: Tone; children: ReactNode; title?: string; press?: boolean; icon?: boolean; className?: string
}) {
  const I = icon ? STAMP_ICON[tone] : undefined
  return (
    <span className={`vx-stamp ${press ? 'vx-press' : ''} ${className}`} data-tone={tone} title={title}>
      {I ? <I aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

const BTN = {
  primary: 'bg-vx-stamp text-white border-vx-stamp hover:bg-vx-stamp-deep hover:border-vx-stamp-deep',
  secondary: 'bg-vx-sheet text-vx-ink border-vx-rule-strong hover:bg-vx-hover',
  quiet: 'bg-transparent text-vx-ink-2 border-transparent hover:bg-vx-hover hover:text-vx-ink',
  danger: 'bg-vx-sheet text-vx-fail border-vx-rule-strong hover:bg-vx-fail-wash',
}

export function Button({ variant = 'secondary', size = 'md', loading = false, icon: I, children, className = '', href, ...rest }: {
  variant?: keyof typeof BTN; size?: 'sm' | 'md'; loading?: boolean; icon?: Icon; children: ReactNode; className?: string; href?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sz = size === 'sm' ? 'h-9 px-3 text-[15px] gap-1.5' : 'h-10 px-4 text-[16px] gap-2'
  const cls = `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[6px] border font-medium no-underline
    transition-colors duration-150 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 ${sz} ${BTN[variant]} ${className}`
  const inner = <>{loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : I ? <I className="h-4 w-4" aria-hidden="true" /> : null}{children}</>
  if (href) return <a href={href} className={cls}>{inner}</a>
  return <button type="button" {...rest} disabled={rest.disabled || loading} className={cls}>{inner}</button>
}

/** A labelled value, as written on a tag. `empty` says what an absent value MEANS. */
export function Field({ label, value, mono = false, empty = '—', note, tip, children }: {
  label: string; value?: ReactNode; mono?: boolean; empty?: string; note?: ReactNode; tip?: string; children?: ReactNode
}) {
  const has = children != null || (value !== undefined && value !== null && value !== '')
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 font-vxmono text-[12px] font-medium uppercase tracking-[0.12em] text-vx-ink-3">
        {label}
        {tip ? <Tip text={tip} /> : null}
      </div>
      <div className={`mt-0.5 break-words ${has ? 'text-vx-ink' : 'text-vx-ink-3'} ${mono ? 'font-vxmono text-[15px]' : 'text-[16px]'}`}>{children ?? (has ? value : empty)}</div>
      {note ? <div className="mt-1 text-[14px] leading-snug text-vx-ink-3">{note}</div> : null}
    </div>
  )
}

/** An ⓘ that explains, on hover or keyboard focus. Caveats live here, not in paragraphs. */
export function Tip({ text, label = 'More information' }: { text: ReactNode; label?: string }) {
  const id = useId()
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label={label} aria-describedby={id} className="inline-flex h-4 w-4 items-center justify-center rounded-full text-vx-ink-3 hover:text-vx-stamp">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span id={id} role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-[min(18rem,calc(100vw-2rem))] rounded-[6px] border border-vx-rule bg-vx-sheet p-3 text-[14.5px] font-normal normal-case leading-snug tracking-normal text-vx-ink-2 shadow-lift group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  )
}

/** A value someone will paste elsewhere: mono, with a copy button. */
export function CopyValue({ value, className = '' }: { value: string; className?: string }) {
  const [done, setDone] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  if (!value) return null
  return (
    <span className={`inline-flex items-center gap-1.5 font-vxmono text-[15px] ${className}`}>
      <span className="break-all">{value}</span>
      <button type="button" aria-label={done ? 'Copied' : `Copy ${value}`}
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setDone(true)
            clearTimeout(t.current)
            t.current = setTimeout(() => setDone(false), 1400)
          }).catch(() => {})
        }}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-vx-ink-3 hover:bg-vx-hover hover:text-vx-stamp">
        {done ? <Check className="h-3.5 w-3.5 text-vx-strong" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
    </span>
  )
}

/** Designed absence: the section stays and says why it is empty. */
export function EmptyNote({ tone = 'info', title, children, action }: { tone?: 'info' | 'failed' | 'possible'; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const ring = tone === 'failed' ? 'border-vx-fail/40 bg-vx-fail-wash' : tone === 'possible' ? 'border-vx-possible/40 bg-vx-possible-wash' : 'border-vx-rule bg-vx-sheet'
  return (
    <div className={`rounded-[8px] border-2 border-dashed ${ring} px-5 py-4`}>
      {title ? <div className={`text-[16px] font-semibold ${tone === 'failed' ? 'text-vx-fail' : 'text-vx-ink'}`}>{title}</div> : null}
      {children ? <div className="mt-1 max-w-[72ch] text-[15.5px] leading-relaxed text-vx-ink-2">{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function ExtLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={`inline min-w-0 text-vx-stamp underline decoration-vx-stamp/40 [overflow-wrap:anywhere] hover:decoration-vx-stamp ${className}`}>
      {children}
      <ExternalLink className="ml-1 inline h-3 w-3 shrink-0 align-[-1px]" aria-hidden="true" />
    </a>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`vx-skeleton block ${className}`} />
}

/** A section heading inside a page. More space above than below. */
export function SectionHead({ title, count, tip, children, id }: { title: ReactNode; count?: number; tip?: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div id={id} className="mb-3 mt-10 flex scroll-mt-24 flex-wrap items-end justify-between gap-3 first:mt-0">
      <h2 className="flex items-center gap-2 text-[21px] font-semibold tracking-[-0.01em] text-vx-ink">
        {title}
        {typeof count === 'number' ? <span className="font-normal text-vx-ink-3">{count}</span> : null}
        {tip ? <Tip text={tip} /> : null}
      </h2>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

/** A segmented switch. options: [[value, label], ...] */
export function Segmented<T extends string | number>({ options, value, onChange, label = 'View' }: {
  options: [T, string][]; value: T; onChange: (v: T) => void; label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[6px] border border-vx-rule-strong bg-vx-sheet p-0.5">
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`h-8 rounded-[6px] px-3.5 text-[15px] font-medium transition-colors ${value === v ? 'bg-vx-ink text-white' : 'text-vx-ink-2 hover:text-vx-ink'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

/** The page frame. `wide` pages (lists, data) use the full width; reading pages keep a measure. */
export function Page({ children, wide = false, className = '' }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <div className={`px-5 pb-28 pt-8 md:px-10 md:pt-10 ${wide ? '' : 'max-w-[1180px]'} ${className}`}>{children}</div>
}

export function PageHead({ title, lede, actions, meta, children }: { title: ReactNode; lede?: ReactNode; actions?: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8">
      <span aria-hidden="true" className="mb-4 block h-[3px] w-12 rounded-full bg-vx-stamp" />
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-vx-ink [overflow-wrap:anywhere] md:text-[40px]">{title}</h1>
            {meta}
          </div>
          {lede && <p className="mt-3 max-w-[70ch] text-[17px] leading-relaxed text-vx-ink-2">{lede}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

/** A form control with its label set into its top border. */
export function Labelled({ label, htmlFor, className = '', children }: { label: string; htmlFor: string; className?: string; children: ReactNode }) {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={htmlFor} className="pointer-events-none absolute -top-2.5 left-3 z-[1] bg-vx-sheet px-1.5 font-vxmono text-[11.5px] font-medium uppercase leading-5 tracking-[0.14em] text-vx-ink-3">
        {label}
      </label>
      {children}
    </div>
  )
}

/** A sheet panel: hairline, 10px corners, no shadow. */
export function Panel({ children, className = '', pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`rounded-[10px] border border-vx-rule bg-vx-sheet ${pad ? 'p-5 md:p-6' : ''} ${className}`}>{children}</div>
}

/** A register table inside a scrolling sheet, so wide tables never widen the page. */
export function Register({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-vx-rule bg-vx-sheet">
      <table className="vx-register">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { BarChart3, BookOpenCheck, Cpu, FlaskConical, Gauge, LayoutDashboard, MoonStar, Scale, Waves } from 'lucide-react'
import AppShell, { RailGroup, RailItem, type Crumb } from './vx/AppShell'
import { Stamp } from './vx/primitives'
import { useResults } from './lib/hooks'
import { TEAM } from './lib/team'
import { Summary } from './pages/Summary'
import { Carbon } from './pages/Carbon'
import { EnergyPage } from './pages/Energy'
import { SchedulerPage } from './pages/Scheduler'
import { ResultsPage } from './pages/Results'
import { Replication } from './pages/Replication'
import { Tonight } from './pages/Tonight'
import { Governance } from './pages/Governance'


const ROUTES = {
  '': { label: 'Summary', group: 'Overview', icon: LayoutDashboard, page: Summary },
  carbon: { label: 'Carbon data', group: 'Evidence', icon: Waves, page: Carbon },
  energy: { label: 'Energy measurement', group: 'Evidence', icon: Cpu, page: EnergyPage },
  scheduler: { label: 'Scheduler', group: 'Evidence', icon: Gauge, page: SchedulerPage },
  results: { label: 'Savings and delay', group: 'Results', icon: BarChart3, page: ResultsPage },
  replication: { label: 'Paper replication', group: 'Results', icon: FlaskConical, page: Replication },
  tonight: { label: 'Plan tonight', group: 'Live', icon: MoonStar, page: Tonight },
  governance: { label: 'Responsible AI', group: 'Governance', icon: Scale, page: Governance },
} as const
type Route = keyof typeof ROUTES

const routeOf = (): Route => {
  const key = location.hash.replace(/^#\/?/, '').split(/[/?#]/)[0]
  return (key in ROUTES ? key : '') as Route
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeOf)
  const results = useResults()
  useEffect(() => {
    const on = () => {
      setRoute(routeOf())
      window.scrollTo({ top: 0 })
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  useEffect(() => {
    document.title = route ? `${ROUTES[route].label} · GreenShift` : 'GreenShift'
  }, [route])

  const Page = ROUTES[route].page
  const groups = [...new Set(Object.values(ROUTES).map((r) => r.group))]
  const crumbs: Crumb[] = route ? [{ label: 'GreenShift', href: '#/' }, { label: ROUTES[route].label }] : [{ label: 'GreenShift' }, { label: 'Summary' }]
  const status = results.data?.status

  return (
    <AppShell
      brand={{ name: 'GreenShift', tagline: 'Carbon-aware batch', href: '#/' }}
      crumbs={crumbs}
      actions={status === 'placeholder' ? <Stamp tone="lead" title="Job sizes are placeholders until the RAPL measurement campaign completes">Placeholder sizes</Stamp>
        : status === 'measured' ? <Stamp tone="done">Measured sizes</Stamp> : null}
      rail={
        <>
          {groups.map((g) => (
            <RailGroup key={g} label={g}>
              {(Object.entries(ROUTES) as [Route, (typeof ROUTES)[Route]][]).filter(([, r]) => r.group === g).map(([k, r]) => (
                <RailItem key={k} href={`#/${k}`} label={r.label} icon={r.icon} active={route === k} highlight={k === 'tonight'} />
              ))}
            </RailGroup>
          ))}
          <div className="mt-8 border-t border-vx-rule px-4 pt-4 text-[13px] leading-relaxed text-vx-ink-3">
            <div className="mb-1 flex items-center gap-1.5 font-vxmono text-[11px] uppercase tracking-[0.16em]"><BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />Team</div>
            {TEAM.map((m) => <div key={m.srn}>{m.name}</div>)}
            <div className="mt-2">UE24AM343AB3 · Track G</div>
          </div>
        </>
      }
    >
      <Page />
    </AppShell>
  )
}

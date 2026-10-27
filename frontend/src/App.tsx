import { useEffect, useState } from 'react'
import { Story } from './pages/Story'
import { Tonight } from './pages/Tonight'

type Route = 'story' | 'tonight'
const routeOf = (): Route => (location.hash.startsWith('#/tonight') ? 'tonight' : 'story')

export const TEAM = [
  { name: 'Vismay HS', srn: 'PES1UG24AM325' },
  { name: 'Ashwin C H', srn: 'PES1UG24AM900' },
  { name: 'Sharvesh K', srn: 'PES1UG24AM260' },
]

export default function App() {
  const [route, setRoute] = useState<Route>(routeOf)
  useEffect(() => {
    const on = () => {
      setRoute(routeOf())
      if (!location.hash.includes('#s-')) window.scrollTo({ top: 0 })
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 bg-paper/95">
        <nav className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 sm:gap-6 py-3 sm:px-8" aria-label="Main">
          <a href="#/" className="mr-auto text-[22px] font-extrabold tracking-tight text-ink no-underline">
            GreenShift
          </a>
          <a href="#/" aria-current={route === 'story' ? 'page' : undefined} className="whitespace-nowrap text-[16px] text-ink no-underline hover:underline aria-[current=page]:font-bold sm:text-[17px]">
            How it works
          </a>
          <a
            href="#/tonight"
            aria-current={route === 'tonight' ? 'page' : undefined}
            className="whitespace-nowrap rounded-full bg-low px-4 py-2 text-[16px] font-bold sm:px-5 sm:text-[17px] text-paper no-underline transition-colors duration-200 hover:bg-low-2 active:scale-[0.97] motion-reduce:active:scale-100"
          >
            Plan tonight
          </a>
        </nav>
      </header>
      <main id="main">{route === 'tonight' ? <Tonight /> : <Story />}</main>
      <Footer />
    </>
  )
}

function Footer() {
  return (
    <footer className="mt-32 bg-ink text-paper">
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-16 sm:px-8">
        <div className="grid gap-10 text-[16px] leading-relaxed md:grid-cols-3">
          <div>
            <p className="font-bold">Built by</p>
            <ul>
              {TEAM.map((m) => (
                <li key={m.srn}>
                  {m.name} · {m.srn}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-paper/80">UE24AM343AB3 mini-project, Track G (Governance, Compliance and Sustainability).</p>
          </div>
          <div>
            <p className="font-bold">Data</p>
            <p>
              Carbon intensity data: Carbon Intensity API, NESO (CC BY 4.0). Cross-check: NESO historic generation mix (CC BY 4.0).
            </p>
            <p className="mt-3">Workload derived from TPC-DS; not comparable with published TPC-DS results.</p>
          </div>
          <div>
            <p className="font-bold">Method and code</p>
            <p>
              Comparison study: Wiesner et al., “Let’s Wait Awhile”, Middleware ’21.{' '}
              <a className="text-paper underline" href="https://arxiv.org/abs/2110.13234">
                arXiv:2110.13234
              </a>
              .
            </p>
            <p className="mt-3">
              Source:{' '}
              <a className="text-paper underline" href="https://github.com/VismayHS/GreenShift">
                github.com/VismayHS/GreenShift
              </a>
              . Number animation: React Bits CountUp (MIT + Commons Clause).
            </p>
          </div>
        </div>
        <p aria-hidden="true" className="mt-16 select-none text-[clamp(64px,17vw,260px)] font-extrabold leading-[0.8] tracking-[-0.05em] text-paper">
          GreenShift
        </p>
      </div>
    </footer>
  )
}

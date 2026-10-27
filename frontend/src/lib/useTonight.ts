import { useEffect, useMemo, useState } from 'react'
import { loadEnergy, loadForecast, type Energy, type Forecast } from './data'
import { baseline, bestWindow, tonight, windowSlots, type PlanJob } from './plan'

/** Default job length: 30 min, as in Wiesner et al. 2021 Scenario I (our SF5 timings are pending). */
export const DEFAULT_SLOTS = 1

export function useTonight() {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [energy, setEnergy] = useState<Energy | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    loadForecast(ac.signal).then(setForecast).catch((e) => setError(String(e)))
    loadEnergy().then(setEnergy).catch((e) => setError(String(e)))
    return () => ac.abort()
  }, [])

  return { forecast, energy, error }
}

/** Tonight's window (long enough for these jobs) and both plans for it. */
export function usePlans(forecast: Forecast | null, region: number | 'national', jobs: PlanJob[]) {
  return useMemo(() => {
    if (!forecast || !jobs.length) return null
    const win = tonight(Date.now(), jobs.reduce((s, j) => s + j.slots, 0))
    const series = region === 'national' ? forecast.national : forecast.regional[region] ?? []
    const ci = windowSlots(series, win.release, win.deadline)
    return { win, ci, base: baseline(jobs, ci, win.release), best: bestWindow(jobs, ci, win.release) }
  }, [forecast, region, jobs])
}

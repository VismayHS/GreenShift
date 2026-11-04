import { useEffect, useState } from 'react'
import { loadEda, loadEnergy, loadHistory, loadPythonPlan, loadRegions, loadResults } from './data'

type State<T> = { data: T | null; error: string | null }

/** Load one cached JSON file; the promise is shared, so pages never refetch. */
function useLoad<T>(load: () => Promise<T>): State<T> {
  const [s, set] = useState<State<T>>({ data: null, error: null })
  useEffect(() => {
    let live = true
    load().then((data) => live && set({ data, error: null })).catch((e) => live && set({ data: null, error: String(e) }))
    return () => { live = false }
  }, [load])
  return s
}

export const useResults = () => useLoad(loadResults)
export const useEnergy = () => useLoad(loadEnergy)
export const useEda = () => useLoad(loadEda)
export const useHistory = () => useLoad(loadHistory)
export const useRegions = () => useLoad(loadRegions)
export const usePythonPlan = () => useLoad(loadPythonPlan)

export const pct = (v: number, d = 1) => `${v.toFixed(d)}%`
export const signedPct = (v: number, d = 1) => `${v > 0 ? '−' : v < 0 ? '+' : ''}${Math.abs(v).toFixed(d)}%`
export const minutes = (m: number) => (m >= 60 ? `${(m / 60).toFixed(m % 60 ? 1 : 0)} h` : `${Math.round(m)} min`)
export const ukDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

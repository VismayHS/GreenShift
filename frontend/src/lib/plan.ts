// Tonight's plan: P0 baseline vs P2 best window (non-interrupting), capacity 1,
// on the 30-min grid. Mirrors the HANDOFF §8 design; the Python scheduler
// (step 8) will be the reference implementation for the backtest.

import type { Slot } from './data'

export const SLOT_MS = 30 * 60 * 1000
const TZ = 'Europe/London'

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fmtDay = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
export const clock = (t: number) => fmt.format(t)
export const day = (t: number) => fmtDay.format(t)

/** UTC ms of a UK-local wall-clock time on the UK-local date of `ref` plus `addDays`. */
export function ukTime(ref: number, hhmm: string, addDays = 0): number {
  const [h, m] = hhmm.split(':').map(Number)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ref)
  const [y, mo, d] = parts.split('-').map(Number)
  // Guess as UTC, then correct by the zone offset at that instant (GMT or BST).
  const want = Date.UTC(y, mo - 1, d + addDays, h, m)
  let t = want
  for (let i = 0; i < 2; i++) t = want - offset(t)
  return t
}

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
})
/** UK offset from UTC at instant t, in ms (0 in GMT, 3.6e6 in BST). */
function offset(t: number): number {
  const p = Object.fromEntries(partsFmt.formatToParts(t).map((x) => [x.type, x.value]))
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute))
  return wall - Math.floor(t / 60000) * 60000
}

/**
 * The window the scheduler plans: the current night from now if at least
 * `minSlots` half-hours remain before the deadline, otherwise the next night.
 */
export function tonight(now: number, minSlots = 1, release = '22:00', deadline = '07:00') {
  const rToday = ukTime(now, release)
  const dToday = ukTime(now, deadline)
  const next = { release: rToday, deadline: ukTime(now, deadline, 1), running: false }
  const fits = (w: { release: number; deadline: number }) => (w.deadline - w.release) / SLOT_MS >= minSlots
  if (now < dToday) {
    const cur = { release: Math.max(ukTime(now, release, -1), nextSlot(now)), deadline: dToday, running: true }
    return fits(cur) ? cur : next
  }
  if (now < rToday) return next
  const cur = { release: Math.max(rToday, nextSlot(now)), deadline: ukTime(now, deadline, 1), running: true }
  return fits(cur) ? cur : { release: ukTime(now, release, 1), deadline: ukTime(now, deadline, 2), running: false }
}

/** Start of the next half-hour slot at or after t. */
const nextSlot = (t: number) => Math.ceil(t / SLOT_MS) * SLOT_MS

export type PlanJob = { name: string; slots: number }
export type Placed = { name: string; start: number; end: number; meanCi: number | null }
export type Plan = { jobs: Placed[]; feasible: boolean }

function meanCi(ci: (number | null)[], i: number, n: number): number | null {
  let s = 0
  for (let k = i; k < i + n; k++) {
    const v = ci[k]
    if (v == null) return null
    s += v
  }
  return s / n
}

/** Slots of the window, with the forecast for each (null when the forecast is missing). */
export function windowSlots(forecast: Slot[], release: number, deadline: number): (number | null)[] {
  const byT = new Map(forecast.map((s) => [s.t, s.ci]))
  const out: (number | null)[] = []
  for (let t = release; t < deadline; t += SLOT_MS) out.push(byT.get(t) ?? null)
  return out
}

/** P0: cron at release, back to back in catalogue order. */
export function baseline(jobs: PlanJob[], ci: (number | null)[], release: number): Plan {
  let i = 0
  const placed = jobs.map((j) => {
    const p = { name: j.name, start: release + i * SLOT_MS, end: release + (i + j.slots) * SLOT_MS, meanCi: meanCi(ci, i, j.slots) }
    i += j.slots
    return p
  })
  return { jobs: placed, feasible: i <= ci.length }
}

/** Can these jobs still be packed into the free slots (first fit, longest first)? */
function fits(jobs: PlanJob[], free: boolean[]): boolean {
  const f = free.slice()
  for (const j of [...jobs].sort((a, b) => b.slots - a.slots)) {
    let ok = false
    for (let i = 0; i + j.slots <= f.length && !ok; i++) {
      if (f.slice(i, i + j.slots).every(Boolean)) {
        f.fill(false, i, i + j.slots)
        ok = true
      }
    }
    if (!ok) return false
  }
  return true
}

/**
 * P2 greedy: longest job first, each into the contiguous window with the lowest
 * mean forecast that keeps every remaining job feasible. Never misses the
 * deadline: if no clean placement keeps the rest feasible, it falls back to P0.
 */
export function bestWindow(jobs: PlanJob[], ci: (number | null)[], release: number): Plan {
  const free = ci.map(() => true)
  const order = jobs.map((j, k) => ({ ...j, k })).sort((a, b) => b.slots - a.slots || a.k - b.k)
  const placed: (Placed & { k: number })[] = []
  for (let n = 0; n < order.length; n++) {
    const j = order[n]
    const rest = order.slice(n + 1)
    let best: { i: number; m: number } | null = null
    for (let i = 0; i + j.slots <= ci.length; i++) {
      if (!free.slice(i, i + j.slots).every(Boolean)) continue
      const m = meanCi(ci, i, j.slots)
      if (m == null) continue
      const trial = free.slice()
      trial.fill(false, i, i + j.slots)
      if (!fits(rest, trial)) continue
      if (!best || m < best.m - 1e-9) best = { i, m }
    }
    if (!best) return baseline(jobs, ci, release)
    free.fill(false, best.i, best.i + j.slots)
    placed.push({ name: j.name, k: j.k, start: release + best.i * SLOT_MS, end: release + (best.i + j.slots) * SLOT_MS, meanCi: best.m })
  }
  const plan = { jobs: placed.sort((a, b) => a.k - b.k).map(({ k: _k, ...p }) => p), feasible: true }
  // Greedy can lose to cron on a tightly packed night; never return a worse plan.
  const base = baseline(jobs, ci, release)
  const b = total(base.jobs), g = total(plan.jobs)
  return b != null && g != null && b < g ? base : plan
}

/** Sum of mean intensity x duration over all jobs (proportional to grams for equal power). */
export function total(jobs: Placed[]): number | null {
  if (jobs.some((j) => j.meanCi == null)) return null
  return jobs.reduce((s, j) => s + j.meanCi! * (j.end - j.start), 0)
}

/** Plain-language reason for one job's move (the auditable decision log). */
export function reason(b: Placed, p: Placed): string {
  if (b.meanCi == null || p.meanCi == null) return 'Forecast missing for part of the night; kept at the cron time.'
  const delayMin = Math.round((p.start - b.start) / 60000)
  const pct = Math.round((100 * (b.meanCi - p.meanCi)) / b.meanCi)
  if (delayMin === 0) return 'Already in the cleanest slot it can have; runs at the cron time.'
  const when = `${delayMin > 0 ? 'Moved' : 'Moved earlier'} ${hm(Math.abs(delayMin))}${delayMin > 0 ? ' later' : ''}`
  return `${when}: forecast ${Math.round(p.meanCi)} g/kWh instead of ${Math.round(b.meanCi)} (${pct >= 0 ? '−' : '+'}${Math.abs(pct)}%).`
}

export const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`)

// Tonight's plan in the browser: a line-for-line port of the Python reference
// (src/carbonsched/scheduler/policies.py: baseline + schedule("P4"), and
// scheduler/demo.py: choose_window). The Tonight page checks its own output
// against python_plan.json, written by scripts/run_scheduler.py, whenever both
// use the same stored forecast.

import type { Slot } from './data'

export const SLOT_MS = 30 * 60 * 1000
const TZ = 'Europe/London'

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fmtDay = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const fmtHour = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' })
export const clock = (t: number) => fmt.format(t)
export const day = (t: number) => fmtDay.format(t)
export const hm = (min: number) => (Math.abs(min) >= 60 ? `${Math.floor(Math.abs(min) / 60)} h${Math.abs(min) % 60 ? ` ${Math.abs(min) % 60} min` : ''}` : `${Math.abs(min)} min`)

const partsFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
/** UK offset from UTC at instant t, in ms (0 in GMT, 3.6e6 in BST). */
function offset(t: number): number {
  const p = Object.fromEntries(partsFmt.formatToParts(t).map((x) => [x.type, x.value]))
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute))
  return wall - Math.floor(t / 60000) * 60000
}

/** UTC ms of UK-local wall time hh:00 on calendar date y-m-d (+addDays). */
function ukWall(y: number, m: number, d: number, hour: number): number {
  const want = Date.UTC(y, m - 1, d, hour, 0)
  let t = want
  for (let i = 0; i < 2; i++) t = want - offset(t)
  return t
}

/** models.night_window: 22:00 UK on `night` to 07:00 UK the next day, as UTC ms. */
export function nightWindow(y: number, m: number, d: number): [number, number] {
  return [ukWall(y, m, d, 22), ukWall(y, m, d + 1, 7)]
}

export type PlanJob = { name: string; slots: number; energy: number }
type Block = number[]
export type Placed = { name: string; slots: Block; start: number; end: number }

function* blocks(d: number, used: Int32Array, k: number): Generator<Block> {
  for (let i = 0; i + d <= used.length; i++) {
    let ok = true
    for (let s = i; s < i + d; s++) if (used[s] >= k) { ok = false; break }
    if (ok) yield Array.from({ length: d }, (_, j) => i + j)
  }
}
const first = (it: Generator<Block>) => { const r = it.next(); return r.done ? null : r.value }
const occupy = (used: Int32Array, b: Block) => { for (const s of b) used[s] += 1 }

/** policies.baseline: catalogue order, earliest block with spare capacity. */
export function baseline(jobs: PlanJob[], n: number, k: number): Map<string, Block> | null {
  const used = new Int32Array(n)
  const out = new Map<string, Block>()
  for (const j of jobs) {
    const b = first(blocks(j.slots, used, k))
    if (!b) return null
    out.set(j.name, b)
    occupy(used, b)
  }
  return out
}

/** policies._edf without splitting (P4 never splits). */
function edf(jobs: PlanJob[], used0: Int32Array, k: number): Map<string, Block> | null {
  const used = used0.slice()
  const out = new Map<string, Block>()
  const order = [...jobs].sort((a, b) => b.slots - a.slots || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const j of order) {
    const b = first(blocks(j.slots, used, k))
    if (!b) return null
    out.set(j.name, b)
    occupy(used, b)
  }
  return out
}

const mean = (ci: number[], b: Block) => b.reduce((s, i) => s + ci[i], 0) / b.length

/** policies.schedule("P4"): largest energy first, best contiguous window with an EDF witness. */
export function p4(jobs: PlanJob[], ci: (number | null)[], k: number): Map<string, Block> | null {
  const base = baseline(jobs, ci.length, k)
  if (!base) return null
  if (ci.some((v) => v == null || !Number.isFinite(v))) return base
  const c = ci as number[]
  const order = jobs.map((j, i) => ({ j, i })).sort((a, b) => b.j.energy - a.j.energy || a.i - b.i).map((x) => x.j)
  const used = new Int32Array(c.length)
  const chosen = new Map<string, Block>()
  let witness = new Map(base)
  order.forEach((job, pos) => {
    const remaining = order.slice(pos + 1)
    const cands = [...blocks(job.slots, used, k)].map((b) => ({ b, m: mean(c, b) }))
    cands.sort((x, y) => x.m - y.m || x.b[0] - y.b[0])
    let accepted: Block | null = null
    for (const { b } of cands) {
      const trial = used.slice()
      occupy(trial, b)
      const completion = edf(remaining, trial, k)
      if (completion) { accepted = b; witness = completion; break }
    }
    if (!accepted) { accepted = witness.get(job.name)!; witness.delete(job.name) }
    chosen.set(job.name, accepted)
    occupy(used, accepted)
  })
  const cost = (p: Map<string, Block>) => jobs.reduce((s, j) => s + j.energy * mean(c, p.get(j.name)!), 0)
  return cost(chosen) > cost(base) + 1e-12 ? base : chosen
}

/** demo.choose_window: this night's remaining window if the jobs fit, else the next one. */
export function chooseWindow(now: number, jobs: PlanJob[], k: number) {
  const [y, m, d] = fmtDate.format(now).split('-').map(Number)
  const back = Number(fmtHour.format(now)) < 7 ? -1 : 0
  for (let off = 0; off < 3; off++) {
    const [release, deadline] = nightWindow(y, m, d + back + off)
    const start = Math.max(release, Math.ceil(now / SLOT_MS) * SLOT_MS)
    if (start >= deadline) continue
    const n = Math.round((deadline - start) / SLOT_MS)
    if (jobs.some((j) => j.slots > n)) continue
    if (!baseline(jobs, n, k)) continue
    return { cronRelease: release, start, deadline, n, night: fmtDate.format(release) }
  }
  return null
}

export function windowSlots(forecast: Slot[], start: number, n: number): (number | null)[] {
  const byT = new Map(forecast.map((s) => [s.t, s.ci]))
  return Array.from({ length: n }, (_, i) => byT.get(start + i * SLOT_MS) ?? null)
}

export type JobRow = { name: string; base: Placed; best: Placed; baseCi: number | null; bestCi: number | null; savingPct: number | null }

/** Both plans for tonight, in catalogue order, with forecast means as in demo.plan_demo. */
export function planTonight(now: number, forecast: Slot[], jobs: PlanJob[], k: number) {
  const win = chooseWindow(now, jobs, k)
  if (!win) return null
  const ci = windowSlots(forecast, win.start, win.n)
  const base = baseline(jobs, win.n, k)!
  const best = p4(jobs, ci, k)!
  const at = (b: Block) => ({ start: win.start + b[0] * SLOT_MS, end: win.start + (b[b.length - 1] + 1) * SLOT_MS })
  const avg = (b: Block) => (b.every((i) => ci[i] != null) ? b.reduce((s, i) => s + (ci[i] as number), 0) / b.length : null)
  const rows: JobRow[] = jobs.map((j) => {
    const b = base.get(j.name)!, p = best.get(j.name)!
    const baseCi = avg(b), bestCi = avg(p)
    return {
      name: j.name, base: { name: j.name, slots: b, ...at(b) }, best: { name: j.name, slots: p, ...at(p) },
      baseCi, bestCi, savingPct: baseCi && bestCi != null ? ((baseCi - bestCi) / baseCi) * 100 : null,
    }
  })
  const complete = ci.every((v) => v != null)
  const total = (key: 'baseCi' | 'bestCi') => (complete ? rows.reduce((s, r, i) => s + jobs[i].energy * (r[key] as number), 0) : null)
  return { win, ci, rows, complete, baseTotal: total('baseCi'), bestTotal: total('bestCi') }
}

/** Plain-language reason for one job's move (the auditable decision log). */
export function reason(r: JobRow): string {
  if (r.baseCi == null || r.bestCi == null) return 'Forecast missing for part of the night, so the job keeps its cron slot.'
  const moved = Math.round((r.best.start - r.base.start) / 60000)
  if (moved === 0) return 'Its cron slot is already the best feasible window.'
  const dir = moved > 0 ? 'later' : 'earlier'
  if (r.bestCi > r.baseCi) return `Moved ${hm(moved)} ${dir} to free a cleaner window for another job; the batch total still falls.`
  return `Moved ${hm(moved)} ${dir}: forecast ${r.bestCi.toFixed(1)} instead of ${r.baseCi.toFixed(1)} gCO₂/kWh.`
}

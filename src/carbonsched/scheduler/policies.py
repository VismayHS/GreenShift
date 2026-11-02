"""Capacity-safe scheduling; every accepted move keeps an EDF completion witness."""
from __future__ import annotations

import numpy as np
from .models import Job, Plan, SLOT, validate


class InfeasibleSchedule(ValueError):
    pass


def bounds(job, origin, n):
    return max(0, int((job.release-origin)/SLOT)), min(n, int((job.deadline-origin)/SLOT))


def blocks(job, used, origin, k, baseline=False):
    lo,hi=bounds(job,origin,len(used))
    if baseline and job.baseline_start is not None:
        lo=max(lo,int((job.baseline_start-origin)/SLOT))
    for i in range(lo,hi-job.duration_slots+1):
        if np.all(used[i:i+job.duration_slots]<k):
            yield tuple(range(i,i+job.duration_slots))


def _edf(jobs, used, origin, k, allow_split=False):
    """Conservative constructive feasibility check, not a completeness claim.

    An actual feasible schedule is returned. Rejecting a choice when this
    heuristic fails cannot produce a deadline miss; the caller retains its
    previous feasible completion instead.
    """
    used=used.copy()
    result=[]
    for job in sorted(jobs,key=lambda j:(j.deadline,j.release,-j.duration_slots,j.name)):
        slots=next(blocks(job,used,origin,k),None)
        if slots is None and allow_split and job.interruptible:
            lo,hi=bounds(job,origin,len(used))
            free=[i for i in range(lo,hi) if used[i]<k]
            slots=tuple(free[:job.duration_slots]) if len(free)>=job.duration_slots else None
        if slots is None:
            return None
        result.append(Plan(job,slots,origin))
        used[list(slots)]+=1
    return result


def baseline(jobs: list[Job], forecast, origin, capacity_k=1) -> list[Plan]:
    if capacity_k < 1:
        raise ValueError("capacity must be positive")
    used=np.zeros(len(forecast),dtype=int)
    plans=[]
    for job in jobs:
        slots=next(blocks(job,used,origin,capacity_k,baseline=True),None)
        if slots is None:
            raise InfeasibleSchedule(f"P0 cannot fit {job.name} at capacity {capacity_k}")
        plans.append(Plan(job,slots,origin))
        used[list(slots)]+=1
    validate(plans,jobs,len(forecast),capacity_k)
    return plans


def schedule(policy: str, jobs: list[Job], forecast, origin, capacity_k=1) -> list[Plan]:
    """P2/P3 use catalogue order; P4 uses descending job energy.

    P2/P4 use contiguous blocks. P3 may split interruptible jobs. A complete
    feasible witness is kept after every choice, and total forecast emissions
    may never exceed cron. Only forecast is passed into this module.
    """
    if policy not in {"P0","P2","P3","P4"}:
        raise ValueError(f"unknown policy {policy}")
    ci=np.asarray(forecast,dtype=float)
    if ci.ndim!=1:
        raise ValueError("forecast must be a one-dimensional series")
    base=baseline(jobs,ci,origin,capacity_k)
    if policy=="P0" or not np.isfinite(ci).all():
        return base
    order=sorted(jobs,key=lambda j:-j.energy_kwh) if policy=="P4" else list(jobs)
    used=np.zeros(len(ci),dtype=int)
    chosen=[]
    witness={p.job.name:p for p in base}
    for pos,job in enumerate(order):
        remaining=order[pos+1:]
        candidates=list(blocks(job,used,origin,capacity_k))
        if policy=="P3" and job.interruptible:
            lo,hi=bounds(job,origin,len(ci))
            free=[i for i in range(lo,hi) if used[i]<capacity_k]
            best=tuple(sorted(sorted(free,key=lambda i:(ci[i],i))[:job.duration_slots]))
            if len(best)==job.duration_slots:
                candidates.append(best)
        candidates.sort(key=lambda slots:(float(ci[list(slots)].mean()),slots))
        accepted=None
        for slots in candidates:
            trial=used.copy()
            trial[list(slots)]+=1
            completion=_edf(remaining,trial,origin,capacity_k,allow_split=policy=="P3")
            if completion is not None:
                accepted=Plan(job,slots,origin)
                witness={p.job.name:p for p in completion}
                break
        if accepted is None:
            accepted=witness.pop(job.name)
        chosen.append(accepted)
        used[list(accepted.slots)]+=1
    by_name={p.job.name:p for p in chosen}
    chosen=[by_name[j.name] for j in jobs]
    validate(chosen,jobs,len(ci),capacity_k)
    # Same objective and energy weighting for all policies; deterministic ties.
    # Gaussian synthetic forecasts can be negative; actual accounting remains
    # nonnegative and is checked separately by Plan.emissions().
    def forecast_cost(plans):
        return sum(p.job.energy_kwh * float(ci[list(p.slots)].mean()) for p in plans)
    if forecast_cost(chosen)>forecast_cost(base)+1e-12:
        return base
    return chosen

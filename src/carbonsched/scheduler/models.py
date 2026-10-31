"""Validated jobs, placements and UK-local windows with UTC arithmetic."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
import math
from zoneinfo import ZoneInfo

import numpy as np

SLOT = timedelta(minutes=30)
UK = ZoneInfo("Europe/London")
UTC = timezone.utc


def utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise ValueError("timestamps must be timezone-aware")
    value = value.astimezone(UTC)
    if value.second or value.microsecond or value.minute % 30:
        raise ValueError("timestamps must align to the half-hour grid")
    return value


def night_window(night: date) -> tuple[datetime, datetime]:
    return (datetime.combine(night, time(22), UK).astimezone(UTC),
            datetime.combine(night + timedelta(days=1), time(7), UK).astimezone(UTC))


@dataclass(frozen=True)
class Job:
    name: str
    duration_slots: int
    energy_kwh: float
    interruptible: bool
    release: datetime
    deadline: datetime
    baseline_start: datetime | None = None

    def __post_init__(self):
        object.__setattr__(self, "release", utc(self.release))
        object.__setattr__(self, "deadline", utc(self.deadline))
        if self.baseline_start is not None:
            object.__setattr__(self, "baseline_start", utc(self.baseline_start))
        if not self.name or not isinstance(self.duration_slots, int) or self.duration_slots < 1:
            raise ValueError("job needs a name and positive integer duration")
        if not math.isfinite(self.energy_kwh) or self.energy_kwh < 0:
            raise ValueError("energy must be finite and nonnegative")
        if self.deadline - self.release < self.duration_slots * SLOT:
            raise ValueError("job cannot fit its release/deadline window")


@dataclass(frozen=True)
class Plan:
    job: Job
    slots: tuple[int, ...]
    grid_start: datetime

    def __post_init__(self):
        object.__setattr__(self, "slots", tuple(sorted(self.slots)))
        object.__setattr__(self, "grid_start", utc(self.grid_start))
        if len(self.slots) != self.job.duration_slots or len(set(self.slots)) != len(self.slots):
            raise ValueError("each job must occupy exactly duration_slots distinct slots")
        if any(not isinstance(s, (int, np.integer)) or s < 0 for s in self.slots):
            raise ValueError("slot indices must be nonnegative integers")
        if self.start < self.job.release or self.end > self.job.deadline:
            raise ValueError("placement outside job window")
        if self.interrupted and not self.job.interruptible:
            raise ValueError("non-interruptible job was split")

    @property
    def start(self) -> datetime:
        return self.grid_start + int(self.slots[0]) * SLOT

    @property
    def end(self) -> datetime:
        return self.grid_start + (int(self.slots[-1]) + 1) * SLOT

    @property
    def interrupted(self) -> bool:
        return self.slots[-1] - self.slots[0] + 1 != len(self.slots)

    def emissions(self, actual) -> float:
        values = np.asarray(actual, dtype=float)[list(self.slots)]
        if not np.isfinite(values).all() or (values < 0).any():
            raise ValueError("accounting requires finite nonnegative actual intensity")
        return self.job.energy_kwh * float(values.mean())


def validate(plans: list[Plan], jobs: list[Job], n_slots: int, capacity_k: int) -> None:
    if capacity_k < 1:
        raise ValueError("capacity must be positive")
    if len({j.name for j in jobs}) != len(jobs):
        raise ValueError("job names must be unique")
    if len(plans) != len(jobs) or {p.job for p in plans} != set(jobs):
        raise ValueError("plan must contain each input job exactly once")
    used = np.zeros(n_slots, dtype=int)
    if len({p.grid_start for p in plans}) > 1:
        raise ValueError("plans must share a UTC grid origin")
    for plan in plans:
        if plan.slots[-1] >= n_slots:
            raise ValueError("placement outside grid")
        used[list(plan.slots)] += 1
    if (used > capacity_k).any():
        raise ValueError("capacity exceeded")

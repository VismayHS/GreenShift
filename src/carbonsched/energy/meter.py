"""EnergyMeter: measure the energy of a block of code (e.g. one Spark job).

    with EnergyMeter("q72") as m:
        spark.sql(q).write.format("noop").mode("overwrite").save()
    m.result  # MeterResult with RAPL / battery / model energy

A background thread samples every `interval_s`: RAPL cumulative energy,
battery discharge, and psutil CPU utilisation. Energy is reported three ways:

- rapl_pkg_j   measured CPU-package energy (RAPL counter delta)
- battery_j    measured whole-system energy (integral of discharge rate),
               only when unplugged
- model_j      utilisation x linear power model (portable estimate)

`idle_w` (from `measure_idle`) lets callers subtract the static baseline and
report the energy *attributable* to the job: E_attr = E - P_idle * duration.
"""

from __future__ import annotations

import threading
import time
from dataclasses import asdict, dataclass, field

import numpy as np
import psutil

from .model import LinearPowerModel
from .sensors import try_battery, try_rapl


@dataclass
class MeterResult:
    label: str
    start_unix: float
    duration_s: float
    rapl_pkg_j: float | None
    rapl_cores_j: float | None
    battery_j: float | None
    model_j: float
    mean_cpu_util: float
    idle_w: float | None = None
    samples: list[dict] = field(default_factory=list, repr=False)

    @property
    def best_j(self) -> float:
        """Preferred measurement: RAPL if available, else model estimate."""
        return self.rapl_pkg_j if self.rapl_pkg_j is not None else self.model_j

    @property
    def attributable_j(self) -> float:
        if self.idle_w is None:
            return self.best_j
        return max(self.best_j - self.idle_w * self.duration_s, 0.0)

    @property
    def kwh(self) -> float:
        return self.best_j / 3.6e6

    def summary(self) -> dict:
        d = asdict(self)
        d.pop("samples")
        d.update(best_j=self.best_j, attributable_j=self.attributable_j, kwh=self.kwh)
        return d


class EnergyMeter:
    def __init__(self, label: str = "run", interval_s: float = 0.5,
                 model: LinearPowerModel | None = None, idle_w: float | None = None):
        self.label = label
        self.interval_s = interval_s
        self.model = model or LinearPowerModel()
        self.idle_w = idle_w
        self.result: MeterResult | None = None
        self._samples: list[dict] = []
        self._stop = threading.Event()

    def _sample_loop(self) -> None:
        battery = try_battery()
        psutil.cpu_percent(None)
        while not self._stop.wait(self.interval_s):
            s = {"t": time.time(), "util": psutil.cpu_percent(None) / 100.0}
            if self._rapl is not None:
                s.update({f"rapl_{k}_j": v for k, v in self._rapl.read_joules().items()})
            if battery is not None:
                s.update(battery.read())
            self._samples.append(s)

    def __enter__(self) -> "EnergyMeter":
        self._rapl = try_rapl()
        self._e0 = self._rapl.read_joules() if self._rapl else None
        self._t0 = time.time()
        self._thread = threading.Thread(target=self._sample_loop, daemon=True)
        self._thread.start()
        return self

    def __exit__(self, *exc) -> None:
        t1 = time.time()
        self._stop.set()
        self._thread.join()  # join first: the PDH query handle is not shared across threads
        e1 = self._rapl.read_joules() if self._rapl else None
        self.result = self._finish(t1, e1)

    def _finish(self, t1: float, e1: dict | None) -> MeterResult:
        duration = t1 - self._t0
        s = self._samples
        ts = np.array([x["t"] for x in s]) if s else np.array([self._t0, t1])
        util = np.array([x["util"] for x in s]) if s else np.zeros(2)

        battery_j = None
        dis = [x.get("discharge_w") for x in s]
        if s and all(v is not None for v in dis):
            battery_j = float(np.trapezoid(np.array(dis), ts))

        return MeterResult(
            label=self.label,
            start_unix=self._t0,
            duration_s=duration,
            rapl_pkg_j=(e1["PKG"] - self._e0["PKG"]) if e1 else None,
            rapl_cores_j=(e1["PP0"] - self._e0["PP0"]) if e1 else None,
            battery_j=battery_j,
            model_j=self.model.energy_j(ts, util) if len(ts) > 1 else 0.0,
            mean_cpu_util=float(util.mean()) if len(util) else 0.0,
            idle_w=self.idle_w,
            samples=s,
        )


def measure_idle(seconds: float = 30.0) -> float:
    """Average RAPL package power (W) with the machine idle; model fallback otherwise."""
    with EnergyMeter("idle", interval_s=1.0) as m:
        time.sleep(seconds)
    r = m.result
    return r.best_j / r.duration_s

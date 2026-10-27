"""Portable utilisation-based power model (no hardware counters needed).

Same family as CodeCarbon's fallback and the Cloud Carbon Footprint method:

    P_cpu(u) = P_idle + (P_max - P_idle) * u        u = CPU utilisation in [0, 1]
    P_mem    = W_PER_GB * memory_gb
    E        = sum_t (P_cpu(u_t) + P_mem) * dt * PUE

The defaults are for this machine's i5-12450H (Intel spec: 45 W base power,
95 W max turbo, per Intel ARK; verify on ark.intel.com).
`calibrate()` fits P_idle/P_max to RAPL readings so the model can be used on
hosts that lack RAPL (cloud VMs, YARN/K8s nodes).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# CodeCarbon v2 used 3 W per 8 GB of RAM (= 0.375 W/GB).
W_PER_GB_RAM = 3.0 / 8.0


@dataclass
class LinearPowerModel:
    p_idle_w: float = 4.0
    p_max_w: float = 45.0
    memory_gb: float = 6.0
    pue: float = 1.0  # 1.0 for a laptop; ~1.56 for an average data centre (Uptime Institute 2024)

    def power_w(self, util: np.ndarray | float) -> np.ndarray | float:
        cpu = self.p_idle_w + (self.p_max_w - self.p_idle_w) * np.clip(util, 0.0, 1.0)
        return (cpu + W_PER_GB_RAM * self.memory_gb) * self.pue

    def energy_j(self, t_s: np.ndarray, util: np.ndarray) -> float:
        p = self.power_w(np.asarray(util))
        return float(np.trapezoid(p, np.asarray(t_s)))


def calibrate(util: np.ndarray, rapl_pkg_w: np.ndarray) -> tuple[float, float, float]:
    """Least-squares fit of P = a + b*u to RAPL package power. Returns (p_idle, p_max, r2)."""
    util, y = np.asarray(util, float), np.asarray(rapl_pkg_w, float)
    A = np.vstack([np.ones_like(util), util]).T
    (a, b), *_ = np.linalg.lstsq(A, y, rcond=None)
    pred = A @ np.array([a, b])
    ss_res = float(np.sum((y - pred) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2)) or 1.0
    return float(a), float(a + b), 1.0 - ss_res / ss_tot

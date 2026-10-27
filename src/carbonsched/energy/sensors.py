"""Low-level power/energy sensors available on a Windows 11 laptop.

1. Intel RAPL. On Windows via the Energy Meter Interface (EMI), exposed as the
   "Energy Meter" performance-counter set: `Energy` is cumulative in
   picowatt-hours (1 pWh = 3.6e-9 J), `Power` in milliwatts. On Linux via
   powercap sysfs (microjoules). Domains: PKG (whole CPU package), PP0 (cores),
   PP1 (iGPU/uncore), DRAM (often 0 on mobile parts).
2. Battery discharge rate (mW) from WMI root\\wmi:BatteryStatus. Only valid while
   running on battery; it is whole-system power (screen, SSD, Wi-Fi, ...).
3. psutil CPU utilisation, used by the portable TDP model in model.py.

Each sensor degrades to None when unavailable so the meter still runs on
Linux/macOS/VMs (where only the model estimate is produced).
"""

from __future__ import annotations

import sys

PWH_TO_J = 3.6e-9
RAPL_DOMAINS = ("PKG", "PP0", "PP1", "DRAM")


class RaplWindows:
    """Cumulative RAPL energy counters read through PDH."""

    def __init__(self) -> None:
        import win32pdh

        self._pdh = win32pdh
        self._query = win32pdh.OpenQuery()
        self._counters = {
            d: win32pdh.AddEnglishCounter(self._query, rf"\Energy Meter(RAPL_Package0_{d})\Energy")
            for d in RAPL_DOMAINS
        }

    def read_joules(self) -> dict[str, float]:
        self._pdh.CollectQueryData(self._query)
        return {
            d: self._pdh.GetFormattedCounterValue(c, self._pdh.PDH_FMT_LARGE)[1] * PWH_TO_J
            for d, c in self._counters.items()
        }

    def close(self) -> None:
        self._pdh.CloseQuery(self._query)


class BatteryWindows:
    """Whole-system power draw from the battery's discharge rate."""

    def __init__(self) -> None:
        import pythoncom
        import win32com.client

        pythoncom.CoInitialize()  # needed when called from a sampler thread
        self._wmi = win32com.client.GetObject(r"winmgmts:root\wmi")

    def read(self) -> dict[str, float | bool | None]:
        for b in self._wmi.ExecQuery("select PowerOnline, DischargeRate, RemainingCapacity from BatteryStatus"):
            on_ac = bool(b.PowerOnline)
            return {
                "on_ac": on_ac,
                "discharge_w": None if on_ac else b.DischargeRate / 1000.0,
                "remaining_wh": b.RemainingCapacity / 1000.0,
            }
        return {"on_ac": None, "discharge_w": None, "remaining_wh": None}


class RaplLinux:
    """RAPL through the Linux powercap interface (/sys/class/powercap/intel-rapl:*).

    energy_uj is cumulative microjoules and wraps at max_energy_range_uj, so we
    keep a running offset per zone. Packages (sockets) are summed. Reading needs
    root on kernels patched for CVE-2020-8694: `sudo chmod a+r .../energy_uj`.
    Zone names map to the Windows domains: package-N -> PKG, core -> PP0,
    uncore -> PP1, dram -> DRAM. Works for AMD too on kernel >= 5.8.
    """

    ROOT = "/sys/class/powercap"
    NAME_TO_DOMAIN = {"core": "PP0", "uncore": "PP1", "dram": "DRAM"}

    def __init__(self) -> None:
        import glob
        import os

        self._zones: list[tuple[str, str, float]] = []  # (domain, energy file, wrap J)
        for z in sorted(glob.glob(f"{self.ROOT}/intel-rapl:*")):
            if not os.path.exists(f"{z}/energy_uj"):
                continue
            name = open(f"{z}/name").read().strip()
            domain = "PKG" if name.startswith("package") else self.NAME_TO_DOMAIN.get(name)
            if domain is None:
                continue
            wrap = int(open(f"{z}/max_energy_range_uj").read()) / 1e6
            self._zones.append((domain, f"{z}/energy_uj", wrap))
        if not self._zones:
            raise RuntimeError("no readable RAPL zones")
        self._last: dict[str, float] = {}
        self._offset: dict[str, float] = {}

    def read_joules(self) -> dict[str, float]:
        out = dict.fromkeys(RAPL_DOMAINS, 0.0)
        for domain, path, wrap in self._zones:
            raw = int(open(path).read()) / 1e6
            if path in self._last and raw < self._last[path]:
                self._offset[path] = self._offset.get(path, 0.0) + wrap
            self._last[path] = raw
            out[domain] += raw + self._offset.get(path, 0.0)
        return out

    def close(self) -> None:
        pass


def try_rapl() -> RaplWindows | RaplLinux | None:
    try:
        r = RaplWindows() if sys.platform == "win32" else RaplLinux() if sys.platform.startswith("linux") else None
        return r if r is not None and r.read_joules()["PKG"] > 0 else None
    except Exception:
        return None


def try_battery() -> BatteryWindows | None:
    if sys.platform != "win32":
        return None
    try:
        b = BatteryWindows()
        return b if b.read()["on_ac"] is not None else None
    except Exception:
        return None

"""Record the host and fail closed when a campaign cannot measure real RAPL."""

from __future__ import annotations

import json
import platform
import shutil
import subprocess
from importlib.metadata import version
from datetime import datetime, timezone

import psutil

from .sensors import try_rapl


def _powershell(command: str):
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", command],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def machine_info(room_conditions: str = "unknown; not supplied") -> dict:
    """Capture facts, keeping unobserved physical conditions explicitly unknown."""
    info = {
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "os": platform.platform(), "cpu": platform.processor(),
        "ram_bytes": psutil.virtual_memory().total,
        "available_ram_bytes": psutil.virtual_memory().available,
        "logical_cpus": psutil.cpu_count(), "python": platform.python_version(),
        "room_conditions": room_conditions,
        "background_apps": "not automatically closed; operator must confirm",
    }
    battery = psutil.sensors_battery()
    info["ac_power"] = battery.power_plugged if battery else None
    if platform.system() == "Windows":
        info["cpu"] = _powershell("(Get-CimInstance Win32_Processor).Name | ConvertTo-Json")
        info["power_scheme"] = subprocess.check_output(
            ["powercfg", "/getactivescheme"], text=True).strip()
        # The Windows power-mode overlay is distinct from the power scheme.
        import ctypes
        import uuid
        raw = (ctypes.c_ubyte * 16)()
        status = ctypes.windll.powrprof.PowerGetEffectiveOverlayScheme(ctypes.byref(raw))
        info["power_mode_guid"] = str(uuid.UUID(bytes_le=bytes(raw))) if status == 0 else None
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                            r"SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes") as key:
            info["selected_ac_power_mode_guid"] = winreg.QueryValueEx(key, "ActiveOverlayAcPowerScheme")[0]
        info["power_mode_source"] = "selected AC overlay plus OEM effective overlay"
    else:
        info["power_scheme"] = "unknown; record manually"
    info["java"] = shutil.which("java")
    from carbonsched.env import _find_jdk
    jdk = _find_jdk()
    if jdk:
        info["spark_jdk"] = str(jdk)
    info["versions"] = {package: version(package) for package in
                        ("pyspark", "duckdb", "pandas", "numpy", "psutil", "pyarrow")}
    sensor = try_rapl()
    info["sensor"] = type(sensor).__name__ if sensor else None
    if sensor:
        try:
            info["rapl_initial_j"] = sensor.read_joules()
        finally:
            sensor.close()
    info["measurement_ready"] = bool(sensor and info["ac_power"] is not False)
    return info


def require_rapl(info: dict) -> None:
    if not info.get("sensor"):
        raise RuntimeError("RAPL unavailable: measurement stopped. Model energy is an estimate; notify the report owner.")
    if info.get("ac_power") is False:
        raise RuntimeError("Measurement requires AC power.")

"""Client for the GB Carbon Intensity API (NESO, CC BY 4.0, no key needed).

Docs: https://carbon-intensity.github.io/api-definitions/
- All times UTC, half-hourly settlement periods.
- National /intensity/{from}/{to}: max 14 days per request; has forecast + actual.
- Regional /regional/intensity/{from}/{to}/regionid/{id}: forecast + generation mix.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests

BASE_URL = "https://api.carbonintensity.org.uk"
MAX_SPAN = timedelta(days=14)
HEADERS = {"Accept": "application/json", "User-Agent": "carbonsched-student-project/0.1"}

REGIONS = {
    1: "North Scotland", 2: "South Scotland", 3: "North West England",
    4: "North East England", 5: "Yorkshire", 6: "North Wales", 7: "South Wales",
    8: "West Midlands", 9: "East Midlands", 10: "East England",
    11: "South West England", 12: "South England", 13: "London",
    14: "South East England", 15: "England", 16: "Scotland", 17: "Wales",
}


def _fmt(ts: datetime) -> str:
    return ts.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")


def _get(path: str, retries: int = 4) -> dict:
    for attempt in range(retries):
        try:
            r = requests.get(BASE_URL + path, headers=HEADERS, timeout=30)
            r.raise_for_status()
            return r.json()
        except requests.RequestException:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def _chunks(start: datetime, end: datetime):
    cur = start
    while cur < end:
        nxt = min(cur + MAX_SPAN, end)
        yield cur, nxt
        cur = nxt


def national(start: datetime, end: datetime, pause: float = 0.2) -> pd.DataFrame:
    """Half-hourly national intensity with forecast, actual and index."""
    rows = []
    for a, b in _chunks(start, end):
        for rec in _get(f"/intensity/{_fmt(a)}/{_fmt(b)}")["data"]:
            rows.append({
                "from": rec["from"], "to": rec["to"],
                "forecast": rec["intensity"].get("forecast"),
                "actual": rec["intensity"].get("actual"),
                "index": rec["intensity"].get("index"),
            })
        time.sleep(pause)
    return _tidy(pd.DataFrame(rows))


def regional(region_id: int, start: datetime, end: datetime, pause: float = 0.2) -> pd.DataFrame:
    """Half-hourly regional forecast intensity and generation mix (% by fuel)."""
    rows = []
    for a, b in _chunks(start, end):
        payload = _get(f"/regional/intensity/{_fmt(a)}/{_fmt(b)}/regionid/{region_id}")["data"]
        for rec in payload["data"]:
            row = {
                "from": rec["from"], "to": rec["to"],
                "forecast": rec["intensity"].get("forecast"),
                "index": rec["intensity"].get("index"),
            }
            for g in rec.get("generationmix", []):
                row[f"mix_{g['fuel']}"] = g["perc"]
            rows.append(row)
        time.sleep(pause)
    df = _tidy(pd.DataFrame(rows))
    df.insert(0, "region_id", region_id)
    df.insert(1, "region", REGIONS.get(region_id, str(region_id)))
    return df


def forecast_48h(region_id: int | None = None, start: datetime | None = None) -> pd.DataFrame:
    """Live 48-hour forecast; what the online scheduler sees at decision time."""
    start = start or datetime.now(timezone.utc)
    if region_id is None:
        data = _get(f"/intensity/{_fmt(start)}/fw48h")["data"]
        rows = [{"from": d["from"], "to": d["to"], "forecast": d["intensity"]["forecast"],
                 "index": d["intensity"]["index"]} for d in data]
    else:
        data = _get(f"/regional/intensity/{_fmt(start)}/fw48h/regionid/{region_id}")["data"]["data"]
        rows = [{"from": d["from"], "to": d["to"], "forecast": d["intensity"]["forecast"],
                 "index": d["intensity"]["index"]} for d in data]
    return _tidy(pd.DataFrame(rows))


def _tidy(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    df["from"] = pd.to_datetime(df["from"], utc=True)
    df["to"] = pd.to_datetime(df["to"], utc=True)
    # Chunk boundaries overlap by one period; keep the last copy.
    return df.drop_duplicates("from", keep="last").sort_values("from").reset_index(drop=True)

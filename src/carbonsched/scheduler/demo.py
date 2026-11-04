"""Forecast acquisition and an auditable plan that never starts Spark implicitly."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
from pathlib import Path

import numpy as np
import pandas as pd
import requests

from carbonsched.carbon import uk_api
from .models import SLOT, UK, night_window
from .policies import schedule, InfeasibleSchedule
from .sizing import make_jobs


def fetch_forecast(stored: Path, offline=False):
    if not offline:
        try:
            live=uk_api.forecast_48h()
            if live.empty:
                raise ValueError("empty live forecast")
            return live, {"source":"live", "fetched_at_utc":datetime.now(timezone.utc).isoformat()}
        except (requests.RequestException, KeyError, ValueError) as error:
            failure=f"{type(error).__name__}: {error}"
    else:
        failure="offline requested"
    payload=json.loads(stored.read_text(encoding="utf-8"))
    frame=pd.DataFrame(payload["national"])
    frame["from"]=pd.to_datetime(frame["from"],utc=True)
    return frame, {"source":"stored_fallback","fetched_at_utc":payload["fetched_at_utc"],
                   "fallback_reason":failure}


def choose_window(now: datetime, sizes: list[dict], capacity_k: int):
    now=now.astimezone(timezone.utc)
    local=now.astimezone(UK)
    night=local.date()-timedelta(days=1) if local.hour<7 else local.date()
    for offset in range(3):
        release,deadline=night_window(night+timedelta(days=offset))
        start=max(release,pd.Timestamp(now).ceil("30min").to_pydatetime())
        if start>=deadline:
            continue
        try:
            jobs=make_jobs(sizes,start,deadline)
            schedule("P0",jobs,[100]*int((deadline-start)/SLOT),start,capacity_k)
            return night+timedelta(days=offset),start,deadline,jobs
        except (InfeasibleSchedule,ValueError):
            continue
    raise InfeasibleSchedule("catalogue does not fit any of the next three nightly windows")


def plan_demo(frame, provenance, sizes, sizing_meta, now, capacity_k=1):
    night,origin,deadline,jobs=choose_window(now,sizes,capacity_k)
    index=pd.date_range(origin,deadline,freq="30min",inclusive="left")
    series=frame.drop_duplicates("from",keep="last").set_index("from")["forecast"]
    ci=series.reindex(index).to_numpy(dtype=float)
    base=schedule("P0",jobs,ci,origin,capacity_k)
    best=schedule("P4",jobs,ci,origin,capacity_k)
    known=bool(np.isfinite(ci).all())
    rows=[]
    for b,p in zip(base,best):
        f=float(ci[list(p.slots)].mean()) if np.isfinite(ci[list(p.slots)]).all() else None
        before=float(ci[list(b.slots)].mean()) if np.isfinite(ci[list(b.slots)]).all() else None
        saving=(before-f)/before*100 if before and f is not None else None
        rows.append({"job":p.job.name,"start_utc":p.start.isoformat(),"end_utc":p.end.isoformat(),
                     "occupied_slots":list(p.slots),"baseline_slots":list(b.slots),
                     "baseline_start_utc":b.start.isoformat(),"baseline_end_utc":b.end.isoformat(),
                     "forecast_ci":f,"baseline_ci":before,"expected_saving_pct":saving,
                     "energy_kwh":p.job.energy_kwh,
                     "reason":("Missing forecast: retained cron." if not known else
                               "Lowest tested feasible window with an EDF completion check; retained cron if total forecast emissions would increase."),
                     "deadline_met":p.end<=deadline})
    # CI at 22:00 is a contextual point; comparisons use the entire P0 execution.
    cron_release,_=night_window(night)
    value=series.get(pd.Timestamp(cron_release),np.nan)
    return {"night":str(night),"release_utc":origin.isoformat(),"deadline_utc":deadline.isoformat(),
            "capacity_k":capacity_k,"forecast":provenance,"sizing":sizing_meta,
            "ci_at_22_local":float(value) if pd.notna(value) else None,
            "forecast_complete":known,"jobs":rows,
            "execution":"planning only; no dispatch or waiting",
            "comparison":"forecast-based expectation, not measured avoided emissions"}


def score_measured_interval(start: datetime, end: datetime, energy_kwh: float, data: pd.DataFrame):
    """Weight actual CI by overlap; absent actual returns pending, never forecast."""
    start,end=pd.Timestamp(start),pd.Timestamp(end)
    series=data.drop_duplicates("from",keep="last").set_index("from")["actual"]
    total=(end-start).total_seconds()
    if total<=0:
        raise ValueError("measurement interval must be positive")
    weighted=0.0
    for slot in pd.date_range(start.floor("30min"),end.ceil("30min"),freq="30min",inclusive="left"):
        seconds=(min(end,slot+pd.Timedelta(minutes=30))-max(start,slot)).total_seconds()
        value=series.get(slot,np.nan)
        if not np.isfinite(value):
            return {"status":"pending_actual","emissions_g":None}
        weighted+=seconds*float(value)
    return {"status":"actual","emissions_g":energy_kwh*weighted/total}

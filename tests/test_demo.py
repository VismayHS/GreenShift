from datetime import datetime, timezone
import numpy as np
import pandas as pd
import requests
from carbonsched.scheduler.demo import fetch_forecast, plan_demo, score_measured_interval

def test_offline_acquisition_is_labelled(tmp_path,monkeypatch):
    import json
    from carbonsched.carbon import uk_api
    path=tmp_path/"fallback.json"
    path.write_text(json.dumps({"fetched_at_utc":"2024-01-01T12:00Z","national":[{"from":"2024-01-01T22:00Z","forecast":80}]}))
    def unavailable(*a,**k): raise requests.ConnectionError("offline")
    monkeypatch.setattr(uk_api,"forecast_48h",unavailable)
    frame,meta=fetch_forecast(path)
    assert meta["source"]=="stored_fallback" and len(frame)==1

def test_demo_missing_forecast_keeps_safe_cron():
    frame=pd.DataFrame({"from":pd.date_range("2024-01-01",periods=48,freq="30min",tz="UTC"),"forecast":100})
    sizes=[{"name":"a","duration_slots":2,"energy_kwh":1,"interruptible":False}]
    plan=plan_demo(frame,{"source":"stored_fallback"},sizes,{},datetime(2024,1,2,12,tzinfo=timezone.utc))
    assert not plan["forecast_complete"]
    assert plan["jobs"][0]["deadline_met"]
    assert plan["jobs"][0]["forecast_ci"] is None

def test_actual_scoring_uses_overlap_and_waits_for_actual():
    times=pd.date_range("2024-01-01",periods=2,freq="30min",tz="UTC")
    frame=pd.DataFrame({"from":times,"actual":[100,200]})
    result=score_measured_interval(times[0]+pd.Timedelta(minutes=15),times[1]+pd.Timedelta(minutes=5),1,frame)
    assert result=={"status":"actual","emissions_g":125}
    frame.loc[1,"actual"]=np.nan
    assert score_measured_interval(times[0],times[1]+pd.Timedelta(minutes=1),1,frame)["status"]=="pending_actual"

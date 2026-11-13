from datetime import date
import numpy as np
import pandas as pd
from carbonsched.scheduler.simulator import COLUMNS, run_backtest, write_outputs

def fixture_data():
    idx=pd.date_range("2024-01-01","2024-01-05",inclusive="left",freq="30min",tz="UTC")
    ci=100+40*np.cos(np.arange(len(idx))*np.pi/24)
    return pd.DataFrame({"actual":ci,"forecast":ci+5},index=idx)

def test_contract_and_actual_accounting(tmp_path):
    data=fixture_data()
    sizes=[{"name":"a","duration_slots":2,"energy_kwh":0.1,"interruptible":True}]
    cfg={"start":"2024-01-02","end":"2024-01-04","policies":["P0","P2","P3","P4"],
         "forecast_modes":["api","oracle","noisy"],"seeds":[0,1],"capacity_k":[1,2]}
    frame,meta,audit=run_backtest(data,sizes,cfg,{"scale":1,"pue":1})
    assert list(frame.columns)==COLUMNS and frame.deadline_met.all()
    assert len(frame)==2*4*4*2
    for row,slots in zip(frame.to_dict("records"),audit.to_dict("records")):
        times=[slots["grid_start_utc"]+pd.Timedelta(minutes=30*int(i)) for i in slots["slots"]]
        assert np.isclose(row["emissions_g"],0.1*data.loc[times,"actual"].mean())
    write_outputs(frame,meta,audit,tmp_path)
    assert list(pd.read_parquet(tmp_path/"backtest.parquet").columns)==COLUMNS

def test_actual_gap_skips_entire_night():
    data=fixture_data()
    data.loc["2024-01-02T23:00Z","actual"]=np.nan
    cfg={"start":"2024-01-02","end":"2024-01-03","policies":["P0"],"forecast_modes":["api"],"seeds":[0],"capacity_k":[1]}
    sizes=[{"name":"a","duration_slots":1,"energy_kwh":1,"interruptible":False}]
    frame,meta,_=run_backtest(data,sizes,cfg,{"pue":1})
    assert frame.empty
    assert meta["nights_skipped"][0]["reason"]=="actual_gap"

def test_backtest_runs_outside_a_git_checkout(monkeypatch):
    import subprocess
    from carbonsched.scheduler import simulator
    def no_git(*args, **kwargs):
        raise FileNotFoundError("git")
    monkeypatch.setattr(simulator.subprocess, "check_output", no_git)
    assert simulator._git_commit() is None
    def not_a_repo(*args, **kwargs):
        raise subprocess.CalledProcessError(128, args[0])
    monkeypatch.setattr(simulator.subprocess, "check_output", not_a_repo)
    sizes=[{"name":"a","duration_slots":1,"energy_kwh":0.1,"interruptible":False}]
    cfg={"start":"2024-01-02","end":"2024-01-03","policies":["P0","P2"],
         "forecast_modes":["api"],"seeds":[0],"capacity_k":[1]}
    _,meta,_=run_backtest(fixture_data(),sizes,cfg,{"scale":1,"pue":1})
    assert meta["git_commit"] is None

from datetime import date
import numpy as np
import pandas as pd
from carbonsched.scheduler.replication import all_scenarios
from carbonsched.scheduler.simulator import run_backtest
from carbonsched.scheduler.models import SLOT

def test_paper_window_bounds_and_baseline():
    cfg={"replication_windows_h":[0.5,1,2,4,8]}
    cases=list(all_scenarios(date(2024,1,2),[],cfg))[1:]
    for _,w,jobs,r,d in cases:
        assert (d-r)/SLOT==4*w+1
        assert (jobs[0].baseline_start-r).total_seconds()/3600==w

def test_oracle_is_upper_bound_for_single_job():
    idx=pd.date_range("2024-01-01","2024-01-06",freq="30min",inclusive="left",tz="UTC")
    rng=np.random.default_rng(42)
    data=pd.DataFrame({"actual":rng.uniform(20,200,len(idx)),
                       "forecast":rng.uniform(20,200,len(idx))},index=idx)
    cfg={"start":"2024-01-02","end":"2024-01-05","replication_windows_h":[0.5,1,2,4,8],
         "policies":["P0","P2"],"forecast_modes":["api","oracle","noisy"],"seeds":[0,1],"capacity_k":[1]}
    sizes=[{"name":"j","duration_slots":1,"energy_kwh":1,"interruptible":False}]
    frame,_,_=run_backtest(data,sizes,cfg,{"pue":1},all_scenarios)
    rep=frame[(frame.scenario=="wiesner_s1")&(frame.policy=="P2")]
    pivot=rep[rep.forecast_mode!="noisy"].pivot(index=["night","window_h"],columns="forecast_mode",values="emissions_g")
    assert (pivot.oracle<=pivot.api+1e-10).all()
    assert set(rep.window_h)=={0.5,1,2,4,8}

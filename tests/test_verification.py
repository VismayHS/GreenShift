import numpy as np
import pandas as pd
import pytest
from carbonsched.scheduler.simulator import run_backtest, write_outputs
from carbonsched.scheduler.verification import verify_outputs

def test_independent_verifier_detects_corrupted_energy(tmp_path):
    idx=pd.date_range("2024-01-01","2024-01-04",freq="30min",inclusive="left",tz="UTC")
    data=pd.DataFrame({"actual":100.0,"forecast":100.0},index=idx)
    sizes=[{"name":"a","duration_slots":2,"energy_kwh":1,"interruptible":False}]
    config={"start":"2024-01-02","end":"2024-01-03","policies":["P0","P2","P3","P4"],
            "forecast_modes":["api","oracle"],"seeds":[0],"capacity_k":[1]}
    frame,meta,audit=run_backtest(data,sizes,config,{"pue":1})
    write_outputs(frame,meta,audit,tmp_path)
    assert verify_outputs(tmp_path,data)["status"]=="passed"
    frame.loc[1,"emissions_g"]+=1
    write_outputs(frame,meta,audit,tmp_path)
    with pytest.raises(AssertionError):
        verify_outputs(tmp_path,data)

import numpy as np
import pandas as pd
from carbonsched.scheduler.forecast import build_signal

def test_api_has_no_actual_lookahead():
    idx=pd.date_range("2024-01-01",periods=144,freq="30min",tz="UTC")
    data=pd.DataFrame({"forecast":100.0,"actual":90.0},index=idx)
    slots=idx[48:66]
    data.loc[slots[[0,5]],"forecast"]=np.nan
    original=build_signal(data,slots,"api",slots[0])
    data.loc[data.index>=slots[0],"actual"]=99999
    changed=build_signal(data,slots,"api",slots[0])
    np.testing.assert_array_equal(original.values,changed.values)
    assert original.substitutions==2 and original.missing_slots==2
    assert original.values[0]==90
    from carbonsched.scheduler.models import Job
    from carbonsched.scheduler.policies import schedule
    job=Job("causal",2,1,False,slots[0].to_pydatetime(),(slots[-1]+pd.Timedelta(minutes=30)).to_pydatetime())
    for policy in ["P0","P2","P3","P4"]:
        assert schedule(policy,[job],original.values,job.release)==schedule(policy,[job],changed.values,job.release)

def test_cannot_use_unavailable_lag_or_interpolated_forecast():
    idx=pd.date_range("2024-01-01",periods=144,freq="30min",tz="UTC")
    data=pd.DataFrame({"forecast":100.0,"actual":90.0,"forecast_interp":False},index=idx)
    data.loc[idx[100],"forecast_interp"]=True
    signal=build_signal(data,idx[100:101],"api",idx[48])
    assert signal.unresolved==1

def test_noise_is_seeded_and_window_independent():
    idx=pd.date_range("2024-01-01",periods=100,freq="30min",tz="UTC")
    data=pd.DataFrame({"actual":100.0},index=idx)
    a=build_signal(data,idx[40:60],"noisy",idx[40],3)
    b=build_signal(data,idx[45:50],"noisy",idx[40],3)
    np.testing.assert_array_equal(a.values[5:10],b.values)
    assert not np.array_equal(a.values,build_signal(data,idx[40:60],"noisy",idx[40],4).values)

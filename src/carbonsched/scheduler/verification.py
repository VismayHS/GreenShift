"""Independent verification of exported schedules against raw national actual CI."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from .simulator import COLUMNS, KEY


def verify_outputs(output: Path, carbon: pd.DataFrame) -> dict:
    frame=pd.read_parquet(output/"backtest.parquet")
    audit=pd.read_parquet(output/"backtest_slots.parquet")
    meta=json.loads((output/"backtest_meta.json").read_text())
    assert list(frame.columns)==COLUMNS, "contract columns/order differ"
    assert len(frame)==len(audit)==meta["row_count"]
    assert not frame.duplicated(KEY).any(), "duplicate job/run keys"
    assert frame.deadline_met.all()
    assert (frame.start_utc>=frame.release_utc).all()
    assert (frame.end_utc<=frame.deadline_utc).all()
    assert (frame.n_slots>0).all()
    assert (frame.energy_kwh>=0).all()
    assert np.array_equal(audit.row_id,np.arange(len(frame)))
    assert hashlib.sha256((output/"backtest.parquet").read_bytes()).hexdigest()==meta["backtest_sha256"]
    timestamps=carbon.index.asi8
    actual=carbon.actual.to_numpy()
    start_ns=int(timestamps[0])
    step_ns=30*60*10**9
    usage={}
    base_energy={}
    for row,a in zip(frame.itertuples(index=False),audit.itertuples(index=False)):
        slots=np.asarray(a.slots,dtype=int)
        baseline=np.asarray(a.baseline_slots,dtype=int)
        origin=pd.Timestamp(a.grid_start_utc).value
        offset=(origin-start_ns)//step_ns
        assert len(slots)==len(set(slots))==row.n_slots
        assert len(baseline)==row.n_slots
        assert (slots>=0).all()
        assert row.start_utc.value==origin+int(slots.min())*step_ns
        assert row.end_utc.value==origin+(int(slots.max())+1)*step_ns
        assert row.interrupted==(slots.max()-slots.min()+1!=len(slots))
        assert np.isclose(row.emissions_g,row.energy_kwh*actual[offset+slots].mean(),rtol=1e-12,atol=1e-12)
        assert np.isclose(row.baseline_emissions_g,row.energy_kwh*actual[offset+baseline].mean(),rtol=1e-12,atol=1e-12)
        assert row.baseline_end_utc.value==origin+(int(baseline.max())+1)*step_ns
        assert row.delay_min==(row.end_utc-row.baseline_end_utc).total_seconds()/60
        window=None if pd.isna(row.window_h) else row.window_h
        key=(row.night,row.scenario,row.region,row.policy,row.forecast_mode,row.seed,window,row.capacity_k)
        counts=usage.setdefault(key,{})
        for s in slots:
            counts[int(s)]=counts.get(int(s),0)+1
            assert counts[int(s)]<=row.capacity_k, f"capacity exceeded: {key}"
        energy_key=(row.night,row.scenario,window,row.capacity_k,row.job)
        previous=base_energy.setdefault(energy_key,row.energy_kwh)
        assert row.energy_kwh==previous
    totals=frame.groupby(["scenario","policy","forecast_mode"])[["emissions_g","baseline_emissions_g"]].sum()
    comparisons=[]
    for (scenario,policy), group in totals.groupby(level=[0,1]):
        if "api" in group.index.get_level_values(2) and "oracle" in group.index.get_level_values(2):
            api=float(group.loc[(scenario,policy,"api"),"emissions_g"])
            oracle=float(group.loc[(scenario,policy,"oracle"),"emissions_g"])
            assert oracle<=api+1e-9, f"oracle worse than api on average: {scenario}/{policy}"
            comparisons.append({"scenario":scenario,"policy":policy,"api_g":api,"oracle_g":oracle})
    return {"status":"passed","rows":len(frame),"plans":len(usage),"deadline_misses":0,
            "capacity_violations":0,"actual_accounting_rows_checked":len(frame),
            "energy_conserved":True,"oracle_vs_api":comparisons,
            "backtest_sha256":meta["backtest_sha256"]}

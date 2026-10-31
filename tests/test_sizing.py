import json
import pandas as pd
import pytest
from carbonsched.scheduler.sizing import load_sizes

def test_scaling_preserves_energy_and_marks_placeholders(tmp_path):
    cat=tmp_path/"jobs.json"
    cat.write_text(json.dumps({"jobs":[{"name":"j","interruptible":False}]}))
    csv=tmp_path/"measurements.csv"
    cfg={"scale":None,"target_heaviest_s":7200,"pue":1.5,"placeholder_slots":[2],"placeholder_energy_kwh":0.001}
    sizes,meta=load_sizes(cat,csv,cfg)
    assert meta["source"]=="placeholder"
    pd.DataFrame([{"job":"j","duration_s":60,"attributable_kwh":0.001,"energy_source":"rapl"}]*5).to_csv(csv,index=False)
    sizes,meta=load_sizes(cat,csv,cfg)
    assert meta["scale"]==120
    assert sizes[0]["duration_slots"]==4
    assert sizes[0]["energy_kwh"]==pytest.approx(0.18)

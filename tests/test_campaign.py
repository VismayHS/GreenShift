import pandas as pd
import pytest
from carbonsched.energy.campaign import METRICS, summarize, subtract_idle, fit_model


def test_summary_and_idle_have_known_units():
    records = pd.DataFrame([{**dict.fromkeys(METRICS, 1.0), "job": "a",
                             "duration_s": 40.0, "rapl_pkg_j": 400.0 + i,
                             "mean_cpu_util": 0.2 + 0.1 * i} for i in range(5)])
    records = subtract_idle(records, 2)
    assert records.attributable_j.iloc[0] == 320
    summary = summarize(records).iloc[0]
    assert summary.quality_pass
    assert summary.attributable_j_mean == 322
    assert summary.attributable_j_ci95_low < 322 < summary.attributable_j_ci95_high
    assert fit_model(records)["r2"] == pytest.approx(1)

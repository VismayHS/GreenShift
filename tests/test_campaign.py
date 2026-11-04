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
    assert summary.attributable_j_ci95_low == pytest.approx(320.0368, abs=0.0001)
    assert summary.attributable_j_ci95_high == pytest.approx(323.9632, abs=0.0001)
    assert fit_model(records)["r2"] == pytest.approx(1)


def test_retry_accepts_whole_cohorts_and_preserves_failed_rows():
    from carbonsched.energy.campaign import combine_qualified_cohorts
    def cohort(job, outlier=False):
        rows = pd.DataFrame([{**dict.fromkeys(METRICS, 1.0), "job": job,
                              "duration_s": 40., "rapl_pkg_j": 400. + i,
                              "energy_source": "rapl", "repeats": 1} for i in range(5)])
        if outlier:
            rows.loc[0, "rapl_pkg_j"] = 2000.
        return subtract_idle(rows, 2.)
    meta = dict(status="quality_failed", idle_start_w=2., idle_end_w=2., idle_used_w=2.,
                cpu="test", cores="4", driver_memory="8g", scale_factor=1)
    original = pd.concat([cohort("a"), cohort("b", True)], ignore_index=True)
    retry = cohort("b")
    jobs = [{"name": "a"}, {"name": "b"}]
    sessions = [("initial", original, meta), ("retry", retry, {**meta, "status": "complete"})]
    result, selected, excluded = combine_qualified_cohorts(sessions, jobs)
    assert len(result) == 10
    assert result.groupby("job").size().to_dict() == {"a": 5, "b": 5}
    assert selected == {"a": "initial", "b": "retry"}
    assert excluded[0]["n"] == 5
    assert len(original) == 10 and original.rapl_pkg_j.max() == 2000.
    with pytest.raises(ValueError, match="multiple passing"):
        combine_qualified_cohorts(sessions + [("duplicate", retry, meta)], jobs)
    with pytest.raises(ValueError, match="idle bookends"):
        combine_qualified_cohorts([("bad", original, {k: v for k, v in meta.items() if k != "idle_end_w"})], jobs)

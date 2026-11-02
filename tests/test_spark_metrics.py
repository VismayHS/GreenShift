import io
import json
from types import SimpleNamespace
from carbonsched.workloads.spark_jobs import _stage_metrics


def test_stage_metrics_survive_old_history_eviction(monkeypatch):
    spark=SimpleNamespace(sparkContext=SimpleNamespace(uiWebUrl="http://localhost:4040",applicationId="test"))
    # Old stages 0..100 have been evicted. Only work after the boundary belongs
    # to this run; subtracting cumulative totals would produce wrong deltas.
    records=[{"stageId":101,"executorCpuTime":700},{"stageId":102,"executorCpuTime":200},
             {"stageId":103,"executorCpuTime":300}]
    monkeypatch.setattr("urllib.request.urlopen",lambda *a,**k:io.StringIO(json.dumps(records)))
    result=_stage_metrics(spark,after_stage_id=101)
    assert result["executorCpuTime"]==500
    assert result["numStages"]==2
    assert result["_max_stage_id"]==103

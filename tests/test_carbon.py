from datetime import datetime, timezone
import pandas as pd
from carbonsched.carbon import uk_api
from carbonsched.carbon.clean import regrid

def test_missing_forecast_key(monkeypatch):
    monkeypatch.setattr(uk_api,"_get",lambda *a,**k:{"data":[
        {"from":"2024-01-01T00:00Z","to":"2024-01-01T00:30Z","intensity":{"actual":123,"index":"low"}}]})
    result=uk_api.national(datetime(2024,1,1,tzinfo=timezone.utc),datetime(2024,1,2,tzinfo=timezone.utc),pause=0)
    assert pd.isna(result.forecast.iloc[0])
    assert result.actual.iloc[0]==123

def test_long_gaps_stay_missing_and_short_gaps_flagged():
    idx=pd.date_range("2024-01-01",periods=12,freq="30min",tz="UTC")
    frame=pd.DataFrame({"from":idx,"forecast":[10,None,30,40,None,None,None,None,None,100,110,120]})
    result=regrid(frame,["forecast"],"2024-01-01","2024-01-01T06:00")
    assert result.forecast.iloc[1]==20
    assert result.forecast_interp.iloc[1]
    assert result.long_gap.sum()==5

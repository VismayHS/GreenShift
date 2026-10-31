from datetime import date, datetime, timezone
import pytest
from carbonsched.scheduler.models import Job, Plan, night_window, validate, SLOT

@pytest.mark.parametrize("day,slots", [(date(2024,3,30),16),(date(2024,10,26),20),(date(2024,7,1),18)])
def test_dst_window(day, slots):
    r,d = night_window(day)
    assert (d-r)/SLOT == slots
    assert r.tzinfo == timezone.utc

def test_plan_energy_and_integrity():
    r,d = night_window(date(2024,1,1))
    j = Job("a",2,0.1,True,r,d)
    p = Plan(j,(0,2),r)
    assert p.emissions([100,999,200]) == pytest.approx(15)
    assert p.interrupted and p.end == r+3*SLOT
    with pytest.raises(ValueError):
        Plan(j,(0,0),r)
    with pytest.raises(ValueError):
        validate([p,p],[j],18,1)
    with pytest.raises(ValueError):
        Job("a",0,1,False,r,d)
    with pytest.raises(ValueError):
        Job("a",1,float("nan"),False,r,d)

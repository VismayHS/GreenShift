from datetime import date
import numpy as np
import pytest
from carbonsched.scheduler.models import Job, SLOT, night_window, validate
from carbonsched.scheduler.policies import schedule, InfeasibleSchedule

def jobs_for(n=6, interruptible=False):
    r,_=night_window(date(2024,1,1))
    return r,[Job("a",2,2,interruptible,r,r+n*SLOT),Job("b",1,1,False,r,r+n*SLOT)]

@pytest.mark.parametrize("policy",["P0","P2","P3","P4"])
@pytest.mark.parametrize("k",[1,2])
def test_random_invariants(policy,k):
    r,jobs=jobs_for(6,True)
    rng=np.random.default_rng(7)
    for _ in range(50):
        ci=rng.uniform(1,300,6)
        plans=schedule(policy,jobs,ci,r,k)
        validate(plans,jobs,6,k)
        assert sum(p.job.energy_kwh for p in plans)==3
        assert all(p.end<=p.job.deadline for p in plans)

def test_hand_checkable_two_jobs():
    r,jobs=jobs_for()
    plans=schedule("P4",jobs,[100,100,10,10,50,50],r)
    assert plans[0].slots==(2,3)
    assert plans[1].slots==(4,)
    assert sum(p.emissions([100,100,10,10,50,50]) for p in plans)==70

@pytest.mark.parametrize("policy",["P2","P3","P4"])
def test_constant_carbon_and_missing_signal(policy):
    r,jobs=jobs_for()
    base=schedule("P0",jobs,[50]*6,r)
    plans=schedule(policy,jobs,[50]*6,r)
    assert sum(p.emissions([50]*6) for p in plans)-sum(p.emissions([50]*6) for p in base)==0
    assert schedule(policy,jobs,[np.nan]*6,r)==base

def test_interruptible_selects_lowest_separated_slots():
    r,jobs=jobs_for(6,True)
    plans=schedule("P3",jobs[:1],[1,100,1,100,100,100],r)
    assert plans[0].slots==(0,2) and plans[0].interrupted
    assert not schedule("P2",jobs[:1],[1,100,1,100,100,100],r)[0].interrupted

def test_overfull_workload_fails_explicitly():
    r,jobs=jobs_for(3)
    with pytest.raises(InfeasibleSchedule):
        schedule("P4",jobs+[Job("c",1,1,False,r,r+3*SLOT)],[10]*3,r)


def test_edf_preserves_urgent_job_when_large_job_prefers_its_slot():
    r,_=jobs_for()
    jobs=[Job("urgent",1,1,False,r,r+SLOT),Job("large",2,10,False,r,r+6*SLOT)]
    plans=schedule("P4",jobs,[1,2,3,4,5,6],r)
    assert plans[0].slots==(0,)
    assert plans[1].slots==(1,2)


def test_capacity_two_allows_parallel_baseline():
    r,jobs=jobs_for()
    plans=schedule("P0",jobs,[100]*6,r,2)
    assert plans[0].start==plans[1].start==r


@pytest.mark.parametrize("policy",["P2","P4"])
def test_single_job_best_window_matches_brute_force(policy):
    r,jobs=jobs_for()
    rng=np.random.default_rng(8)
    for _ in range(30):
        ci=rng.uniform(0,500,6)
        plan=schedule(policy,jobs[:1],ci,r)[0]
        assert plan.emissions(ci)==pytest.approx(min(ci[i:i+2].mean()*2 for i in range(5)))

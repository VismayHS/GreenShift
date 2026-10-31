"""Wiesner Scenario I on 2024-25 GB data, with explicit start-window semantics."""
from datetime import datetime, time, timedelta
from .models import Job, SLOT, UK
from .simulator import scenarios


def all_scenarios(night, sizes, config):
    yield from scenarios(night,sizes,config)
    # fold=0 picks the first 01:00 on the autumn clock change. On the spring
    # change 01:00 does not exist: round-trip normalizes it to 02:00 BST.
    anchor=datetime.combine(night,time(1),UK).astimezone(__import__("datetime").timezone.utc)
    for hours in config["replication_windows_h"]:
        release=anchor-timedelta(hours=hours)
        deadline=anchor+timedelta(hours=hours)+SLOT
        # Normalized 1 kWh isolates the timing effect; not a hardware measurement.
        job=Job("wiesner_s1",1,1.0,False,release,deadline,baseline_start=anchor)
        yield "wiesner_s1",float(hours),[job],release,deadline

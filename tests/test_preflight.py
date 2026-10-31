import pytest
from carbonsched.energy.preflight import require_rapl


def test_measurement_refuses_silent_estimates_and_battery():
    with pytest.raises(RuntimeError, match="RAPL unavailable"):
        require_rapl({"sensor": None})
    with pytest.raises(RuntimeError, match="AC power"):
        require_rapl({"sensor": "RaplWindows", "ac_power": False})
    require_rapl({"sensor": "RaplWindows", "ac_power": True})

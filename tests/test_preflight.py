import pytest
from carbonsched.energy.preflight import require_rapl


def test_session_rejects_disconnect_and_suspension():
    from carbonsched.energy.preflight import validate_session_sample
    validate_session_sample(True, 1.1)
    validate_session_sample(None, 1.1)  # desktop with no battery
    with pytest.raises(RuntimeError, match="AC disconnected"):
        validate_session_sample(False, 1.1)
    with pytest.raises(RuntimeError, match="possible sleep"):
        validate_session_sample(True, 60)


def test_measurement_refuses_silent_estimates_and_battery():
    with pytest.raises(RuntimeError, match="RAPL unavailable"):
        require_rapl({"sensor": None})
    with pytest.raises(RuntimeError, match="AC power"):
        require_rapl({"sensor": "RaplWindows", "ac_power": False})
    require_rapl({"sensor": "RaplWindows", "ac_power": True})


def test_awake_session_restores_state_on_failure(monkeypatch):
    import ctypes
    from types import SimpleNamespace
    from carbonsched.energy.preflight import awake_session
    calls=[]
    def execution_state(flags):
        calls.append(flags)
        return 0x80000000
    monkeypatch.setattr("platform.system", lambda: "Windows")
    monkeypatch.setattr(ctypes,"windll",SimpleNamespace(kernel32=SimpleNamespace(SetThreadExecutionState=execution_state)),raising=False)
    with pytest.raises(ValueError):
        with awake_session():
            raise ValueError("test")
    assert calls==[0x80000001,0x80000000]

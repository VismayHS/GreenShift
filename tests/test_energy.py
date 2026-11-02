import pytest
from carbonsched.energy.meter import EnergyMeter, MeterResult
from carbonsched.energy.model import LinearPowerModel, calibrate
from carbonsched.energy.sensors import RaplLinux


def test_gross_and_attributable_are_explicit():
    r = MeterResult("j", 0, 10, 100, 60, None, 110, 0.5, idle_w=2)
    assert r.kwh == 100 / 3.6e6
    assert r.attributable_kwh == 80 / 3.6e6
    assert r.summary()["energy_source"] == "rapl"
    r.idle_w = 20
    assert r.attributable_kwh == 0
    r.idle_w = None
    assert r.attributable_j is None and r.attributable_kwh is None


@pytest.mark.parametrize("count", [0, 1, 2])
def test_model_integrates_entire_interval(count):
    m = EnergyMeter(model=LinearPowerModel(10, 10, 0))
    m._t0 = 100
    m._samples = [{"t": 101 + i, "util": 0.5, "discharge_w": 20} for i in range(count)]
    r = m._finish(104, None)
    assert r.model_j == 40
    if count:
        assert r.battery_j == 80


def test_rapl_wrap(tmp_path, monkeypatch):
    root = tmp_path / "rapl-package0"
    root.mkdir()
    (root / "name").write_text("package-0")
    (root / "max_energy_range_uj").write_text("100000000")
    energy = root / "energy_uj"
    energy.write_text("99000000")
    monkeypatch.setattr(RaplLinux, "ROOT", str(tmp_path))
    monkeypatch.setattr("glob.glob", lambda pattern: [str(root)])
    sensor = RaplLinux()
    before = sensor.read_joules()["PKG"]
    energy.write_text("2000000")
    assert sensor.read_joules()["PKG"] - before == 3


def test_calibration_known_line():
    idle, peak, r2 = calibrate([0, 0.5, 1], [10, 30, 50])
    assert idle == pytest.approx(10)
    assert peak == pytest.approx(50)
    assert r2 == pytest.approx(1)

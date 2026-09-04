from backend.services.confidence_engine import calculate_confidence
from backend.services.impact_engine import impacts_and_actions
from backend.services.risk_engine import calculate_risks, risk_level, time_windows
from backend.services.change_detection import compare_forecasts
from backend.services.forecast_consensus import summarize_consensus


def test_risk_thresholds_and_missing_data():
    assert risk_level(0) == "very_low"
    assert risk_level(72) == "high"
    assert risk_level(90) == "extreme"
    missing = calculate_risks([{"time": "2026-09-04T10:00"}])
    assert missing["rain"]["score"] is None
    assert missing["rain"]["level"] == "unavailable"


def test_risk_uses_hourly_data_and_time_windows():
    hours = [
        {"time": "2026-09-04T17:00", "precipitation_probability_percent": 20, "precipitation_mm": 0, "weather_code": 1, "wind_speed_kmh": 10, "temperature_c": 28, "humidity_percent": 50},
        {"time": "2026-09-04T18:00", "precipitation_probability_percent": 90, "precipitation_mm": 12, "weather_code": 63, "wind_speed_kmh": 20, "temperature_c": 27, "humidity_percent": 80},
    ]
    risks = calculate_risks(hours)
    assert risks["rain"]["score"] >= 90
    assert "storm" in risks
    assert max(time_windows(hours), key=lambda item: item["risk_score"])["time"].endswith("18:00")


def test_profile_changes_actions_and_confidence_is_distinct():
    risks = {"rain": {"score": 80}, "flood": {"score": 60}, "lightning": {"score": 10}, "wind": {"score": 10}, "heat": {"score": 10}}
    traveller = impacts_and_actions("traveller", risks)
    farmer = impacts_and_actions("farmer", risks)
    assert any("travelling" in action for action in traveller["recommended_actions"])
    assert any("irrigation" in action for action in farmer["recommended_actions"])
    confidence = calculate_confidence([{"precipitation_probability_percent": 70}], 1, 1)
    assert 0 <= confidence["score"] <= 100


def test_consensus_does_not_fabricate_sources():
    assert summarize_consensus([])["source_count"] == 0
    assert summarize_consensus([{"name": "Open-Meteo", "rain_signal": "likely"}])["source_count"] == 1
    assert summarize_consensus([{"name": "A", "rain_signal": "likely"}, {"name": "B", "rain_signal": "unlikely"}])["uncertainty"] == "high"


def test_forecast_change_detection_requires_previous_snapshot():
    assert compare_forecasts(None, {"forecast": []})["forecast_changed"] is False
    previous = {"forecast": [{"precipitation_probability_percent": 30, "temperature_max_c": 32}]}
    latest = {"forecast": [{"precipitation_probability_percent": 85, "temperature_max_c": 38}]}
    result = compare_forecasts(previous, latest)
    assert result["forecast_changed"] is True
    assert {item["parameter"] for item in result["changes"]} == {"rain_probability", "temperature_max"}

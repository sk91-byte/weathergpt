from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_root_and_health():
    assert client.get("/").json()["status"] == "running"
    health = client.get("/health").json()
    expected = "healthy" if health["database"] in {"connected", "not_configured"} else "degraded"
    assert health["status"] == expected


def test_chat_coordinates_must_be_a_pair():
    response = client.post("/chat", json={"message": "weather near me", "latitude": 28.6})
    assert response.status_code == 422


def test_nwp_is_explicitly_unavailable():
    response = client.get("/nwp/status")
    assert response.status_code == 200
    assert response.json()["providers"][0]["available"] is False


def test_alert_feed_does_not_claim_demo_data_is_official():
    response = client.get("/alerts/status")
    assert response.status_code == 200
    assert response.json()["demo_data_enabled"] is False


def test_weather_provider_status_does_not_expose_credentials():
    response = client.get("/weather/providers")
    assert response.status_code == 200
    payload = response.json()
    assert payload["india_primary"] == "IMD"
    assert "key" not in payload["imd"]


def test_languages_registry_contains_english_and_22_scheduled_languages():
    response = client.get("/languages")
    assert response.status_code == 200
    values = response.json()["languages"]
    assert len(values) == 23
    assert sum(item["is_scheduled_language"] for item in values) == 22
    assert {item["code"] for item in values} >= {"en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "ur"}


def test_unsupported_chat_language_is_rejected():
    response = client.post("/chat", json={"message": "weather in Delhi", "language": "xyz"})
    assert response.status_code == 422

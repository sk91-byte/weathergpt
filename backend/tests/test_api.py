from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_root_and_health():
    assert client.get("/").json()["status"] == "running"
    assert client.get("/health").json()["status"] == "healthy"


def test_chat_coordinates_must_be_a_pair():
    response = client.post("/chat", json={"message": "weather near me", "latitude": 28.6})
    assert response.status_code == 422


def test_nwp_is_explicitly_unavailable():
    response = client.get("/nwp/status")
    assert response.status_code == 200
    assert response.json()["providers"][0]["available"] is False


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

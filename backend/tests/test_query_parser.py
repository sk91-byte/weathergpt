from backend.services.query_parser import parse_weather_query


def test_hinglish_decision_followup_reuses_previous_city():
    parsed = parse_weather_query(
        "kya mujhe umbrella carry karna chahie",
        {"last_location": "Gurugram", "last_intent": "forecast"},
    )

    assert parsed["intent"] == "forecast"
    assert parsed["location"] == "Gurugram"
    assert parsed["request_type"] == "rain"


def test_hinglish_weather_followup_reuses_previous_city():
    parsed = parse_weather_query(
        "aur batao mausam kaisa hai",
        {"last_location": "Chennai", "last_intent": "current_weather"},
    )

    assert parsed["intent"] == "current_weather"
    assert parsed["location"] == "Chennai"


def test_observation_question_uses_current_weather_not_daily_probability():
    parsed = parse_weather_query("is it raining outside in Gurugram right now")

    assert parsed["intent"] == "current_weather"
    assert parsed["request_type"] == "rain"
    assert parsed["location"] == "Gurugram"

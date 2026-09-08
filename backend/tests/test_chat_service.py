"""Test suite for WeatherGPT chat service logic, coordinate handling, fallbacks, and metadata."""

import pytest
from unittest.mock import patch, MagicMock

from backend.services.chat_service import process_chat_message
from backend.services.llm_service import LLMServiceError, WeatherQuery
from backend.services.weather_service import WeatherServiceError


def test_scenario_a_coordinates_priority():
    """Valid coordinates take priority for live weather lookup and do not fail even if location resolution returns None."""
    mock_weather = {
        "source": "Open-Meteo",
        "is_live": True,
        "current": {
            "temperature_c": 32.5,
            "condition": "Partly Cloudy",
            "humidity_percent": 65,
            "wind_speed_kmh": 12.0,
            "rain_mm": 0.0,
            "observed_at": "2026-09-07T10:00:00Z"
        }
    }
    with patch("backend.services.chat_service.get_current_weather", return_value=mock_weather):
        with patch("backend.services.chat_service.reverse_geocode", return_value=None):
            with patch("backend.services.chat_service.get_location", return_value=None):
                result = process_chat_message(
                    message="What is the weather today?",
                    latitude=28.72,
                    longitude=77.10,
                    location="Rohini, Delhi, India"
                )
                assert result["data_source"] == "Open-Meteo"
                assert result["location"]["latitude"] == 28.72
                assert result["location"]["longitude"] == 77.10
                assert result["location"]["name"] == "Rohini, Delhi, India"


def test_scenario_b_missing_gemini_key():
    """Missing Gemini API key falls back cleanly to live Open-Meteo weather response with fallback metadata."""
    mock_weather = {
        "source": "Open-Meteo",
        "is_live": True,
        "current": {
            "temperature_c": 30.0,
            "condition": "Sunny",
            "humidity_percent": 50,
            "wind_speed_kmh": 10.0,
            "observed_at": "2026-09-07T10:00:00Z"
        }
    }
    mock_settings = MagicMock(gemini_api_key=None, gemini_model="gemini-2.5-flash")
    with patch("backend.services.chat_service.settings", mock_settings):
        with patch("backend.services.chat_service.get_current_weather", return_value=mock_weather):
            result = process_chat_message(
                message="How is the weather?",
                latitude=28.61,
                longitude=77.23,
                location="Delhi"
            )
            assert result["ai_used"] is False
            assert result["fallback_used"] is True
            assert result["fallback_reason"] == "llm_not_configured"
            assert result["data_source"] == "Open-Meteo"
            assert "Delhi" in result["response"]
            assert "30" in result["response"]


def test_scenario_c_invalid_gemini_key():
    """Invalid Gemini API key results in fallback response without crashing or exposing keys."""
    mock_weather = {
        "source": "Open-Meteo",
        "is_live": True,
        "current": {
            "temperature_c": 28.0,
            "condition": "Overcast",
            "humidity_percent": 70,
            "wind_speed_kmh": 15.0
        }
    }
    with patch("backend.services.chat_service.interpret_weather_query", side_effect=LLMServiceError("API key invalid (401)")):
        with patch("backend.services.chat_service.get_current_weather", return_value=mock_weather):
            result = process_chat_message(
                message="What is the weather in Delhi?",
                location="Delhi"
            )
            assert result["ai_used"] is False
            assert result["fallback_used"] is True
            assert "28" in result["response"]
            assert "API key" not in result["response"]


def test_scenario_d_working_gemini():
    """Working Gemini API returns structured AI response with ai_used=True."""
    mock_weather = {
        "source": "Open-Meteo",
        "is_live": True,
        "current": {
            "temperature_c": 25.0,
            "condition": "Clear sky",
            "humidity_percent": 40,
            "wind_speed_kmh": 8.0
        }
    }
    mock_query = WeatherQuery(
        intent="current_weather",
        location="Delhi",
        location_mode="named_location",
        time_reference="today",
        request_type="general_weather"
    )

    with patch("backend.services.chat_service.interpret_weather_query", return_value=mock_query):
        with patch("backend.services.chat_service.get_current_weather", return_value=mock_weather):
            with patch("backend.services.chat_service.generate_weather_response", return_value="The weather in Delhi is currently 25°C and clear."):
                result = process_chat_message(
                    message="Weather in Delhi",
                    latitude=28.61,
                    longitude=77.23
                )
                assert result["ai_used"] is True
                assert result["fallback_used"] is False
                assert result["response"] == "The weather in Delhi is currently 25°C and clear."


def test_scenario_e_gemini_timeout():
    """Gemini timeout triggers fallback with real weather data."""
    mock_weather = {
        "source": "Open-Meteo",
        "is_live": True,
        "current": {
            "temperature_c": 31.0,
            "condition": "Mainly clear",
            "humidity_percent": 55,
            "wind_speed_kmh": 14.0
        }
    }
    with patch("backend.services.chat_service.interpret_weather_query", side_effect=LLMServiceError("Deadline exceeded timeout")):
        with patch("backend.services.chat_service.get_current_weather", return_value=mock_weather):
            result = process_chat_message(
                message="Tell me the weather in Delhi",
                location="Delhi"
            )
            assert result["ai_used"] is False
            assert result["fallback_used"] is True
            assert result["fallback_reason"] == "llm_interpretation_failed"
            assert "31" in result["response"]


def test_scenario_f_invalid_coordinates():
    """Invalid coordinates (out of bounds) return clear error message."""
    result = process_chat_message(
        message="What is the weather?",
        latitude=120.0,
        longitude=77.10
    )
    assert "Invalid coordinates" in result["response"]


def test_scenario_g_missing_location():
    """Missing location and coordinates prompt user for clarification."""
    with patch("backend.services.chat_service.interpret_weather_query", side_effect=LLMServiceError("No location")):
        result = process_chat_message(
            message="What is the temperature?"
        )
        assert "city name" in result["response"].lower() or "शहर" in result["response"]


def test_scenario_h_followup_location():
    """Follow-up questions reuse previous conversation location."""
    mock_weather = {
        "source": "Open-Meteo",
        "is_live": True,
        "current": {"temperature_c": 27.0, "condition": "Clear"},
        "forecast": [{"date": "2026-09-08", "max_temp_c": 29.0, "min_temp_c": 20.0, "rain_probability_percent": 10}]
    }
    with patch("backend.services.chat_service.get_weather_forecast", return_value=mock_weather):
        with patch("backend.services.chat_service.get_current_weather", return_value=mock_weather):
            res1 = process_chat_message(message="Weather in Delhi", location="Delhi", latitude=28.61, longitude=77.23)
            cid = res1["conversation_id"]

            res2 = process_chat_message(message="what about tomorrow?", conversation_id=cid)
            assert res2["location"]["name"] == "Delhi"


def test_scenario_i_multilingual():
    """Multilingual requests (Hindi/Hinglish) respond in appropriate language formatting."""
    mock_weather = {
        "source": "Open-Meteo",
        "is_live": True,
        "current": {"temperature_c": 32.0, "condition": "Clear sky", "humidity_percent": 45, "wind_speed_kmh": 10.0}
    }
    mock_settings = MagicMock(gemini_api_key=None, gemini_model="gemini-2.5-flash")
    with patch("backend.services.chat_service.settings", mock_settings):
        with patch("backend.services.chat_service.get_current_weather", return_value=mock_weather):
            res_hi = process_chat_message(message="दिल्ली का मौसम कैसा है?", location="Delhi", language="hi")
            assert "दिल्ली" in res_hi["response"] or "Delhi" in res_hi["response"]

            res_hinglish = process_chat_message(message="Delhi ka mausam kaisa hai?", location="Delhi", language="en")
            assert "Delhi" in res_hinglish["response"]


def test_scenario_j_provider_failure():
    """Weather provider failure returns explicit unavailable message without fake data."""
    with patch("backend.services.chat_service.get_current_weather", side_effect=WeatherServiceError("Provider 503")):
        result = process_chat_message(
            message="Weather in Delhi",
            latitude=28.61,
            longitude=77.23,
            location="Delhi"
        )
        assert result["ai_used"] is False
        assert result["fallback_used"] is True
        assert result["fallback_reason"] == "weather_provider_unavailable"
        assert result["data_source"] == "none"
        assert "temporarily unavailable" in result["response"].lower() or "उपलब्ध नहीं" in result["response"]


def test_decision_response_is_grounded_by_gemini_when_configured():
    """Gemini explains the deterministic decision; it does not calculate the score."""
    mock_weather = {
        "source": "Open-Meteo",
        "is_live": True,
        "retrieved_at": "2026-09-08T10:00:00+00:00",
        "source_metadata": {"name": "Open-Meteo", "kind": "forecast_provider"},
        "hourly": [
            {
                "time": "2026-09-08T12:00",
                "precipitation_probability_percent": 70,
                "precipitation_mm": 8,
                "weather_code": 61,
                "wind_speed_kmh": 18,
                "temperature_c": 34,
                "humidity_percent": 70,
            }
        ],
        "forecast": [],
    }
    mock_query = WeatherQuery(
        intent="current_weather",
        location="Delhi",
        location_mode="named_location",
        time_reference="today",
        request_type="general_weather",
    )
    mock_settings = MagicMock(gemini_api_key="configured", gemini_model="gemini-test")
    with patch("backend.services.chat_service.settings", mock_settings):
        with patch("backend.services.chat_service.interpret_weather_query", return_value=mock_query):
            with patch("backend.services.chat_service.get_weather_forecast", return_value=mock_weather):
                with patch("backend.services.chat_service.generate_decision_response", return_value="Gemini grounded decision response"):
                    result = process_chat_message(
                        message="Should I travel today?",
                        latitude=28.61,
                        longitude=77.23,
                        location="Delhi",
                    )
    assert result["response"] == "Gemini grounded decision response"
    assert result["response_source"] == "Gemini"
    assert result["decision"]["risk_score"] is not None
    assert result["source_metadata"]["name"] == "Open-Meteo"

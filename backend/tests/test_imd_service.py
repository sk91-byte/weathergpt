from unittest.mock import patch

from backend.services.imd_service import IMDClient, get_current_weather, get_forecast, is_india_coordinates


def test_india_coordinate_gate():
    assert is_india_coordinates(28.61, 77.21)
    assert not is_india_coordinates(40.71, -74.0)


def test_imd_current_weather_is_normalized():
    payloads = {
        "cityforecast_mapping": [{"Station_Code": "42182", "Station_Name": "Delhi", "Latitude": "28.61", "Longitude": "77.21"}],
        "current_wx": [{"Station": "Delhi", "Date": "2026-09-08", "Time": "10:00:00", "Temperature": "32.5", "Humidity": "55", "Wind Speed": "12", "Weather Code": "21", "Latitude": "28.61", "Longitude": "77.21"}],
    }
    with patch.object(IMDClient, "get", side_effect=lambda endpoint, params=None: payloads[endpoint]):
        result = get_current_weather(28.61, 77.21)
    assert result["source"] == "IMD"
    assert result["current"]["temperature_c"] == 32.5
    assert result["current"]["condition"] == "Rain"
    assert result["source_metadata"]["official_warning_authority"] is True


def test_imd_city_forecast_is_normalized():
    payloads = {
        "cityforecast_mapping": [{"Station_Code": "42182", "Latitude": "28.61", "Longitude": "77.21"}],
        "cityforecastloc": [{"Station_Name": "Delhi", "Todays_Forecast_Max_Temp": "34", "Todays_Forecast_Min_temp": "26", "Todays_Forecast": "Mainly clear", "Day_2_Max_Temp": "35", "Day_2_Min_Temp": "27", "Day_2_Forecast": "Hot day"}],
    }
    with patch.object(IMDClient, "get", side_effect=lambda endpoint, params=None: payloads[endpoint]):
        result = get_forecast(28.61, 77.21, days=2)
    assert result["source"] == "IMD"
    assert len(result["forecast"]) == 2
    assert result["forecast"][0]["temperature_max_c"] == 34.0

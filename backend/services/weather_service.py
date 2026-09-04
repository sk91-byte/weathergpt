"""Service functions for retrieving weather data from Open-Meteo."""

from typing import Any

import requests


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT_SECONDS = 10


class WeatherServiceError(Exception):
    """Raised when Open-Meteo cannot provide valid weather data."""


def weather_code_description(code: int | None) -> str:
    """Convert a WMO weather code into a readable condition."""
    descriptions = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle",
        53: "Moderate drizzle", 55: "Dense drizzle", 61: "Slight rain",
        63: "Moderate rain", 65: "Heavy rain", 71: "Slight snow",
        73: "Moderate snow", 75: "Heavy snow", 80: "Slight rain showers",
        81: "Moderate rain showers", 82: "Violent rain showers",
        95: "Thunderstorm", 96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }
    return descriptions.get(code, "Unknown weather conditions")


def _request_weather(params: dict[str, Any]) -> dict[str, Any]:
    """Call Open-Meteo and validate the basic response shape."""
    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise WeatherServiceError("Open-Meteo is unavailable or returned invalid data") from exc
    if not isinstance(payload, dict) or ("current" not in payload and "daily" not in payload):
        raise WeatherServiceError("Open-Meteo returned an unexpected response")
    return payload


def get_current_weather(latitude: float, longitude: float) -> dict[str, Any]:
    """Return current weather for the supplied coordinates."""
    payload = _request_weather({
        "latitude": latitude, "longitude": longitude,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m",
        "timezone": "auto",
    })
    current = payload.get("current")
    if not isinstance(current, dict):
        raise WeatherServiceError("Open-Meteo returned no current weather data")
    code = current.get("weather_code")
    precipitation = current.get("precipitation")
    rain = current.get("rain")
    condition = weather_code_description(code if isinstance(code, int) else None)
    # Prefer the measured precipitation signal when it is positive. A weather
    # code can remain cloudy between model updates even while rain is occurring.
    if isinstance(rain, (int, float)) and rain > 0.1:
        condition = "Rain"
    elif isinstance(precipitation, (int, float)) and precipitation > 0.1:
        condition = "Precipitation"
    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "current": {
            "temperature_c": current.get("temperature_2m"),
            "apparent_temperature_c": current.get("apparent_temperature"),
            "humidity_percent": current.get("relative_humidity_2m"),
            "precipitation_mm": current.get("precipitation"),
            "rain_mm": current.get("rain"),
            "wind_speed_kmh": current.get("wind_speed_10m"),
            "wind_direction_degrees": current.get("wind_direction_10m"),
            "weather_code": code,
            "condition": condition,
        },
        "source": "Open-Meteo",
    }


def get_weather_forecast(latitude: float, longitude: float, days: int = 7) -> dict[str, Any]:
    """Return daily and hourly forecast data for the supplied coordinates."""
    payload = _request_weather({
        "latitude": latitude, "longitude": longitude, "forecast_days": days,
        "hourly": "temperature_2m,precipitation_probability,precipitation,rain,showers,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,visibility",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,weather_code",
        "timezone": "auto",
    })
    daily, hourly = payload.get("daily"), payload.get("hourly")
    daily_keys = ["time", "temperature_2m_max", "temperature_2m_min", "precipitation_sum", "precipitation_probability_max", "sunrise", "sunset", "weather_code"]
    if not isinstance(daily, dict) or not isinstance(hourly, dict) or any(not isinstance(daily.get(key), list) for key in daily_keys):
        raise WeatherServiceError("Open-Meteo returned malformed forecast data")
    forecast = []
    for index, date in enumerate(daily["time"]):
        code = daily["weather_code"][index]
        forecast.append({
            "date": date,
            "temperature_max_c": daily["temperature_2m_max"][index],
            "temperature_min_c": daily["temperature_2m_min"][index],
            "precipitation_sum_mm": daily["precipitation_sum"][index],
            "precipitation_probability_percent": daily["precipitation_probability_max"][index],
            "sunrise": daily["sunrise"][index], "sunset": daily["sunset"][index],
            "weather_code": code,
            "condition": weather_code_description(code if isinstance(code, int) else None),
        })
    times, temperatures = hourly.get("time"), hourly.get("temperature_2m")
    probabilities = hourly.get("precipitation_probability")
    if not all(isinstance(value, list) for value in (times, temperatures, probabilities)):
        raise WeatherServiceError("Open-Meteo returned malformed hourly data")
    def values(key: str) -> list[Any]:
        value = hourly.get(key)
        return value if isinstance(value, list) else [None] * len(times)

    hourly_forecast = []
    for index, (time, temperature, probability) in enumerate(zip(times, temperatures, probabilities)):
        hourly_forecast.append({
            "time": time,
            "temperature_c": temperature,
            "precipitation_probability_percent": probability,
            "precipitation_mm": values("precipitation")[index],
            "rain_mm": values("rain")[index],
            "showers_mm": values("showers")[index],
            "weather_code": values("weather_code")[index],
            "wind_speed_kmh": values("wind_speed_10m")[index],
            "wind_gusts_kmh": values("wind_gusts_10m")[index],
            "humidity_percent": values("relative_humidity_2m")[index],
            "visibility_m": values("visibility")[index],
        })
    return {"location": {"latitude": latitude, "longitude": longitude}, "forecast": forecast, "hourly": hourly_forecast, "source": "Open-Meteo"}

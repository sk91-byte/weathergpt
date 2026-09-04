"""Historical-weather provider abstraction using Open-Meteo archive data."""

from datetime import date
from typing import Any, Protocol

import requests


class HistoricalWeatherProvider(Protocol):
    def get_historical_weather(self, latitude: float, longitude: float, start_date: date, end_date: date) -> dict[str, Any]: ...


class OpenMeteoArchiveProvider:
    """Live historical daily observations/model data from Open-Meteo."""

    def get_historical_weather(self, latitude: float, longitude: float, start_date: date, end_date: date) -> dict[str, Any]:
        response = requests.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params={"latitude": latitude, "longitude": longitude, "start_date": start_date.isoformat(), "end_date": end_date.isoformat(), "daily": "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_mean", "timezone": "auto"},
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload.get("daily"), dict):
            raise ValueError("Historical response missing daily data")
        return {"data_source": "Open-Meteo Archive", "is_demo": False, "daily": payload["daily"]}


def get_historical_weather(latitude: float, longitude: float, start_date: date, end_date: date) -> dict[str, Any]:
    return OpenMeteoArchiveProvider().get_historical_weather(latitude, longitude, start_date, end_date)


def _year_ranges(start_year: int, end_year: int) -> list[tuple[date, date]]:
    return [(date(year, 1, 1), date(year, 12, 31)) for year in range(start_year, end_year + 1)]


def get_temperature_trend(latitude: float, longitude: float, start_year: int, end_year: int) -> dict[str, Any]:
    trend = []
    for start, end in _year_ranges(start_year, end_year):
        daily = get_historical_weather(latitude, longitude, start, end)["daily"]
        values = [v for v in daily.get("temperature_2m_mean", []) if v is not None]
        trend.append({"year": start.year, "average_temperature_c": round(sum(values) / len(values), 2) if values else None})
    return {"trend": trend, "data_source": "Open-Meteo Archive", "is_demo": False}


def get_rainfall_trend(latitude: float, longitude: float, start_year: int, end_year: int) -> dict[str, Any]:
    trend = []
    for start, end in _year_ranges(start_year, end_year):
        daily = get_historical_weather(latitude, longitude, start, end)["daily"]
        values = [v for v in daily.get("precipitation_sum", []) if v is not None]
        trend.append({"year": start.year, "rainfall_mm": round(sum(values), 2)})
    return {"trend": trend, "data_source": "Open-Meteo Archive", "is_demo": False}

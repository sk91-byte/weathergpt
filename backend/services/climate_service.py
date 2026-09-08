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


def _average(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


def _slope(points: list[tuple[int, float]]) -> float | None:
    """Return a simple least-squares slope for a human-readable trend signal."""
    if len(points) < 2:
        return None
    x_mean = sum(x for x, _ in points) / len(points)
    y_mean = sum(y for _, y in points) / len(points)
    denominator = sum((x - x_mean) ** 2 for x, _ in points)
    if denominator == 0:
        return None
    return round(sum((x - x_mean) * (y - y_mean) for x, y in points) / denominator, 3)


def get_climate_summary(latitude: float, longitude: float, start_year: int, end_year: int) -> dict[str, Any]:
    """Fetch the requested period once and derive both annual trend series.

    The previous implementation made one archive request per year for each
    metric. A single period request is faster, avoids rate-limit failures, and
    keeps temperature and rainfall based on exactly the same source snapshot.
    """
    historical = get_historical_weather(latitude, longitude, date(start_year, 1, 1), date(end_year, 12, 31))
    daily = historical["daily"]
    dates = daily.get("time", [])
    temperatures = daily.get("temperature_2m_mean", [])
    rainfall = daily.get("precipitation_sum", [])
    yearly: dict[int, dict[str, list[float]]] = {
        year: {"temperature": [], "rainfall": []} for year in range(start_year, end_year + 1)
    }
    for index, value in enumerate(dates):
        try:
            year = int(str(value)[:4])
        except (TypeError, ValueError):
            continue
        if year not in yearly:
            continue
        if index < len(temperatures) and temperatures[index] is not None:
            yearly[year]["temperature"].append(float(temperatures[index]))
        if index < len(rainfall) and rainfall[index] is not None:
            yearly[year]["rainfall"].append(float(rainfall[index]))

    temperature_trend = [
        {"year": year, "average_temperature_c": _average(values["temperature"])}
        for year, values in yearly.items()
    ]
    rainfall_trend = [
        {"year": year, "rainfall_mm": round(sum(values["rainfall"]), 2)}
        for year, values in yearly.items()
    ]
    temperature_points = [
        (item["year"], item["average_temperature_c"])
        for item in temperature_trend
        if item["average_temperature_c"] is not None
    ]
    rainfall_points = [(item["year"], item["rainfall_mm"]) for item in rainfall_trend]
    source = historical.get("data_source", "Open-Meteo Archive")
    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "period": {"start_year": start_year, "end_year": end_year},
        "temperature": {
            "trend": temperature_trend,
            "slope_c_per_year": _slope(temperature_points),
            "data_source": source,
            "is_demo": False,
        },
        "rainfall": {
            "trend": rainfall_trend,
            "slope_mm_per_year": _slope(rainfall_points),
            "data_source": source,
            "is_demo": False,
        },
        "interpretation_note": "This is a short historical comparison, not a formal climate-normal or attribution study.",
    }


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

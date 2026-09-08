"""India Meteorological Department provider adapter."""

from datetime import date, datetime, timedelta, timezone
from math import hypot
from typing import Any

import requests

from backend.config import settings


class IMDServiceError(Exception):
    """Raised when IMD is unavailable, unauthorized, or returns bad data."""


IMD_WEATHER_CODES = {
    1: "Clouds generally dissolving", 2: "Sky unchanged", 3: "Clouds developing",
    4: "Reduced visibility", 5: "Haze", 6: "Dust in suspension",
    7: "Dust or sand raised by wind", 9: "Duststorm or sandstorm", 10: "Mist",
    13: "Lightning visible", 17: "Thunderstorm", 20: "Drizzle", 21: "Rain",
    25: "Rain showers", 28: "Fog", 29: "Thunderstorm", 30: "Duststorm",
    40: "Fog at a distance", 50: "Drizzle", 60: "Rain", 80: "Rain showers",
}


def is_india_coordinates(latitude: float, longitude: float) -> bool:
    return 6.0 <= latitude <= 38.5 and 68.0 <= longitude <= 98.0


def imd_access_configured() -> bool:
    return bool(settings.imd_enabled and (settings.imd_api_key or settings.imd_ip_whitelisted))


def _number(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _text(value: Any) -> str | None:
    return str(value).strip() if value is not None and str(value).strip() else None


def _key(value: str) -> str:
    return "".join(ch.lower() for ch in value if ch.isalnum())


def _value(record: dict[str, Any], *names: str) -> Any:
    normalized = {_key(str(key)): value for key, value in record.items()}
    for name in names:
        if _key(name) in normalized:
            return normalized[_key(name)]
    return None


def _records(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    for name in ("data", "result", "results", "items"):
        value = payload.get(name)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        if isinstance(value, dict):
            nested = _records(value)
            if nested:
                return nested
    return [payload] if any(isinstance(value, (str, int, float)) for value in payload.values()) else []


class IMDClient:
    def __init__(self) -> None:
        self.base_url = settings.imd_api_base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json", "User-Agent": "WeatherGPT/1.0"})
        if settings.imd_api_key:
            self.session.headers.update({"Authorization": f"Bearer {settings.imd_api_key}", "X-API-Key": settings.imd_api_key})

    def get(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        try:
            response = self.session.get(f"{self.base_url}/{endpoint.lstrip('/')}", params=params or {}, timeout=(5, 15))
            response.raise_for_status()
            payload = response.json()
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "unknown"
            raise IMDServiceError(f"IMD request failed with HTTP {status}") from exc
        except (requests.RequestException, ValueError) as exc:
            raise IMDServiceError("IMD is unavailable or access was not authorized") from exc
        if isinstance(payload, dict) and payload.get("status") is False:
            raise IMDServiceError(str(payload.get("message") or "IMD rejected the request"))
        return payload


def _station_id(record: dict[str, Any]) -> str | None:
    return _text(_value(record, "station_id", "station_code", "stationcode", "id", "obj_id", "city_id", "call_sign"))


def _nearest_record(records: list[dict[str, Any]], latitude: float, longitude: float) -> dict[str, Any] | None:
    candidates: list[tuple[float, dict[str, Any]]] = []
    for record in records:
        lat = _number(_value(record, "latitude", "lat"))
        lon = _number(_value(record, "longitude", "lon", "lng"))
        if lat is not None and lon is not None:
            candidates.append((hypot(lat - latitude, lon - longitude), record))
    return min(candidates, key=lambda item: item[0])[1] if candidates else (records[0] if records else None)


def _mapping(client: IMDClient, latitude: float, longitude: float) -> dict[str, Any] | None:
    try:
        records = _records(client.get("cityforecast_mapping"))
    except IMDServiceError:
        return None
    return _nearest_record(records, latitude, longitude)


def _condition(code: Any) -> str:
    numeric = _number(code)
    return IMD_WEATHER_CODES.get(int(numeric), "Weather observation") if numeric is not None else "Weather observation"


def get_current_weather(latitude: float, longitude: float) -> dict[str, Any]:
    client = IMDClient()
    mapping = _mapping(client, latitude, longitude)
    # AWS/ARG uses a call sign (for example NDL), while current_wx uses a
    # station/WMO identifier (for example 42182). Prefer AWS for live values.
    if settings.imd_aws_id:
        record = _nearest_record(_records(client.get("aws_data", {"id": settings.imd_aws_id})), latitude, longitude)
    else:
        station_id = settings.imd_station_id or (_station_id(mapping) if mapping else None)
        params = {"id": station_id} if station_id else None
        record = _nearest_record(_records(client.get("current_wx", params)), latitude, longitude)
    if record is None:
        raise IMDServiceError("IMD returned no current observation")
    station_lat = _number(_value(record, "latitude", "lat")) or _number(_value(mapping or {}, "latitude", "lat")) or latitude
    station_lon = _number(_value(record, "longitude", "lon", "lng")) or _number(_value(mapping or {}, "longitude", "lon", "lng")) or longitude
    observed_date = _text(_value(record, "date", "date_of_observation"))
    observed_time = _text(_value(record, "time", "time_of_observation"))
    observed_at = "T".join(value for value in (observed_date, observed_time) if value) or None
    retrieved_at = datetime.now(timezone.utc).isoformat()
    rainfall = _number(_value(record, "last_24_hrs_rainfall", "rainfall", "rain"))
    weather_code = _value(record, "weather_code", "weathercode")
    return {
        "location": {"latitude": station_lat, "longitude": station_lon, "name": _text(_value(record, "station", "station_name"))},
        "current": {
            "temperature_c": _number(_value(record, "temperature", "curr_temp", "current_temperature")),
            "apparent_temperature_c": _number(_value(record, "feel_like", "feels_like", "apparent_temperature")),
            "humidity_percent": _number(_value(record, "humidity", "rh")),
            "precipitation_mm": rainfall, "rain_mm": rainfall,
            "wind_speed_kmh": _number(_value(record, "wind_speed", "wind_speed_kmh")),
            "wind_direction_degrees": _number(_value(record, "wind_direction", "wind_direction_degrees")),
            "weather_code": _number(weather_code), "condition": _condition(weather_code),
            "precipitation_probability_percent": None, "observed_at": observed_at,
        },
        "source": "IMD", "is_live": True, "retrieved_at": retrieved_at,
        "source_metadata": {"name": "India Meteorological Department", "kind": "official_meteorological_provider", "retrieved_at": retrieved_at, "official_warning_authority": True},
    }


def _imd_day(record: dict[str, Any], day: int) -> dict[str, Any] | None:
    prefix = "Todays" if day == 1 else f"Day_{day}"
    max_temp = _number(_value(record, f"{prefix}_Forecast_Max_Temp", f"{prefix}_Max_Temp"))
    min_temp = _number(_value(record, f"{prefix}_Forecast_Min_temp", f"{prefix}_Min_Temp"))
    description = _text(_value(record, "Todays_Forecast" if day == 1 else f"Day_{day}_Forecast"))
    if max_temp is None and min_temp is None and description is None:
        return None
    return {"temperature_max_c": max_temp, "temperature_min_c": min_temp, "condition": description or "IMD forecast", "weather_code": None, "precipitation_probability_percent": None, "precipitation_sum_mm": None}


def get_forecast(latitude: float, longitude: float, days: int = 7) -> dict[str, Any]:
    client = IMDClient()
    mapping = _mapping(client, latitude, longitude)
    params = {"id": settings.imd_city_id or _station_id(mapping)} if settings.imd_city_id or mapping else None
    record = _nearest_record(_records(client.get("cityforecastloc", params)), latitude, longitude)
    if record is None:
        raise IMDServiceError("IMD returned no city forecast")
    forecast: list[dict[str, Any]] = []
    for day in range(1, min(days, 7) + 1):
        item = _imd_day(record, day)
        if item:
            forecast.append({"date": (date.today() + timedelta(days=day - 1)).isoformat(), **item, "sunrise": None, "sunset": None})
    if not forecast:
        raise IMDServiceError("IMD returned an empty city forecast")
    retrieved_at = datetime.now(timezone.utc).isoformat()
    return {
        "location": {"latitude": latitude, "longitude": longitude, "name": _text(_value(record, "station_name", "station"))},
        "forecast": forecast, "hourly": [], "source": "IMD", "is_live": True, "retrieved_at": retrieved_at,
        "source_metadata": {"name": "India Meteorological Department", "kind": "official_meteorological_provider", "retrieved_at": retrieved_at, "official_warning_authority": True},
    }

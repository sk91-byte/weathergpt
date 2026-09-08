"""Weather API routes."""

import logging

from fastapi import APIRouter, HTTPException, Query

from backend.config import settings
from backend.services.imd_service import imd_access_configured
from backend.services.weather_service import WeatherServiceError, get_current_weather, get_weather_forecast


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/providers")
def weather_providers() -> dict:
    """Expose provider readiness without exposing credentials."""
    return {
        "india_primary": "IMD",
        "imd": {"enabled": settings.imd_enabled, "access_configured": imd_access_configured(), "aws_id_configured": bool(settings.imd_aws_id), "city_id_configured": bool(settings.imd_city_id), "district_id_configured": bool(settings.imd_district_id)},
        "global_fallback": "Open-Meteo",
        "historical": "Open-Meteo Archive",
    }


def _validate_coordinates(latitude: float, longitude: float) -> None:
    """Reject coordinates outside valid WGS84 ranges."""
    if not -90 <= latitude <= 90:
        raise HTTPException(status_code=400, detail="latitude must be between -90 and 90")
    if not -180 <= longitude <= 180:
        raise HTTPException(status_code=400, detail="longitude must be between -180 and 180")


@router.get("/current")
def current_weather(latitude: float, longitude: float) -> dict:
    """Get current weather from Open-Meteo."""
    _validate_coordinates(latitude, longitude)
    try:
        return get_current_weather(latitude, longitude)
    except WeatherServiceError as exc:
        logger.warning("Current weather request failed: %s", exc)
        raise HTTPException(status_code=503, detail="Weather provider is currently unavailable") from exc


@router.get("/forecast")
def weather_forecast(latitude: float, longitude: float, days: int = Query(default=7)) -> dict:
    """Get a daily and hourly forecast from Open-Meteo."""
    _validate_coordinates(latitude, longitude)
    if not 1 <= days <= 16:
        raise HTTPException(status_code=400, detail="days must be between 1 and 16")
    try:
        return get_weather_forecast(latitude, longitude, days)
    except WeatherServiceError as exc:
        logger.warning("Forecast request failed: %s", exc)
        raise HTTPException(status_code=503, detail="Weather provider is currently unavailable") from exc

"""Historical weather and climate endpoints."""

from datetime import date

from fastapi import APIRouter, HTTPException, Query

from backend.services.climate_service import get_historical_weather, get_rainfall_trend, get_temperature_trend

router = APIRouter(prefix="/climate", tags=["climate"])


def _coords(latitude: float, longitude: float) -> None:
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise HTTPException(400, "Invalid latitude or longitude")


def _run(operation):
    try:
        return operation()
    except (Exception,) as exc:
        raise HTTPException(503, "Historical weather provider is unavailable") from exc


@router.get("/history")
def history(latitude: float = Query(...), longitude: float = Query(...), start_date: date = Query(...), end_date: date = Query(...)) -> dict:
    _coords(latitude, longitude)
    if start_date > end_date: raise HTTPException(400, "start_date must be before end_date")
    return _run(lambda: get_historical_weather(latitude, longitude, start_date, end_date))


@router.get("/temperature-trend")
def temperature_trend(latitude: float = Query(...), longitude: float = Query(...), start_year: int = Query(...), end_year: int = Query(...)) -> dict:
    _coords(latitude, longitude)
    if start_year > end_year: raise HTTPException(400, "start_year must be before end_year")
    return _run(lambda: get_temperature_trend(latitude, longitude, start_year, end_year))


@router.get("/rainfall-trend")
def rainfall_trend(latitude: float = Query(...), longitude: float = Query(...), start_year: int = Query(...), end_year: int = Query(...)) -> dict:
    _coords(latitude, longitude)
    if start_year > end_year: raise HTTPException(400, "start_year must be before end_year")
    return _run(lambda: get_rainfall_trend(latitude, longitude, start_year, end_year))


@router.get("/summary")
def climate_summary(latitude: float = Query(...), longitude: float = Query(...), start_year: int = Query(...), end_year: int = Query(...)) -> dict:
    _coords(latitude, longitude)
    if start_year > end_year: raise HTTPException(400, "start_year must be before end_year")
    return _run(lambda: {"location": {"latitude": latitude, "longitude": longitude}, "temperature": get_temperature_trend(latitude, longitude, start_year, end_year), "rainfall": get_rainfall_trend(latitude, longitude, start_year, end_year)})

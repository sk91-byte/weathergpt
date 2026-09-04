"""GeoJSON weather-map endpoint."""

from fastapi import APIRouter, HTTPException, Query

from backend.services.gis_service import get_map_weather
from backend.services.decision_engine import analyze_decision
from backend.services.location_service import reverse_geocode
from backend.services.weather_service import get_weather_forecast, WeatherServiceError

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/weather")
def map_weather(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), zoom: int = Query(8, ge=1, le=20)) -> dict:
    try:
        return get_map_weather(latitude, longitude, zoom)
    except Exception as exc:
        raise HTTPException(503, "Weather map data is unavailable") from exc


@router.get("/risk")
def map_risk(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), zoom: int = Query(8, ge=1, le=20)) -> dict:
    try:
        forecast = get_weather_forecast(latitude, longitude, days=2)
        name = (reverse_geocode(latitude, longitude) or {}).get("name", "Selected location")
        decision = analyze_decision(forecast, latitude, longitude, location_name=name)
        return {"type": "FeatureCollection", "data_source": forecast["source"], "is_demo": False, "features": [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [longitude, latitude]}, "properties": {"kind": "risk", "risk_score": decision["risk_score"], "risk_level": decision["risk_level"], "risk_components": decision["risk_components"]}}], "map": {"zoom": zoom, "layers": ["risk", "rainfall", "temperature", "wind", "citizen_reports"]}}
    except WeatherServiceError as exc:
        raise HTTPException(503, "Weather risk map data is unavailable") from exc

"""Decision Intelligence API."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from backend.services.decision_engine import analyze_decision, get_decision
from backend.services.location_service import reverse_geocode
from backend.services.weather_service import WeatherServiceError, get_weather_forecast
from backend.services.change_detection import compare_forecasts

router = APIRouter(prefix="/decision", tags=["decision-intelligence"])


class DecisionRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    profile: str = Field(default="general_public", max_length=40)
    question: str | None = Field(default=None, max_length=500)
    days: int = Field(default=2, ge=1, le=7)

    @field_validator("profile")
    @classmethod
    def normalize_profile(cls, value: str) -> str:
        return value.strip().lower().replace(" ", "_") or "general_public"


class ChangeRequest(BaseModel):
    previous: dict[str, Any] | None = None
    latest: dict[str, Any]


def _create(request: DecisionRequest) -> dict[str, Any]:
    try:
        weather = get_weather_forecast(request.latitude, request.longitude, days=request.days)
    except WeatherServiceError as exc:
        raise HTTPException(status_code=503, detail="Weather forecast is currently unavailable") from exc
    if request.question and "tomorrow" in request.question.lower() and len(weather.get("hourly", [])) > 24:
        weather["hourly"] = weather["hourly"][24:48]
    location = reverse_geocode(request.latitude, request.longitude) or {"name": "Selected location"}
    return analyze_decision(weather, request.latitude, request.longitude, request.profile, request.question, location.get("name", "Selected location"))


@router.post("/analyze")
def analyze(request: DecisionRequest) -> dict[str, Any]:
    return _create(request)


@router.post("/advice")
def advice(request: DecisionRequest) -> dict[str, Any]:
    return _create(request)


@router.get("/risk")
def risk(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), profile: str = "general_public") -> dict[str, Any]:
    return _create(DecisionRequest(latitude=latitude, longitude=longitude, profile=profile))


@router.get("/timeline")
def timeline(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), days: int = Query(2, ge=1, le=7)) -> dict[str, Any]:
    return {"time_windows": _create(DecisionRequest(latitude=latitude, longitude=longitude, days=days))["time_windows"]}


@router.post("/changes")
def changes(request: ChangeRequest) -> dict[str, Any]:
    return compare_forecasts(request.previous, request.latest)


@router.get("/{decision_id}")
def decision(decision_id: str) -> dict[str, Any]:
    item = get_decision(decision_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Decision not found or expired")
    return item


@router.get("/{decision_id}/explanation")
def explanation(decision_id: str) -> dict[str, Any]:
    item = get_decision(decision_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Decision not found or expired")
    return {"decision_id": decision_id, "risk_components": item["risk_components"], "confidence": item["confidence"], "explanation": item["explanation"], "data_sources": item["data_sources"]}

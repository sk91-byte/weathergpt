"""Citizen weather-report foundation; reports are not official warnings."""

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from backend.services.json_data_service import add_report, nearby_reports
from backend.services.decision_engine import ground_observation_confidence

router = APIRouter(prefix="/reports", tags=["citizen-reports"])


class ReportRequest(BaseModel):
    report_type: Literal["waterlogging", "heavy_rain", "fallen_tree", "flooding", "lightning_damage", "strong_wind", "road_blockage"]
    description: str = Field(min_length=1, max_length=1000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    user_id: str | None = Field(default=None, max_length=120)
    image_url: str | None = Field(default=None, max_length=1000)


@router.post("")
def create_report(request: ReportRequest) -> dict[str, Any]:
    report = {"id": str(uuid4()), **request.model_dump(), "created_at": datetime.now(timezone.utc).isoformat(), "status": "unverified", "confidence": None, "is_verified": False}
    return add_report(report)


@router.get("/nearby")
def get_nearby_reports(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), radius_km: float = Query(25, gt=0, le=100)) -> list[dict[str, Any]]:
    return nearby_reports(latitude, longitude, radius_km)


@router.get("/nearby/summary")
def nearby_report_summary(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), radius_km: float = Query(25, gt=0, le=100)) -> dict[str, Any]:
    reports = nearby_reports(latitude, longitude, radius_km)
    return {"reports": reports, "ground_observation_confidence": ground_observation_confidence(reports)}

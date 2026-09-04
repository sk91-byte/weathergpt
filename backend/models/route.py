"""Normalized route request and response models."""

from typing import Any, Literal

from pydantic import BaseModel, Field


TravelMode = Literal["driving", "walking", "cycling", "transit"]


class RouteLocation(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    name: str = Field(min_length=1, max_length=160)


class RouteRequest(BaseModel):
    origin: RouteLocation
    destination: RouteLocation
    travel_mode: TravelMode = "driving"
    departure_time: str | None = None
    language: str | None = None
    conversation_id: str | None = Field(default=None, max_length=100)


class RouteWeatherRequest(BaseModel):
    route_id: str = Field(min_length=1, max_length=120)
    departure_time: str | None = None


class BestTimeRequest(BaseModel):
    route_id: str = Field(min_length=1, max_length=120)
    departure_times: list[str] | None = None


class RouteResponse(BaseModel):
    route_id: str
    origin: RouteLocation
    destination: RouteLocation
    travel_mode: TravelMode
    distance_km: float
    duration_minutes: int
    geometry: dict[str, Any]
    steps: list[dict[str, Any]]

"""Backend-only place search endpoints."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend.services.place_search_service import PlaceSearchError, autocomplete, nearby_places, place_details

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/nearby")
def nearby(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), radius_km: float = Query(5, gt=0, le=25), limit: int = Query(12, gt=0, le=20)) -> dict[str, list[dict[str, Any]]]:
    try:
        return {"places": nearby_places(latitude, longitude, radius_km, limit)}
    except PlaceSearchError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.get("/autocomplete")
def place_autocomplete(input: str = Query(..., min_length=2, max_length=160), latitude: float | None = Query(None, ge=-90, le=90), longitude: float | None = Query(None, ge=-180, le=180), session_id: str | None = Query(None, max_length=100)) -> dict[str, list[dict[str, Any]]]:
    try:
        return {"suggestions": autocomplete(input, latitude, longitude)}
    except PlaceSearchError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.get("/{place_id}")
def place(place_id: str) -> dict[str, Any]:
    try:
        value = place_details(place_id)
    except PlaceSearchError as exc:
        raise HTTPException(503, str(exc)) from exc
    if value is None:
        raise HTTPException(404, "Place was not found")
    return value

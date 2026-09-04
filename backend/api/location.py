"""Location utility routes."""

from fastapi import APIRouter, HTTPException, Query

from backend.services.location_service import reverse_geocode


router = APIRouter(prefix="/location", tags=["location"])


@router.get("/reverse")
def reverse_location(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> dict:
    """Reverse-geocode coordinates for development/testing."""
    location = reverse_geocode(latitude, longitude)
    if location is None:
        raise HTTPException(status_code=503, detail="Location provider is currently unavailable")
    return location

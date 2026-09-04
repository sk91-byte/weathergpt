"""Supported WeatherGPT response languages."""
from fastapi import APIRouter
from backend.services.language_service import languages

router = APIRouter(tags=["languages"])

@router.get("/languages")
def get_languages() -> dict:
    return {"languages": languages()}

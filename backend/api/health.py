"""Health-check route for the WeatherGPT API."""

from fastapi import APIRouter
from backend.services.llm_service import gemini_health, test_gemini
import asyncio
from backend.config import settings


def _database_status() -> str:
    if not settings.database_url:
        return "not_configured"
    try:
        from backend.database.database import check_database
    except ModuleNotFoundError:
        return "unavailable"
    return asyncio.run(check_database())


router = APIRouter()


@router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """Report whether the API process is healthy."""
    database = _database_status()
    return {"status": "healthy" if database in {"connected", "not_configured"} else "degraded", "service": "WeatherGPT API", "database": database}


@router.get("/health/ai", tags=["health"])
def ai_health() -> dict[str, object]:
    """Report Gemini configuration without making an external request."""
    return gemini_health()


@router.get("/health/diagnostic", tags=["health"])
def health_diagnostic() -> dict[str, object]:
    """Report overall system diagnostic status without leaking sensitive keys."""
    database_stat = _database_status()
    gemini_stat = gemini_health()
    return {
        "service": "WeatherGPT API",
        "status": "healthy",
        "gemini_configured": gemini_stat["configured"],
        "gemini_model": settings.gemini_model,
        "weather_provider_configured": True,
        "database_configured": database_stat == "connected",
        "database_status": database_stat,
    }


@router.get("/health/ai/test", tags=["health"])
def ai_health_test() -> dict[str, object]:
    """Explicitly test Gemini connectivity when requested by an operator."""
    return test_gemini()


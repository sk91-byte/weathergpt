"""Application entry point for the WeatherGPT API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.health import router as health_router
from backend.api.chat import router as chat_router
from backend.api.location import router as location_router
from backend.api.alerts import router as alerts_router
from backend.api.voice import router as voice_router
from backend.api.climate import router as climate_router
from backend.api.maps import router as maps_router
from backend.api.nwp import router as nwp_router
from backend.api.weather import router as weather_router
from backend.api.conversations import router as conversations_router
from backend.api.profile import router as profile_router
from backend.api.decision import router as decision_router
from backend.api.reports import router as reports_router
from backend.api.languages import router as languages_router
from backend.api.route import router as route_router
from backend.config import settings


app = FastAPI(
    title=settings.app_name + " API",
    description="Backend for an AI-powered conversational weather application.",
    version=settings.app_version,
)

# Allow local Flutter development and explicitly configured deployed frontends.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allowed_origins),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["root"])
def read_root() -> dict[str, str]:
    """Return a simple message confirming that the API is running."""
    return {"message": "Welcome to WeatherGPT", "status": "running"}


app.include_router(health_router)
app.include_router(weather_router)
app.include_router(chat_router)
app.include_router(location_router)
app.include_router(alerts_router)
app.include_router(voice_router)
app.include_router(climate_router)
app.include_router(maps_router)
app.include_router(nwp_router)
app.include_router(conversations_router)
app.include_router(profile_router)
app.include_router(decision_router)
app.include_router(reports_router)
app.include_router(languages_router)
app.include_router(route_router)

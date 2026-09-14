"""Application entry point for the WeatherGPT API."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from backend.config import settings

logger = logging.getLogger(__name__)

# --- Core routers (must succeed) ---
from backend.api.health import router as health_router  # noqa: E402
from backend.api.chat import router as chat_router  # noqa: E402
from backend.api.weather import router as weather_router  # noqa: E402
from backend.api.languages import router as languages_router  # noqa: E402
from backend.api.templates import router as templates_router  # noqa: E402

# --- Optional routers (load gracefully if dependencies are missing) ---
location_router = None
alerts_router = None
voice_router = None
climate_router = None
maps_router = None
nwp_router = None
conversations_router = None
profile_router = None
decision_router = None
reports_router = None
route_router = None
places_router = None
imd_video_router = None

try:
    from backend.api.location import router as location_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("location router unavailable: %s", exc)

try:
    from backend.api.alerts import router as alerts_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("alerts router unavailable: %s", exc)

try:
    from backend.api.voice import router as voice_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("voice router unavailable: %s", exc)

try:
    from backend.api.climate import router as climate_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("climate router unavailable: %s", exc)

try:
    from backend.api.maps import router as maps_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("maps router unavailable: %s", exc)

try:
    from backend.api.nwp import router as nwp_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("nwp router unavailable: %s", exc)

try:
    from backend.api.conversations import router as conversations_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("conversations router unavailable: %s", exc)

try:
    from backend.api.profile import router as profile_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("profile router unavailable: %s", exc)

try:
    from backend.api.decision import router as decision_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("decision router unavailable: %s", exc)

try:
    from backend.api.reports import router as reports_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("reports router unavailable: %s", exc)

try:
    from backend.api.route import router as route_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("route router unavailable: %s", exc)

try:
    from backend.api.places import router as places_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("places router unavailable: %s", exc)

try:
    from backend.api.imd_video import router as imd_video_router  # type: ignore[assignment]
except Exception as exc:
    logger.warning("IMD video router unavailable: %s", exc)


app = FastAPI(
    title=settings.app_name + " API",
    description="Backend for an AI-powered conversational weather application.",
    version=settings.app_version,
)

# JSON responses are often repetitive and compress very well.  This reduces
# transfer time for route/weather payloads without touching already-compressed
# assets; Starlette only compresses responses above this threshold.
app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=5)

# Allow local Flutter development and explicitly configured deployed frontends.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allowed_origins),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.workers\.dev|https://.*\.pages\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["root"])
def read_root() -> dict[str, str]:
    """Return a simple message confirming that the API is running."""
    return {"message": "Welcome to WeatherGPT", "status": "running"}


# Core routers always registered
app.include_router(health_router)
app.include_router(weather_router)
app.include_router(chat_router)
app.include_router(languages_router)
app.include_router(templates_router)

# Optional routers registered only if they loaded successfully
_optional_routers = [
    location_router, alerts_router, voice_router, climate_router,
    maps_router, nwp_router, conversations_router, profile_router,
    decision_router, reports_router, route_router, places_router,
    imd_video_router,
]
for _router in _optional_routers:
    if _router is not None:
        app.include_router(_router)

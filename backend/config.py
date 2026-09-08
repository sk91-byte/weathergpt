"""Small environment-based configuration for the WeatherGPT API."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


# Loading is optional: the application uses the defaults when .env is absent.
# Resolve it relative to this file so startup works from the project root.
load_dotenv(Path(__file__).resolve().parent / ".env")


def _as_bool(value: str) -> bool:
    """Convert common environment boolean values to a Python bool."""
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _clean_str(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().strip('"').strip("'")
    return cleaned if cleaned else None


def _optional_float(value: str | None) -> float | None:
    try:
        return float(value) if value else None
    except ValueError:
        return None


@dataclass(frozen=True)
class Settings:
    """Application settings loaded from environment variables."""

    app_name: str = os.getenv("APP_NAME", "WeatherGPT")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    debug: bool = _as_bool(os.getenv("DEBUG", "true"))
    gemini_api_key: str | None = _clean_str(os.getenv("GEMINI_API_KEY"))
    # Gemini currently rejects gemini-2.5-flash for some newer API keys. Keep
    # the model configurable, but use the fast currently available Flash model
    # as the safe default for new deployments.
    gemini_model: str = _clean_str(os.getenv("GEMINI_MODEL")) or "gemini-3.5-flash"
    gemini_search_grounding: bool = _as_bool(os.getenv("GEMINI_SEARCH_GROUNDING", "true"))
    weatherapi_key: str | None = os.getenv("WEATHERAPI_KEY") or None
    routing_provider_url: str = os.getenv("ROUTING_PROVIDER_URL", "https://router.project-osrm.org")
    routing_provider: str = os.getenv("ROUTING_PROVIDER", "osrm")
    serpapi_api_key: str | None = os.getenv("SERPAPI_API_KEY") or None
    imd_enabled: bool = _as_bool(os.getenv("IMD_ENABLED", "true"))
    imd_api_base_url: str = _clean_str(os.getenv("IMD_API_BASE_URL")) or "https://api.imd.gov.in/api/v1"
    imd_api_key: str | None = _clean_str(os.getenv("IMD_API_KEY"))
    imd_ip_whitelisted: bool = _as_bool(os.getenv("IMD_IP_WHITELISTED", "false"))
    imd_city_id: str | None = _clean_str(os.getenv("IMD_CITY_ID"))
    imd_station_id: str | None = _clean_str(os.getenv("IMD_STATION_ID"))
    imd_aws_id: str | None = _clean_str(os.getenv("IMD_AWS_ID"))
    imd_district_id: str | None = _clean_str(os.getenv("IMD_DISTRICT_ID"))
    imd_alert_latitude: float | None = _optional_float(os.getenv("IMD_ALERT_LATITUDE"))
    imd_alert_longitude: float | None = _optional_float(os.getenv("IMD_ALERT_LONGITUDE"))
    official_alerts_url: str | None = _clean_str(os.getenv("OFFICIAL_ALERTS_URL"))
    official_alerts_api_key: str | None = _clean_str(os.getenv("OFFICIAL_ALERTS_API_KEY"))
    database_url: str | None = os.getenv("DATABASE_URL") or None
    storage_mode: str = os.getenv("STORAGE_MODE", "postgres" if os.getenv("DATABASE_URL") else "json")
    json_data_file: str = os.getenv("JSON_DATA_FILE", str(Path(__file__).resolve().parent / "data" / "weathergpt.json"))
    cors_allowed_origins: tuple[str, ...] = tuple(
        item.strip().rstrip("/")
        for item in os.getenv(
            "CORS_ALLOWED_ORIGINS",
            "https://weathergpt.sakshamgautam10230.workers.dev,http://localhost:5173,http://localhost:3000",
        ).split(",")
        if item.strip()
    )


settings = Settings()

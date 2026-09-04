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


@dataclass(frozen=True)
class Settings:
    """Application settings loaded from environment variables."""

    app_name: str = os.getenv("APP_NAME", "WeatherGPT")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    debug: bool = _as_bool(os.getenv("DEBUG", "true"))
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or None
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    database_url: str | None = os.getenv("DATABASE_URL") or None
    storage_mode: str = os.getenv("STORAGE_MODE", "postgres" if os.getenv("DATABASE_URL") else "json")
    json_data_file: str = os.getenv("JSON_DATA_FILE", str(Path(__file__).resolve().parent / "data" / "weathergpt.json"))
    cors_allowed_origins: tuple[str, ...] = tuple(item.strip() for item in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if item.strip())


settings = Settings()

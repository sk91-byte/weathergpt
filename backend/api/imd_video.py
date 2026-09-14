"""IMD YouTube weather briefing endpoint."""
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from backend.services.imd_video_service import IMDBriefingError, create_briefing
from backend.services.language_service import is_supported_language

router = APIRouter(tags=["imd-video"])

class IMDBriefingRequest(BaseModel):
    user_location: str = Field(min_length=1, max_length=240)
    video_id: str | None = Field(default=None, max_length=32)
    persona: str = Field(default="A cautious, practical local travel guide", max_length=400)
    language: str = "en"

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        value = value.strip().lower()
        if not is_supported_language(value):
            raise ValueError("unsupported language code; use GET /languages")
        return value

@router.post("/get-weather-briefing")
def get_weather_briefing(request: IMDBriefingRequest) -> dict[str, Any]:
    try:
        return create_briefing(request.user_location, request.video_id, request.persona, request.language)
    except IMDBriefingError as exc:
        message = str(exc)
        status = 503 if any(term in message.lower() for term in ("configured", "temporarily", "api", "gemini")) else 422
        raise HTTPException(status_code=status, detail=message) from exc

"""Natural-language weather chat route."""

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator

from backend.services.chat_service import process_chat_message
from backend.services.llm_service import LLMServiceError, generate_follow_up_suggestions
from backend.services.weather_service import WeatherServiceError
from backend.services.language_service import get_language, is_supported_language


logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    """Request body accepted by POST /chat."""

    message: str = Field(max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location: str | None = Field(default=None, max_length=200)
    language: str | None = Field(default=None, description="Language code such as en, hi, or ta")
    conversation_id: str | None = Field(default=None, min_length=1, max_length=100)
    profile: str = Field(default="general_public", max_length=40)
    route_context: dict[str, Any] | None = None

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message must not be empty")
        return value.strip()

    @model_validator(mode="after")
    def coordinates_must_be_a_pair(self) -> "ChatRequest":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        return self

    @field_validator("language")
    @classmethod
    def language_must_be_supported(cls, value: str | None) -> str | None:
        if value is not None and not is_supported_language(value):
            raise ValueError("unsupported language code; use GET /languages")
        return value.lower().strip() if value else value


@router.post("/chat")
def chat(request: ChatRequest) -> JSONResponse:
    """Answer a basic weather question using the existing weather service."""
    try:
        data = process_chat_message(
            request.message,
            request.latitude,
            request.longitude,
            request.language,
            request.conversation_id,
            request.profile,
            request.route_context,
            request.location,
        )
        # Follow-up chips are generated from the completed answer so they can
        # reflect the selected persona, language, route, and current topic.
        # This is deliberately best-effort: a suggestions failure must never
        # turn a valid weather answer into a failed chat request.
        try:
            language_info = get_language(request.language)
            language_name = f"{language_info['name']} ({language_info['native_name']})"
            ai_suggestions = generate_follow_up_suggestions(
                request.message,
                str(data.get("response") or ""),
                language_name,
                request.profile,
                request.route_context,
            )
            if ai_suggestions:
                data["suggestions"] = ai_suggestions
                data["suggestions_source"] = "AI"
        except Exception as exc:
            logger.warning("AI follow-up generation failed; keeping local suggestions: %s", str(exc)[:300])
        json_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        return JSONResponse(
            content=json.loads(json_bytes.decode("utf-8")),
            media_type="application/json; charset=utf-8",
        )
    except LLMServiceError as exc:
        logger.warning("LLM chat request failed: %s", exc)
        detail = "Gemini API key is not configured" if "not configured" in str(exc) else "Gemini service is currently unavailable"
        raise HTTPException(status_code=503, detail=detail) from exc
    except WeatherServiceError as exc:
        logger.warning("Chat weather lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Weather assistant is currently unavailable") from exc


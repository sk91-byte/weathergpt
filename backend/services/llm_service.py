"""Gemini integration for WeatherGPT's language understanding and replies."""

import json
import logging
import time
from typing import Any, Callable, Literal

from google import genai
from google.genai import types
from pydantic import BaseModel

from backend.config import settings


logger = logging.getLogger(__name__)
_gemini_client: genai.Client | None = None


WEATHER_ASSISTANT_INSTRUCTIONS = """You are WeatherGPT, a warm, practical, conversational weather companion.
Use ONLY weather data supplied by the application. Never invent weather values, locations,
times, routes, warnings, or observations, and never claim to have accessed data that was
not supplied. Treat precipitation probabilities as probabilities, not certainties. Do
not create official warnings. Use Celsius and km/h unless the user explicitly requests
another unit.

Match the requested language naturally. English should sound friendly and human. Hindi
should use simple everyday Hindi, not difficult or overly formal words. Hinglish should
use natural Hindi written in the Roman alphabet. Do not mix English headings or provider
labels into a non-English answer unless a proper name or unit needs it.

Answer the user's actual question first, then add a short useful recommendation. Explain
what the data means in daily life: rain probability above 40% means suggest an umbrella
or raincoat and allow extra travel time; heat above 35 C means suggest water, sunscreen,
and avoiding the hottest hours; cold or strong wind means suggest warm layers. For
travel questions, discuss the supplied origin, destination, and route data separately;
never pretend to know conditions for an unsupplied route segment.

Remember the recent conversation context. Short follow-ups such as "why?", "what about
tomorrow?", "and for my office?", or their Hindi/Hinglish equivalents refer to the
previous topic unless the user clearly changes the location. Be empathetic and lightly
conversational, but keep every weather fact grounded in the supplied data. If supplied
data is insufficient, ask politely for the missing location or time in the user's language."""

QUERY_INSTRUCTIONS = WEATHER_ASSISTANT_INSTRUCTIONS + """
For query interpretation, set location_mode to named_location when a city is named,
current_location for near me, here, where I am, or in my area, and none otherwise.
Understand everyday Hindi and Roman-script Hinglish words such as baarish/barish,
chhata/chata, mausam, garmi, thand, bahar, chahiye, kyun, and batao. Preserve the
previous location for short follow-ups such as "aur batao", "kya le jaun", or "why?"
unless a new location is explicitly named. Never provide coordinates. Classify
unrelated questions as unknown."""


class WeatherQuery(BaseModel):
    intent: Literal["current_weather", "forecast", "unknown"]
    location: str | None = None
    location_mode: Literal["named_location", "current_location", "none"]
    time_reference: str
    request_type: Literal["temperature", "rain", "general_weather", "forecast", "unknown"]


class LLMServiceError(Exception):
    """Raised for missing Gemini configuration or provider failures."""


def classify_gemini_error(exc: Exception) -> str:
    """Map provider errors to safe, user-facing diagnostic categories."""
    text = str(exc).lower()
    if "api key" in text or "permission" in text or "unauthenticated" in text or "401" in text or "403" in text or "api_key" in text:
        return "authentication"
    if "quota" in text or "rate limit" in text or "429" in text or "resource_exhausted" in text:
        return "quota"
    if "model" in text and ("not found" in text or "invalid" in text):
        return "invalid_model"
    if "timeout" in text or "timed out" in text or "deadline" in text:
        return "timeout"
    if "network" in text or "connect" in text or "connection" in text or "dns" in text:
        return "network"
    return "provider_error"


def gemini_health() -> dict[str, Any]:
    """Return configuration status only; this does not make a paid/provider call."""
    if not settings.gemini_api_key:
        return {"service": "Gemini", "configured": False, "model": settings.gemini_model, "status": "unavailable", "error_type": "missing_key"}
    return {"service": "Gemini", "configured": True, "model": settings.gemini_model, "status": "configured"}


def _client() -> genai.Client:
    global _gemini_client
    if not settings.gemini_api_key:
        raise LLMServiceError("GEMINI_API_KEY is not configured")
    if _gemini_client is None:
        _gemini_client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=30000),
        )
    return _gemini_client


def _call_gemini_with_retry(func: Callable[[], Any], max_retries: int = 1) -> Any:
    """Execute a Gemini API call with 1 controlled retry for transient errors."""
    last_exc = None
    for attempt in range(max_retries + 1):
        try:
            start = time.perf_counter()
            res = func()
            elapsed = time.perf_counter() - start
            logger.info("Gemini call succeeded in %.2fs (attempt %d/%d)", elapsed, attempt + 1, max_retries + 1)
            return res
        except Exception as exc:
            elapsed = time.perf_counter() - start
            cat = classify_gemini_error(exc)
            # Keep the provider's status/message in Render logs.  Without the
            # final argument this format string itself raises a logging error,
            # hiding whether the failure is auth, quota, model, or schema.
            logger.warning(
                "Gemini call failed in %.2fs (attempt %d/%d, category=%s): %s - %s",
                elapsed,
                attempt + 1,
                max_retries + 1,
                cat,
                type(exc).__name__,
                str(exc)[:500],
            )
            last_exc = exc
            if cat in {"authentication", "quota", "invalid_model"}:
                break
            if attempt < max_retries:
                time.sleep(0.5)
    raise last_exc


def test_gemini() -> dict[str, Any]:
    """Explicit diagnostic probe, kept separate from normal health checks."""
    try:
        def _do_test():
            return _client().models.generate_content(
                model=settings.gemini_model,
                contents="Reply with OK",
                config=types.GenerateContentConfig(max_output_tokens=4),
            )
        response = _call_gemini_with_retry(_do_test, max_retries=0)
        return {**gemini_health(), "status": "available", "reply_received": bool(response.text)}
    except Exception as exc:
        return {**gemini_health(), "status": "unavailable", "error_type": classify_gemini_error(exc)}


def interpret_weather_query(message: str, conversation_context: dict[str, Any] | None = None) -> WeatherQuery:
    context_text = json.dumps(conversation_context or {}, ensure_ascii=False)
    try:
        def _do_interpret():
            return _client().models.generate_content(
                model=settings.gemini_model,
                contents=f"Recent conversation context: {context_text}\nUser message: {message}",
                config=types.GenerateContentConfig(
                    system_instruction=QUERY_INSTRUCTIONS,
                    response_mime_type="application/json",
                    response_schema=WeatherQuery,
                ),
            )
        response = _call_gemini_with_retry(_do_interpret, max_retries=1)
        if not response.text:
            raise LLMServiceError("Gemini returned no structured query")
        return WeatherQuery.model_validate_json(response.text)
    except LLMServiceError:
        raise
    except Exception as exc:
        logger.warning("Gemini query interpretation failed (%s): %s", classify_gemini_error(exc), type(exc).__name__)
        raise LLMServiceError("Gemini could not interpret the weather question") from exc


def generate_weather_response(
    original_question: str,
    query: WeatherQuery,
    weather_data: dict[str, Any],
    language: str = "English",
    conversation_context: dict[str, Any] | None = None,
    profile: str = "general_public",
) -> str:
    context_text = json.dumps(conversation_context or {}, ensure_ascii=False)
    prompt = (
        f"Answer in {language}. Be conversational and useful, not just a data dump. "
        f"The user's persona is {profile}; tailor examples and practical actions to that persona. "
        f"Use ONLY the JSON weather data below and do not add values that are absent. "
        f"Give the direct answer first, then practical advice and a brief reason. "
        f"If the question is a follow-up, use the recent context naturally.\n"
        f"Recent conversation context: {context_text}\n"
        f"User question: {original_question}\n"
        f"Interpreted request: {query.model_dump_json()}\n"
        f"Weather data: {json.dumps(weather_data, ensure_ascii=False)}"
    )
    try:
        def _do_generate():
            return _client().models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=WEATHER_ASSISTANT_INSTRUCTIONS),
            )
        response = _call_gemini_with_retry(_do_generate, max_retries=1)
        if not response.text:
            raise LLMServiceError("Gemini returned an empty weather response")
        return response.text.strip()
    except LLMServiceError:
        raise
    except Exception as exc:
        logger.warning("Gemini response generation failed (%s): %s", classify_gemini_error(exc), type(exc).__name__)
        raise LLMServiceError("Gemini could not generate a weather response") from exc




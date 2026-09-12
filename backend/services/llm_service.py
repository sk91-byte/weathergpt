"""Gemini integration for WeatherGPT's language understanding and replies."""

import json
import logging
import threading
import time
from typing import Any, Callable, Literal

import requests

from google import genai
from google.genai import types
from pydantic import BaseModel

from backend.config import settings


logger = logging.getLogger(__name__)
_gemini_client: genai.Client | None = None
_gemini_state_lock = threading.Lock()
_gemini_failures = 0
_gemini_open_until = 0.0
GEMINI_FAILURE_THRESHOLD = 2
GEMINI_COOLDOWN_SECONDS = 30.0


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
For Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani,
Malayalam, Manipuri, Marathi, Maithili, Nepali, Odia, Punjabi, Sanskrit, Santhali,
Sindhi, Tamil, Telugu, and Urdu, answer in the requested language's normal native
script. Preserve place names, numbers, units, and official alert names when needed,
but do not silently switch to English. Keep the wording simple enough for a general
public user. Do not use code fences or return Python/JSON snippets in a normal
weather answer; use short paragraphs or simple bullets instead.

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
unless a new location is explicitly named. Never provide coordinates. Classify a
normal conversation as general_chat and questions about WeatherGPT features as
app_help. Use unknown only when the message cannot be answered helpfully."""


class WeatherQuery(BaseModel):
    intent: Literal["current_weather", "forecast", "general_chat", "app_help", "unknown"]
    location: str | None = None
    location_mode: Literal["named_location", "current_location", "none"]
    time_reference: str
    request_type: Literal["temperature", "rain", "general_weather", "forecast", "general_chat", "app_help", "unknown"]


class LLMServiceError(Exception):
    """Raised for missing Gemini configuration or provider failures."""


def groq_health() -> dict[str, Any]:
    if not isinstance(settings.groq_api_key, str) or not settings.groq_api_key.strip():
        return {"service": "Groq", "configured": False, "models": list(settings.groq_models), "status": "unavailable", "error_type": "missing_key"}
    return {"service": "Groq", "configured": True, "models": list(settings.groq_models), "status": "configured"}


def test_groq() -> dict[str, Any]:
    try:
        reply = _groq_chat("Reply with the single word OK.", "You are a connectivity test. Reply only with OK.", max_output_tokens=8)
        return {**groq_health(), "status": "available", "reply_received": bool(reply)}
    except Exception as exc:
        return {**groq_health(), "status": "unavailable", "error_type": type(exc).__name__}


def _groq_chat(prompt: str, system_instruction: str, max_output_tokens: int = 600, json_mode: bool = False) -> str:
    """Call Groq models in order; expired/unavailable models fall through."""
    if not isinstance(settings.groq_api_key, str) or not settings.groq_api_key.strip():
        raise LLMServiceError("GROQ_API_KEY is not configured")
    headers = {"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"}
    last_error: Exception | None = None
    for model in settings.groq_models:
        try:
            body: dict[str, Any] = {
                "model": model,
                "messages": [{"role": "system", "content": system_instruction}, {"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": max_output_tokens,
            }
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            response = requests.post(f"{settings.groq_base_url.rstrip('/')}/chat/completions", headers=headers, json=body, timeout=(3, 12))
            if response.status_code >= 400:
                raise RuntimeError(f"Groq {model} returned HTTP {response.status_code}: {response.text[:300]}")
            payload = response.json()
            text = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
            if not isinstance(text, str) or not text.strip():
                raise RuntimeError(f"Groq {model} returned an empty response")
            logger.info("Groq call succeeded with %s", model)
            return text.strip()
        except Exception as exc:
            last_error = exc
            logger.warning("Groq model %s failed; trying next model: %s", model, str(exc)[:300])
    raise LLMServiceError("All configured Groq models are unavailable") from last_error


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
            # A free-tier provider should fail fast enough for the deterministic
            # weather fallback to answer instead of holding a Render worker.
            http_options=types.HttpOptions(timeout=12000),
        )
    return _gemini_client


def _response_text(response: Any) -> str:
    """Read text across google-genai SDK response and JSON-like shapes.

    The SDK has returned both typed objects and dictionary-like values across
    versions. An empty ``response.text`` does not necessarily mean that the
    provider failed; the text may still be nested under candidates/content/
    parts. Keep extraction defensive so chat does not silently fall back when
    Gemini actually returned a normal candidate.
    """
    def read_value(value: Any, key: str) -> Any:
        if isinstance(value, dict):
            return value.get(key)
        return getattr(value, key, None)

    direct = read_value(response, "text") or read_value(response, "output_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    pieces: list[str] = []
    candidates = read_value(response, "candidates") or []
    if isinstance(candidates, dict):
        candidates = [candidates]
    for candidate in candidates:
        content = read_value(candidate, "content")
        parts = read_value(content, "parts") if content is not None else None
        if isinstance(parts, dict):
            parts = [parts]
        for part in parts or []:
            value = read_value(part, "text")
            if isinstance(value, str) and value.strip():
                pieces.append(value.strip())
    return "\n".join(pieces).strip()


def _clean_generated_text(value: str) -> str:
    """Remove accidental Markdown code fences from user-facing prose."""
    text = value.strip()
    if text.startswith("```"):
        lines = text.splitlines()[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _call_gemini_with_retry(func: Callable[[], Any], max_retries: int = 1) -> Any:
    """Call Gemini with a small circuit breaker and no retry storm."""
    global _gemini_failures, _gemini_open_until
    now = time.monotonic()
    with _gemini_state_lock:
        if _gemini_open_until > now:
            raise LLMServiceError("Gemini circuit breaker is open")
        if _gemini_open_until:
            _gemini_open_until = 0.0
            _gemini_failures = 0
    last_exc = None
    for attempt in range(max_retries + 1):
        try:
            start = time.perf_counter()
            res = func()
            elapsed = time.perf_counter() - start
            with _gemini_state_lock:
                _gemini_failures = 0
                _gemini_open_until = 0.0
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
            with _gemini_state_lock:
                _gemini_failures += 1
                if _gemini_failures >= GEMINI_FAILURE_THRESHOLD:
                    _gemini_open_until = time.monotonic() + GEMINI_COOLDOWN_SECONDS
            if cat in {"authentication", "quota", "invalid_model"}:
                break
            # Retrying a slow free-tier request doubles the user-visible delay.
            if cat in {"timeout", "network"}:
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
                contents="Reply with the single word OK. Do not reason aloud.",
                config=types.GenerateContentConfig(max_output_tokens=32),
            )
        response = _call_gemini_with_retry(_do_test, max_retries=0)
        reply_received = bool(_response_text(response))
        candidates = getattr(response, "candidates", None) or []
        first_candidate = candidates[0] if candidates else None
        finish_reason = getattr(first_candidate, "finish_reason", None) if first_candidate else None
        prompt_feedback = getattr(response, "prompt_feedback", None)
        block_reason = getattr(prompt_feedback, "block_reason", None) if prompt_feedback else None
        return {
            **gemini_health(),
            "status": "available" if reply_received else "unavailable",
            "reply_received": reply_received,
            "candidate_count": len(candidates),
            "finish_reason": str(finish_reason) if finish_reason else None,
            "prompt_block_reason": str(block_reason) if block_reason else None,
            **({} if reply_received else {"error_type": "empty_response"}),
        }
    except Exception as exc:
        return {**gemini_health(), "status": "unavailable", "error_type": classify_gemini_error(exc)}


def interpret_weather_query(message: str, conversation_context: dict[str, Any] | None = None) -> WeatherQuery:
    context_text = json.dumps(conversation_context or {}, ensure_ascii=False)
    if isinstance(settings.groq_api_key, str) and settings.groq_api_key.strip():
        try:
            raw = _groq_chat(
                f"Return ONLY JSON with keys intent, location, location_mode, time_reference, request_type. Use null for unknown location.\nRecent conversation context: {context_text}\nUser message: {message}",
                QUERY_INSTRUCTIONS, max_output_tokens=220, json_mode=True,
            )
            return WeatherQuery.model_validate_json(raw)
        except Exception as exc:
            logger.warning("Groq query interpretation failed; falling back to Gemini: %s", str(exc)[:300])
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
        raw_response = _response_text(response)
        if not raw_response:
            raise LLMServiceError("Gemini returned no structured query")
        return WeatherQuery.model_validate_json(raw_response)
    except LLMServiceError:
        raise
    except Exception as exc:
        # Some Gemini model/API combinations reject response_schema even though
        # normal generation works. Retry with plain JSON instructions.
        logger.warning(
            "Structured Gemini query failed (%s): %s - %s",
            classify_gemini_error(exc), type(exc).__name__, str(exc)[:500],
        )
        try:
            fallback_prompt = (
                f"{QUERY_INSTRUCTIONS}\nReturn ONLY one valid JSON object with exactly these keys: "
                "intent, location, location_mode, time_reference, request_type. "
                "Use null for an unknown location.\n"
                f"Recent conversation context: {context_text}\nUser message: {message}"
            )
            response = _call_gemini_with_retry(
                lambda: _client().models.generate_content(
                    model=settings.gemini_model,
                    contents=fallback_prompt,
                    config=types.GenerateContentConfig(max_output_tokens=200),
                ),
                max_retries=0,
            )
            raw = _response_text(response)
            if raw.startswith("```"):
                raw = raw.strip("`").replace("json", "", 1).strip()
            return WeatherQuery.model_validate_json(raw)
        except Exception as fallback_exc:
            logger.warning(
                "Gemini query interpretation fallback failed (%s): %s - %s",
                classify_gemini_error(fallback_exc), type(fallback_exc).__name__, str(fallback_exc)[:500],
            )
            raise LLMServiceError("Gemini could not interpret the weather question") from fallback_exc


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
    if isinstance(settings.groq_api_key, str) and settings.groq_api_key.strip():
        try:
            return _clean_generated_text(_groq_chat(prompt, WEATHER_ASSISTANT_INSTRUCTIONS, max_output_tokens=600))
        except Exception as exc:
            logger.warning("Groq weather response failed; falling back to Gemini: %s", str(exc)[:300])
    try:
        def _do_generate():
            return _client().models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=WEATHER_ASSISTANT_INSTRUCTIONS),
            )
        response = _call_gemini_with_retry(_do_generate, max_retries=1)
        response_text = _clean_generated_text(_response_text(response))
        if not response_text:
            raise LLMServiceError("Gemini returned an empty weather response")
        return response_text
    except LLMServiceError:
        raise
    except Exception as exc:
        logger.warning("Gemini response generation failed (%s): %s", classify_gemini_error(exc), type(exc).__name__)
        raise LLMServiceError("Gemini could not generate a weather response") from exc


def generate_decision_response(
    original_question: str,
    weather_data: dict[str, Any],
    decision: dict[str, Any],
    language: str = "English",
    conversation_context: dict[str, Any] | None = None,
    profile: str = "general_public",
) -> str:
    """Explain a deterministic decision result without changing its facts.

    Risk scores, evidence and actions are calculated by the application. Gemini
    is only the conversational rendering layer for this structured result.
    """
    prompt = (
        f"Answer in {language}. The user's persona is {profile}. "
        "Use ONLY the supplied weather and decision JSON. Do not invent values, "
        "warnings, locations, times, route conditions, or official orders. "
        "Give the direct answer first, then the main evidence and 1–3 practical "
        "actions. Clearly say when confidence or data is unavailable. Call the "
        "result advisory decision support, not a guarantee of safety. Keep the "
        "answer concise and natural; do not use markdown tables or code fences.\n"
        f"Recent conversation context: {json.dumps(conversation_context or {}, ensure_ascii=False)}\n"
        f"User question: {original_question}\n"
        f"Weather data: {json.dumps(weather_data, ensure_ascii=False)}\n"
        f"Deterministic decision result: {json.dumps(decision, ensure_ascii=False)}"
    )
    if isinstance(settings.groq_api_key, str) and settings.groq_api_key.strip():
        try:
            return _clean_generated_text(_groq_chat(prompt, WEATHER_ASSISTANT_INSTRUCTIONS, max_output_tokens=450))
        except Exception as exc:
            logger.warning("Groq decision response failed; falling back to Gemini: %s", str(exc)[:300])
    try:
        response = _call_gemini_with_retry(
            lambda: _client().models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=WEATHER_ASSISTANT_INSTRUCTIONS,
                    max_output_tokens=450,
                ),
            ),
            max_retries=1,
        )
        response_text = _clean_generated_text(_response_text(response))
        if not response_text:
            raise LLMServiceError("Gemini returned an empty decision response")
        return response_text
    except LLMServiceError:
        raise
    except Exception as exc:
        logger.warning("Gemini decision response failed (%s): %s", classify_gemini_error(exc), type(exc).__name__)
        raise LLMServiceError("Gemini could not generate a decision response") from exc


def generate_general_response(
    question: str,
    language: str = "English",
    conversation_context: dict[str, Any] | None = None,
    app_help: bool = False,
    use_search: bool = False,
) -> str:
    """Answer non-weather chat while keeping weather claims data-grounded."""
    context_text = json.dumps(conversation_context or {}, ensure_ascii=False)
    app_context = (
        "WeatherGPT features: live current weather and forecasts, current-location weather, "
        "multilingual text and voice chat, live map, route weather and safety analysis, "
        "weather suggestions, and follow-up conversations. Explain how to use these features "
        "when the user asks about the app."
        if app_help else "Answer ordinary conversation naturally and briefly."
    )
    prompt = (
        f"Answer in {language}. You are WeatherGPT, a friendly conversational assistant. "
        f"{app_context} Do not invent live weather values. If the user asks for weather facts, "
        "say that a weather lookup is needed instead of guessing. Remember the recent context. "
        "Do not add markdown code fences.\n"
        f"Recent conversation context: {context_text}\nUser question: {question}"
    )
    if isinstance(settings.groq_api_key, str) and settings.groq_api_key.strip():
        try:
            return _clean_generated_text(_groq_chat(prompt, WEATHER_ASSISTANT_INSTRUCTIONS, max_output_tokens=400))
        except Exception as exc:
            logger.warning("Groq general response failed; falling back to Gemini: %s", str(exc)[:300])
    try:
        config = types.GenerateContentConfig(max_output_tokens=400)
        if use_search and settings.gemini_search_grounding:
            config.tools = [types.Tool(google_search=types.GoogleSearch())]
        response = _call_gemini_with_retry(
            lambda: _client().models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=config,
            ),
            max_retries=1,
        )
        response_text = _clean_generated_text(_response_text(response))
        if not response_text:
            raise LLMServiceError("Gemini returned an empty conversational response")
        return response_text
    except LLMServiceError:
        raise
    except Exception as exc:
        logger.warning("Gemini general response failed (%s): %s", classify_gemini_error(exc), type(exc).__name__)
        raise LLMServiceError("Gemini could not answer the conversation") from exc


def generate_follow_up_suggestions(
    question: str,
    answer: str,
    language: str = "English",
    profile: str = "general_public",
    route_context: dict[str, Any] | None = None,
) -> list[str]:
    """Generate short clickable follow-ups in the same language as the answer."""
    prompt = (
        f"Create exactly 4 short clickable follow-up questions in {language}. "
        "Use the requested language and its normal native script; do not use English "
        "unless the requested language is English or Hinglish. Questions must refer "
        "to the weather topic just answered and be useful for this user's persona. "
        "Return ONLY a valid JSON array of four strings, with no markdown or explanation.\n"
        f"Persona: {profile}\nRoute context: {json.dumps(route_context or {}, ensure_ascii=False)}\n"
        f"User question: {question}\nWeatherGPT answer: {answer}"
    )
    if isinstance(settings.groq_api_key, str) and settings.groq_api_key.strip():
        try:
            raw = _groq_chat(prompt, WEATHER_ASSISTANT_INSTRUCTIONS, max_output_tokens=220, json_mode=True)
            values = json.loads(raw)
            if isinstance(values, dict):
                values = values.get("questions", [])
            if isinstance(values, list) and len(values) == 4 and all(isinstance(item, str) and item.strip() for item in values):
                return [item.strip() for item in values]
        except Exception as exc:
            logger.warning("Groq follow-up generation failed; falling back to Gemini: %s", str(exc)[:300])
    try:
        response = _call_gemini_with_retry(
            lambda: _client().models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(max_output_tokens=220),
            ),
            max_retries=0,
        )
        raw = _response_text(response).strip()
        if raw.startswith("```"):
            raw = raw.strip("`").replace("json", "", 1).strip()
        values = json.loads(raw)
        if not isinstance(values, list) or len(values) != 4 or not all(isinstance(item, str) and item.strip() for item in values):
            raise LLMServiceError("Gemini returned invalid suggestion data")
        return [item.strip() for item in values]
    except Exception as exc:
        logger.warning("Gemini suggestion generation failed (%s): %s", classify_gemini_error(exc), type(exc).__name__)
        raise LLMServiceError("Gemini could not generate suggestions") from exc




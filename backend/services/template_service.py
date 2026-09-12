"""Approved, data-driven question templates for fast WeatherGPT replies.

Templates contain wording and required fields only.  Live values are fetched
by the normal weather/route services at request time and are never persisted in
this catalogue.
"""

import json
import re
import asyncio
from functools import lru_cache
from pathlib import Path
from typing import Any


TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "data" / "response_templates.json"


@lru_cache(maxsize=1)
def _templates() -> tuple[dict[str, Any], ...]:
    try:
        value = json.loads(TEMPLATE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return ()
    return tuple(item for item in value if isinstance(item, dict) and item.get("approval_status") == "approved")


def _tokens(value: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z\u0900-\u097F\u0A80-\u0AFF]+", value.lower()))


def _persona_alias(persona: str | None) -> str:
    return {
        "general_public": "citizen", "citizen": "citizen",
        "student": "citizen", "commuter": "traveller",
    }.get((persona or "citizen").lower(), (persona or "citizen").lower())


def canonical_intent(intent: str | None) -> str:
    """Map parser request types to stable template intents."""
    return {
        "rain": "rain_forecast",
        "forecast": "rain_forecast",
        "temperature": "current_temperature",
        "current_weather": "current_temperature",
        "general_weather": "current_temperature",
        "umbrella": "umbrella_need",
        "irrigation": "irrigation_advice",
        "spraying": "spraying_advice",
    }.get((intent or "").lower(), intent or "")


def match_template(message: str, persona: str, language: str, has_route: bool = False) -> dict[str, Any] | None:
    """Return a conservative match; unrelated questions go to Gemini."""
    message_tokens = _tokens(message)
    wanted_persona = _persona_alias(persona)
    wanted_language = "en" if language == "hinglish" else language
    best: tuple[int, dict[str, Any]] | None = None
    for template in _templates():
        if _persona_alias(str(template.get("persona"))) != wanted_persona:
            continue
        template_language = str(template.get("language", "en"))
        if template_language != wanted_language:
            continue
        if bool(template.get("requires_route")) and not has_route:
            continue
        examples = [str(item).lower() for item in template.get("example_questions", [])]
        normalised = message.strip().lower()
        score = 100 if normalised in examples else 0
        keywords = _tokens(" ".join(str(item) for item in template.get("matching_keywords", [])))
        overlap = len(message_tokens & keywords)
        score += overlap * 12
        # A template needs a strong signal, not a single broad word such as
        # "weather".  This avoids returning the wrong cached-style answer.
        if score < 24 or (overlap < 2 and score < 100):
            continue
        if best is None or score > best[0]:
            best = (score, template)
    return best[1] if best else None


def match_template_for_intent(intent: str | None, persona: str, language: str, has_route: bool = False) -> dict[str, Any] | None:
    """Reuse the same canonical intent when a localized wording has no keyword overlap."""
    intent = canonical_intent(intent)
    if not intent:
        return None
    wanted_persona = _persona_alias(persona)
    wanted_language = "en" if language == "hinglish" else language
    candidates = [
        item for item in _templates()
        if _persona_alias(str(item.get("persona"))) == wanted_persona
        and str(item.get("intent")) == intent
        and (not bool(item.get("requires_route")) or has_route)
    ]
    for item in candidates:
        if str(item.get("language", "en")) == wanted_language:
            return item
    # English is the canonical fallback. Local instant renderers still return
    # the selected language, and live values are filled at request time.
    return next((item for item in candidates if str(item.get("language", "en")) == "en"), None)


def recommended_questions(persona: str, language: str, has_route: bool = False, limit: int = 4, intent: str | None = None) -> list[str]:
    wanted_persona = _persona_alias(persona)
    wanted_language = "en" if language == "hinglish" else language
    values: list[str] = []
    templates = list(_templates())
    if intent:
        same_intent = [item for item in templates if str(item.get("intent")) == intent]
        templates = same_intent + [item for item in templates if item not in same_intent]
    for template in templates:
        if _persona_alias(str(template.get("persona"))) != wanted_persona:
            continue
        if str(template.get("language", "en")) != wanted_language:
            continue
        if bool(template.get("requires_route")) and not has_route:
            continue
        questions = template.get("recommended_questions") or template.get("example_questions") or []
        if questions:
            values.append(str(questions[0]))
        if len(values) >= limit:
            break
    return values


def template_count() -> int:
    return len(_templates())


def save_pending_candidate(*, question: str, answer: str, persona: str, language: str, intent: str, required_live_data: list[str], follow_up_questions: list[str]) -> dict[str, Any]:
    """Persist a reviewable template draft without exposing it as approved."""
    candidate = {
        "question": question,
        "template_id": f"pending_{intent}_{language}",
        "persona": _persona_alias(persona),
        "language": "en" if language == "hinglish" else language,
        "intent": intent,
        "example_questions": [question],
        "required_live_data": required_live_data,
        "draft_answer": answer,
        "recommended_questions": follow_up_questions[:4],
        "answer_template": None,
        "review_note": "Convert the draft answer into placeholders before approval; never reuse its live values.",
    }
    from backend.config import settings
    if settings.database_url and settings.storage_mode.lower() == "postgres":
        from backend.database.database import SessionFactory
        from backend.repositories.template_repository import save_candidate

        async def operation() -> dict[str, Any]:
            async with SessionFactory() as session:
                return await save_candidate(session, candidate)
        return asyncio.run(operation())
    from backend.services.json_data_service import save_template_candidate
    return save_template_candidate(candidate)

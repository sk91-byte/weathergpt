"""User-facing advisory composition from deterministic decision results."""

from typing import Any


def umbrella_advice(forecast: dict) -> str:
    probability = forecast.get("precipitation_probability_percent")
    if probability is None: return "I do not have enough forecast information to advise you."
    return "Consider carrying an umbrella." if probability >= 40 else "An umbrella may not be necessary based on the supplied forecast."


def build_advisory(risk_components: dict[str, dict[str, Any]], profile: str) -> dict[str, Any]:
    """Return a presentation-neutral advisory; callers can translate it later."""
    from backend.services.impact_engine import impacts_and_actions
    return impacts_and_actions(profile, risk_components)

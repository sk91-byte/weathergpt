"""Weather Decision Intelligence: weather -> risk -> impact -> action."""

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from backend.services.confidence_engine import calculate_confidence
from backend.services.impact_engine import impacts_and_actions
from backend.services.risk_engine import calculate_risks, time_windows
from backend.services.forecast_consensus import summarize_consensus
from backend.services.json_data_service import get_saved_decision, save_decision
from backend.services.advisory_service import build_advisory


_DECISIONS: dict[str, dict[str, Any]] = {}


def analyze_decision(weather: dict[str, Any], latitude: float, longitude: float, profile: str = "general_public", question: str | None = None, location_name: str = "Selected location") -> dict[str, Any]:
    hours = weather.get("hourly", [])
    risks = calculate_risks(hours)
    overall = risks["overall"]
    windows = time_windows(hours)
    peak = max(windows, key=lambda item: item["risk_score"]) if windows else None
    impact = build_advisory(risks, profile)
    confidence = calculate_confidence(hours, horizon_days=1, source_count=1)
    decision_id = str(uuid4())
    result = {
        "decision_id": decision_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "location": {"name": location_name, "latitude": latitude, "longitude": longitude},
        "question": question,
        "risk_score": overall.get("score"),
        "risk_level": overall.get("level"),
        "risk_components": risks,
        "key_risks": [{"category": name, **value} for name, value in risks.items() if name != "overall" and value.get("score") is not None and value.get("score", 0) >= 40],
        "time_windows": windows[:48],
        "peak_risk_window": peak,
        "impact": impact,
        "recommended_actions": impact["recommended_actions"],
        "what_to_carry": impact.get("what_to_carry", []),
        "what_to_avoid": impact.get("what_to_avoid", []),
        "precautions": impact.get("precautions", []),
        "why": impact.get("why", []),
        "confidence": confidence,
        "explanation": {"summary": "Risk is calculated from the supplied forecast; no risk value is invented by Gemini.", "factors": [factor for name, value in risks.items() if name != "overall" for factor in value.get("evidence", [])]},
        "data_sources": [{
            "name": weather.get("source", "Unknown"),
            "type": "forecast",
            "retrieved_at": weather.get("retrieved_at") or datetime.now(timezone.utc).isoformat(),
            "metadata": weather.get("source_metadata", {}),
        }],
        "multi_model_consensus": summarize_consensus([{"name": weather.get("source", "Unknown"), "rain_signal": "configured_single_source"}]),
    }
    _DECISIONS[decision_id] = result
    save_decision(result)
    return result


def get_decision(decision_id: str) -> dict[str, Any] | None:
    return _DECISIONS.get(decision_id) or get_saved_decision(decision_id)


def ground_observation_confidence(reports: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate nearby reports as an observation signal, never as official truth."""
    if not reports:
        return {"score": 0, "level": "none", "message": "No recent user reports are available."}
    count = len(reports)
    score = min(100, count * 25)
    return {"score": score, "level": "high" if count >= 4 else "medium" if count >= 2 else "low", "message": f"Multiple recent user reports indicate possible {reports[0].get('report_type', 'weather conditions')}." if count > 1 else "One recent user report is available; it is unverified."}

"""Conservative profile-specific impacts and actions."""

from typing import Any


PROFILES = {"general_public", "traveller", "farmer", "student", "researcher", "outdoor_worker", "construction_worker", "delivery_worker", "commuter", "event_organizer", "aviation", "marine", "smart_city", "worker"}


def impacts_and_actions(profile: str, risks: dict[str, dict[str, Any]]) -> dict[str, Any]:
    profile = profile if profile in PROFILES else "general_public"
    actions: list[str] = []
    impacts: list[str] = []
    carry: list[str] = []
    avoid: list[str] = []
    precautions: list[str] = ["Check official local weather alerts before making high-impact plans."]
    rain = risks.get("rain", {}).get("score") or 0
    flood = risks.get("flood", {}).get("score") or 0
    lightning = risks.get("lightning", {}).get("score") or 0
    wind = risks.get("wind", {}).get("score") or 0
    heat = risks.get("heat", {}).get("score") or 0
    if rain >= 40:
        actions.append("Carry an umbrella and allow extra time for wet roads.")
        carry.append("Umbrella or rain protection")
        precautions.append("Use extra caution on wet or slippery roads.")
        impacts.append("Rain may disrupt outdoor movement.")
    if flood >= 60:
        actions.append("Expect waterlogging in vulnerable areas; check official local updates.")
        avoid.append("Waterlogged roads and underpasses")
    if lightning >= 60:
        actions.append("Avoid exposed outdoor areas during thunderstorms.")
        avoid.append("Open fields, isolated trees, and exposed outdoor areas")
    if wind >= 60:
        actions.append("Use caution near unsecured structures and loose objects.")
        avoid.append("Loose objects and unsecured structures")
    if heat >= 60:
        actions.append("Limit prolonged outdoor exposure and take regular water breaks.")
        carry.append("Water and sun protection")
        avoid.append("Prolonged exposure during the hottest period")
    if profile in {"traveller", "commuter", "delivery_worker"} and rain >= 50:
        actions.append("Consider travelling before the highest-risk period if possible.")
        impacts.append("Travel time may increase during the wettest period.")
    if profile in {"outdoor_worker", "construction_worker", "worker"} and (rain >= 50 or lightning >= 60 or heat >= 60):
        actions.append("Review outdoor work timing with your responsible supervisor.")
        impacts.append("Outdoor work may be affected during elevated-risk periods.")
    if profile == "farmer" and rain >= 40:
        actions.append("Review irrigation timing against the expected rainfall and your crop conditions.")
    if profile in {"aviation", "marine"}:
        actions.append("Use this only as decision support; follow official operational guidance.")
    if profile == "researcher":
        actions.append("Review the source, retrieval time, and uncertainty before using this information in analysis.")
    if not actions:
        precautions = ["Normal outdoor plans appear reasonable based on the available forecast; continue monitoring updates."]
    why = [
        f"{name.replace('_', ' ').title()} risk is {value.get('score')}/100 ({value.get('level')})."
        for name, value in risks.items() if name != "overall" and value.get("score") is not None and value.get("score", 0) >= 40
    ]
    return {
        "profile": profile,
        "impacts": impacts or ["No material weather impact identified from available inputs."],
        "recommended_actions": actions or ["Conditions appear lower-risk during this period based on the available forecast."],
        "what_to_carry": carry,
        "what_to_avoid": avoid,
        "precautions": precautions,
        "why": why or ["No individual risk signal crossed the advisory threshold."],
    }

"""Conservative specialized advisory helpers built from decision results."""

from typing import Any


def travel_advice(decision: dict[str, Any]) -> dict[str, Any]:
    return {"type": "travel", "risk": decision.get("risk_level"), "recommended_time_windows": [decision["peak_risk_window"]] if decision.get("peak_risk_window") else [], "recommendation": "Consider travelling outside the highest-risk period if possible. Check official road, rail, or flight information before departure."}


def outdoor_work_advice(decision: dict[str, Any]) -> dict[str, Any]:
    return {"type": "outdoor_work", "risk": decision.get("risk_level"), "avoid_windows": [decision["peak_risk_window"]] if decision.get("peak_risk_window") else [], "recommendation": "Review outdoor work timing with the responsible supervisor during elevated-risk periods."}


def agriculture_advice(decision: dict[str, Any], crop: str | None = None) -> dict[str, Any]:
    message = "Review irrigation and outdoor farm activity against the rainfall forecast and local soil conditions."
    if crop:
        message = f"For {crop}, combine this weather signal with crop stage and local agronomy guidance."
    return {"type": "agriculture", "crop": crop, "risk": decision.get("risk_level"), "recommendation": message}

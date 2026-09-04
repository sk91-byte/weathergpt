"""Transparent decision-confidence estimate, not a calibrated probability."""

from typing import Any


def calculate_confidence(hours: list[dict[str, Any]], horizon_days: int = 1, source_count: int = 1) -> dict[str, Any]:
    if not hours:
        return {"score": 0, "level": "low", "label": "Decision confidence", "reasons": ["No hourly forecast data"]}
    completeness = sum(1 for item in hours if item.get("precipitation_probability_percent") is not None) / len(hours)
    score = 55 + completeness * 25 - max(0, horizon_days - 1) * 4 + min(10, max(0, source_count - 1) * 5)
    score = round(max(0, min(100, score)))
    level = "high" if score >= 75 else "medium" if score >= 50 else "low"
    return {"score": score, "level": level, "label": "Decision confidence", "reasons": [f"Forecast horizon: {horizon_days} day(s)", f"Available hourly inputs: {completeness:.0%}", f"Configured forecast source(s): {source_count}"]}

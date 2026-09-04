"""Meaningful change detection for cached forecast snapshots."""

from typing import Any


def compare_forecasts(previous: dict[str, Any] | None, latest: dict[str, Any]) -> dict[str, Any]:
    if not previous:
        return {"forecast_changed": False, "changes": [], "reason": "No previous forecast exists"}
    old = previous.get("forecast", [{}])[0] if previous.get("forecast") else previous
    new = latest.get("forecast", [{}])[0] if latest.get("forecast") else latest
    fields = {"rain_probability": "precipitation_probability_percent", "temperature_max": "temperature_max_c", "temperature_min": "temperature_min_c", "precipitation": "precipitation_sum_mm"}
    changes = []
    for name, key in fields.items():
        before, after = old.get(key), new.get(key)
        if not isinstance(before, (int, float)) or not isinstance(after, (int, float)) or before == after:
            continue
        change_percent = round((after - before) / abs(before) * 100, 1) if before else None
        if abs(after - before) >= (10 if "probability" in name else 2):
            changes.append({"parameter": name, "old": before, "new": after, "change_percent": change_percent})
    return {"forecast_changed": bool(changes), "changes": changes}

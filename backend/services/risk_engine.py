"""Deterministic weather-risk calculations; Gemini never supplies scores."""

from typing import Any


THRESHOLDS = ((80, "extreme"), (60, "high"), (40, "moderate"), (20, "low"), (0, "very_low"))


def risk_level(score: float | None) -> str:
    if score is None:
        return "unavailable"
    return next(level for threshold, level in THRESHOLDS if score >= threshold)


def _score(value: float | int | None, maximum: float) -> float | None:
    return None if value is None else max(0.0, min(100.0, float(value) / maximum * 100.0))


def _max_number(hours: list[dict[str, Any]], key: str) -> float | None:
    values = [float(item[key]) for item in hours if isinstance(item.get(key), (int, float))]
    return max(values) if values else None


def calculate_risks(hours: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Return scores plus availability and evidence for each supported factor."""
    rain_probability = _max_number(hours, "precipitation_probability_percent")
    rain_amount = sum(float(item["precipitation_mm"]) for item in hours if isinstance(item.get("precipitation_mm"), (int, float)))
    wind = _max_number(hours, "wind_gusts_kmh") or _max_number(hours, "wind_speed_kmh")
    temperature = _max_number(hours, "temperature_c")
    humidity = _max_number(hours, "humidity_percent")
    codes = [item.get("weather_code") for item in hours]
    thunder = any(code in (95, 96, 99) for code in codes)
    fog = any(code in (45, 48) for code in codes)
    result: dict[str, dict[str, Any]] = {}

    if rain_probability is None:
        result["rain"] = {"score": None, "level": "unavailable", "reason": "Precipitation probability is unavailable", "evidence": []}
    else:
        score = max(rain_probability, min(100.0, rain_amount * 2.5))
        result["rain"] = {"score": round(score), "level": risk_level(score), "evidence": [f"Peak precipitation probability: {rain_probability:.0f}%", f"Forecast precipitation: {rain_amount:.1f} mm"]}

    if rain_probability is None and rain_amount == 0:
        result["flood"] = {"score": None, "level": "unavailable", "reason": "Rainfall inputs are unavailable", "evidence": []}
    else:
        flood_score = min(100.0, rain_amount * 2.8 + (rain_probability or 0) * 0.25)
        result["flood"] = {"score": round(flood_score), "level": risk_level(flood_score), "evidence": [f"Forecast precipitation: {rain_amount:.1f} mm"]}

    result["lightning"] = {"score": 75 if thunder else (10 if codes else None), "level": risk_level(75 if thunder else (10 if codes else None)), "evidence": ["Thunderstorm weather code detected"] if thunder else (["No thunderstorm code detected"] if codes else []), **({} if codes else {"reason": "Weather-code data is unavailable"})}

    if wind is None:
        result["wind"] = {"score": None, "level": "unavailable", "reason": "Wind data is unavailable", "evidence": []}
    else:
        wind_score = min(100.0, wind / 80.0 * 100.0)
        result["wind"] = {"score": round(wind_score), "level": risk_level(wind_score), "evidence": [f"Peak wind/gust: {wind:.1f} km/h"]}

    if temperature is None:
        result["heat"] = {"score": None, "level": "unavailable", "reason": "Temperature data is unavailable", "evidence": []}
    else:
        heat_score = max(0.0, min(100.0, (temperature - 30) * 12 + ((humidity or 50) - 60) * 0.4))
        result["heat"] = {"score": round(heat_score), "level": risk_level(heat_score), "evidence": [f"Peak temperature: {temperature:.1f}°C"]}

    result["visibility"] = {"score": 70 if fog else (35 if rain_probability and rain_probability >= 70 else (10 if codes else None)), "level": risk_level(70 if fog else (35 if rain_probability and rain_probability >= 70 else (10 if codes else None))), "evidence": ["Fog code detected"] if fog else (["Rain may reduce visibility"] if rain_probability and rain_probability >= 70 else []), **({} if codes else {"reason": "Visibility inputs are unavailable"})}
    storm_score = 85 if thunder else (45 if rain_probability is not None and rain_probability >= 80 and wind is not None and wind >= 35 else (10 if codes else None))
    result["storm"] = {"score": round(storm_score) if storm_score is not None else None, "level": risk_level(storm_score), "evidence": ["Thunderstorm weather code detected"] if thunder else (["High precipitation probability and strong wind inputs"] if storm_score == 45 else []), **({} if codes else {"reason": "Storm inputs are unavailable"})}
    available_scores = [item["score"] for item in result.values() if item.get("score") is not None]
    overall = max(available_scores) if available_scores else None
    result["overall"] = {"score": round(overall) if overall is not None else None, "level": risk_level(overall), "evidence": ["Overall score is the highest available component risk"] if overall is not None else [], **({} if overall is not None else {"reason": "No risk inputs are available"})}
    return result


def time_windows(hours: list[dict[str, Any]]) -> list[dict[str, Any]]:
    windows = []
    for item in hours:
        probability = item.get("precipitation_probability_percent")
        if not isinstance(probability, (int, float)):
            continue
        score = max(float(probability), min(100.0, float(item.get("precipitation_mm") or 0) * 2.5))
        windows.append({"time": item.get("time"), "risk_score": round(score), "risk_level": risk_level(score), "rain_probability_percent": probability})
    return windows

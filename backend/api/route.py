"""Weather-aware route intelligence endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from backend.models.route import BestTimeRequest, RouteRequest, RouteWeatherRequest
from backend.services.decision_engine import analyze_decision
from backend.services.location_service import get_location
from backend.services.risk_engine import calculate_risks, risk_level
from backend.services.routing_service import RoutingServiceError, get_cached_route, get_route, sample_route
from backend.services.weather_service import WeatherServiceError, get_weather_forecast

router = APIRouter(prefix="/route", tags=["route-intelligence"])


def _resolve_location(location: Any) -> dict[str, Any]:
    if not isinstance(location, str) or not location.strip():
        raise HTTPException(422, "A destination name is required")
    result = get_location(location)
    if result is None:
        raise HTTPException(422, "Location could not be confidently resolved; choose a search result")
    return result


def _weather_for_route(route: dict[str, Any], departure_time: str | None = None) -> dict[str, Any]:
    samples = sample_route(route)
    segments: list[dict[str, Any]] = []
    scores: list[int] = []
    for index, point in enumerate(samples):
        try:
            forecast = get_weather_forecast(point["latitude"], point["longitude"], days=2)
        except WeatherServiceError:
            continue
        hours = forecast.get("hourly", [])
        # WeatherAPI fallback responses expose daily forecast data but may not
        # expose hourly data. Preserve honest risk analysis by scoring the
        # available daily signal rather than silently returning no score.
        if not hours:
            hours = [
                {
                    "time": item.get("date"),
                    "temperature_c": item.get("temperature_max_c"),
                    "precipitation_probability_percent": item.get("precipitation_probability_percent"),
                    "precipitation_mm": item.get("precipitation_sum_mm"),
                    "wind_speed_kmh": None,
                    "weather_code": item.get("weather_code"),
                    "condition": item.get("condition"),
                }
                for item in forecast.get("forecast", [])
                if isinstance(item, dict)
            ]
        if departure_time and hours:
            try:
                start = datetime.fromisoformat(departure_time.replace("Z", "+00:00"))
                hours = [item for item in hours if isinstance(item.get("time"), str) and datetime.fromisoformat(item["time"]).replace(tzinfo=start.tzinfo) >= start][:4] or hours[:4]
            except ValueError:
                hours = hours[:4]
        risks = calculate_risks(hours[:4])
        overall = risks["overall"]
        score = overall.get("score")
        if isinstance(score, int):
            scores.append(score)
        weather = hours[0] if hours else (forecast.get("forecast") or [{}])[0]
        segments.append({"index": index + 1, "location": point, "start_time": weather.get("time"), "end_time": hours[-1].get("time") if hours else None, "weather": {"temperature_c": weather.get("temperature_c"), "rain_probability_percent": weather.get("precipitation_probability_percent"), "precipitation_mm": weather.get("precipitation_mm"), "wind_speed_kmh": weather.get("wind_speed_kmh"), "visibility_m": weather.get("visibility_m"), "condition": weather.get("condition") or "weather forecast"}, "risk": {"score": score, "level": overall.get("level"), "components": risks}})
    if not segments:
        return {"overall_risk": {"score": None, "level": "unavailable"}, "segments": [], "data_available": False}
    # The highest meaningful segment is weighted most heavily; this prevents a
    # dangerous short window being hidden by safer parts of a long route.
    peak = max(scores) if scores else None
    average = sum(scores) / len(scores) if scores else None
    final_score = round(peak * 0.7 + average * 0.3) if peak is not None and average is not None else peak
    return {"overall_risk": {"score": final_score, "level": risk_level(final_score)}, "segments": segments, "peak_segment": max(segments, key=lambda item: item["risk"].get("score") or -1), "data_available": True}


@router.post("")
def create_route(request: RouteRequest) -> dict[str, Any]:
    try:
        return get_route(request)
    except RoutingServiceError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post("/resolve")
def resolve_route(origin: str, destination: str, travel_mode: str = "driving") -> dict[str, Any]:
    """Resolve natural place names, then create a normalized route."""
    if travel_mode not in {"driving", "walking", "cycling", "transit"}:
        raise HTTPException(422, "Unsupported travel mode")
    request = RouteRequest(origin=_resolve_location(origin), destination=_resolve_location(destination), travel_mode=travel_mode)  # type: ignore[arg-type]
    return create_route(request)


@router.post("/weather")
def route_weather(request: RouteWeatherRequest) -> dict[str, Any]:
    route = get_cached_route(request.route_id)
    if route is None:
        raise HTTPException(404, "Route not found or expired; create the route again")
    return {"route_id": request.route_id, **_weather_for_route(route, request.departure_time)}


@router.post("/best-time")
def best_time(request: BestTimeRequest) -> dict[str, Any]:
    route = get_cached_route(request.route_id)
    if route is None:
        raise HTTPException(404, "Route not found or expired; create the route again")
    choices = request.departure_times or ["08:00", "10:00", "12:00", "14:00", "16:00"]
    evaluations = []
    for value in choices:
        departure = value
        if len(value) == 5:
            departure = f"{datetime.now(timezone.utc).date().isoformat()}T{value}:00+00:00"
        analysis = _weather_for_route(route, departure)
        evaluations.append({"departure_time": value, "risk": analysis["overall_risk"]})
    available = [item for item in evaluations if item["risk"].get("score") is not None]
    if not available:
        return {"route_id": request.route_id, "recommended_departure_time": None, "alternative_times": evaluations, "reason": "Forecast data is unavailable; no time is recommended."}
    best = min(available, key=lambda item: item["risk"]["score"])
    return {"route_id": request.route_id, "recommended_departure_time": best["departure_time"], "alternative_times": evaluations, "reason": "The selected time has the lowest available forecast risk. This is decision support, not a guarantee."}


@router.get("/{route_id}")
def route_details(route_id: str) -> dict[str, Any]:
    route = get_cached_route(route_id)
    if route is None:
        raise HTTPException(404, "Route not found or expired")
    return route


@router.get("/{route_id}/explanation")
def route_explanation(route_id: str) -> dict[str, Any]:
    route = get_cached_route(route_id)
    if route is None:
        raise HTTPException(404, "Route not found or expired")
    analysis = _weather_for_route(route)
    peak = analysis.get("peak_segment")
    if not peak:
        return {"route_id": route_id, "explanation": ["Weather inputs are unavailable, so no route-risk explanation can be calculated."], "data_available": False}
    components = peak["risk"].get("components", {})
    evidence = [line for name, item in components.items() if name != "overall" for line in item.get("evidence", [])]
    return {"route_id": route_id, "risk_score": analysis["overall_risk"]["score"], "risk_level": analysis["overall_risk"]["level"], "peak_segment": peak, "explanation": evidence, "data_available": True}

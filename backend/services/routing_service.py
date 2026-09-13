"""Provider-neutral routing with a configurable OSRM implementation."""

from __future__ import annotations

import hashlib
from typing import Any, Protocol

import requests

from backend.config import settings
from backend.models.route import RouteLocation, RouteRequest
from backend.services.cache_service import cache


class RoutingServiceError(Exception):
    """Raised when no configured routing provider can return a route."""


class RoutingProvider(Protocol):
    def get_route(self, request: RouteRequest) -> dict[str, Any]: ...


class OSRMProvider:
    """OSRM adapter; provider details stay outside the rest of the app."""

    profiles = {"driving": "driving", "walking": "foot", "cycling": "bike"}

    def get_route(self, request: RouteRequest) -> dict[str, Any]:
        if request.travel_mode == "transit":
            raise RoutingServiceError("Transit routing is not available from the configured provider")
        profile = self.profiles[request.travel_mode]
        coordinates = f"{request.origin.longitude},{request.origin.latitude};{request.destination.longitude},{request.destination.latitude}"
        url = f"{settings.routing_provider_url.rstrip('/')}/route/v1/{profile}/{coordinates}"
        try:
            response = requests.get(url, params={"overview": "full", "geometries": "geojson", "steps": "true", "alternatives": "true"}, headers={"User-Agent": "WeatherGPT/1.0 routing-client"}, timeout=20)
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise RoutingServiceError("Route service is temporarily unavailable") from exc
        routes = payload.get("routes") if isinstance(payload, dict) else None
        if not isinstance(payload, dict) or payload.get("code") != "Ok" or not isinstance(routes, list) or not routes:
            raise RoutingServiceError("Route service returned no usable route")
        base_key = f"{request.origin.latitude},{request.origin.longitude}|{request.destination.latitude},{request.destination.longitude}|{request.travel_mode}"
        alternative_payloads: list[dict[str, Any]] = []
        for index, candidate in enumerate(routes[:3]):
            steps: list[dict[str, Any]] = []
            for step in candidate.get("legs", [])[0].get("steps", []) if candidate.get("legs") else []:
                steps.append({"name": step.get("name") or "Unnamed road", "distance_km": round(float(step.get("distance", 0)) / 1000, 2), "duration_minutes": round(float(step.get("duration", 0)) / 60), "geometry": step.get("geometry")})
            route_id = hashlib.sha256(f"{base_key}|alternative:{index}".encode()).hexdigest()[:24]
            alternative_payloads.append({"route_id": route_id, "origin": request.origin.model_dump(), "destination": request.destination.model_dump(), "travel_mode": request.travel_mode, "distance_km": round(float(candidate.get("distance", 0)) / 1000, 2), "duration_minutes": round(float(candidate.get("duration", 0)) / 60), "geometry": candidate.get("geometry") or {"type": "LineString", "coordinates": []}, "steps": steps, "alternative_index": index})
        selected = alternative_payloads[0]
        return {**selected, "alternatives": alternative_payloads, "alternatives_available": len(alternative_payloads) > 1}


class OpenRouteServiceProvider:
    profiles = {'driving': 'driving-car', 'walking': 'foot-walking', 'cycling': 'cycling-regular'}

    def get_route(self, request: RouteRequest) -> dict[str, Any]:
        if request.travel_mode == 'transit':
            raise RoutingServiceError('Transit routing is not available from OpenRouteService')
        if not settings.openrouteservice_api_key:
            raise RoutingServiceError('OpenRouteService is not configured: set OPENROUTESERVICE_API_KEY')
        profile = self.profiles[request.travel_mode]
        url = f'{settings.openrouteservice_base_url.rstrip('/')}/v2/directions/{profile}/geojson'
        body = {'coordinates': [[request.origin.longitude, request.origin.latitude], [request.destination.longitude, request.destination.latitude]], 'instructions': True}
        try:
            response = requests.post(url, json=body, headers={'Authorization': settings.openrouteservice_api_key, 'Content-Type': 'application/json', 'Accept': 'application/geo+json, application/json', 'User-Agent': 'WeatherGPT/1.0 routing-client'}, timeout=20)
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise RoutingServiceError('OpenRouteService is temporarily unavailable') from exc
        feature = payload.get('features', [{}])[0] if isinstance(payload, dict) else {}
        geometry = feature.get('geometry') or {'type': 'LineString', 'coordinates': []}
        properties = feature.get('properties') or {}
        summary = properties.get('summary') or {}
        steps = []
        for segment in properties.get('segments') or []:
            for step in segment.get('steps', []):
                steps.append({'name': step.get('name') or 'Unnamed road', 'distance_km': round(float(step.get('distance', 0)) / 1000, 2), 'duration_minutes': round(float(step.get('duration', 0)) / 60), 'geometry': None})
        route_id = hashlib.sha256(f'ors|{request.origin.latitude},{request.origin.longitude}|{request.destination.latitude},{request.destination.longitude}|{request.travel_mode}'.encode()).hexdigest()[:24]
        return {'route_id': route_id, 'origin': request.origin.model_dump(), 'destination': request.destination.model_dump(), 'travel_mode': request.travel_mode, 'distance_km': round(float(summary.get('distance', 0)) / 1000, 2), 'duration_minutes': round(float(summary.get('duration', 0)) / 60), 'geometry': geometry, 'steps': steps, 'alternatives_available': False}

_providers: dict[str, RoutingProvider] = {"osrm": OSRMProvider(), "ors": OpenRouteServiceProvider(), "openrouteservice": OpenRouteServiceProvider()}


def get_route(request: RouteRequest) -> dict[str, Any]:
    provider = _providers.get(settings.routing_provider.lower())
    if provider is None:
        raise RoutingServiceError(f"Unsupported routing provider: {settings.routing_provider}")
    key = f"route:{request.origin.latitude}:{request.origin.longitude}:{request.destination.latitude}:{request.destination.longitude}:{request.travel_mode}"
    saved = cache.get(key)
    if saved is not None:
        return saved
    route = provider.get_route(request)
    cache.set(key, route, ttl_seconds=3600)
    cache.set(f"route-id:{route['route_id']}", route, ttl_seconds=3600)
    for alternative in route.get("alternatives", []):
        cache.set(f"route-id:{alternative['route_id']}", alternative, ttl_seconds=3600)
    return route


def get_cached_route(route_id: str) -> dict[str, Any] | None:
    return cache.get(f"route-id:{route_id}")


def sample_route(route: dict[str, Any], limit: int = 6) -> list[dict[str, float]]:
    """Select evenly spaced geometry points, bounded to avoid provider abuse."""
    coordinates = (route.get("geometry") or {}).get("coordinates", [])
    points = [{"latitude": float(item[1]), "longitude": float(item[0])} for item in coordinates if isinstance(item, list) and len(item) >= 2]
    if not points:
        return [{"latitude": route["origin"]["latitude"], "longitude": route["origin"]["longitude"]}, {"latitude": route["destination"]["latitude"], "longitude": route["destination"]["longitude"]}]
    count = min(limit, len(points))
    indexes = [round(index * (len(points) - 1) / max(1, count - 1)) for index in range(count)]
    return [points[index] for index in indexes]


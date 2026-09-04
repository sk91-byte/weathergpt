"""Provider-neutral place autocomplete and details lookup."""

from __future__ import annotations

from typing import Any, Protocol

import requests

from backend.config import settings
from backend.services.cache_service import cache


class PlaceSearchError(Exception):
    """Raised when the configured place provider cannot answer."""


class PlaceSearchProvider(Protocol):
    def autocomplete(self, text: str, latitude: float | None = None, longitude: float | None = None) -> list[dict[str, Any]]: ...
    def get_place_details(self, place_id: str) -> dict[str, Any] | None: ...


class NominatimPlaceProvider:
    """OpenStreetMap provider; results are normalized before reaching clients."""

    base_url = "https://nominatim.openstreetmap.org"

    def autocomplete(self, text: str, latitude: float | None = None, longitude: float | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"q": text.strip(), "countrycodes": "in", "format": "jsonv2", "addressdetails": 1, "limit": 6}
        if latitude is not None and longitude is not None:
            params["viewbox"] = f"{longitude - 1},{latitude + 1},{longitude + 1},{latitude - 1}"
            params["bounded"] = 0
        try:
            response = requests.get(f"{self.base_url}/search", params=params, headers={"User-Agent": "WeatherGPT/1.0 place-search"}, timeout=10)
            response.raise_for_status()
            values = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PlaceSearchError("Place search is temporarily unavailable") from exc
        if not isinstance(values, list):
            raise PlaceSearchError("Place search returned invalid data")
        return [self._normalize(item) for item in values if isinstance(item, dict) and item.get("lat") and item.get("lon")]

    def get_place_details(self, place_id: str) -> dict[str, Any] | None:
        try:
            response = requests.get(f"{self.base_url}/details", params={"place_id": place_id, "format": "jsonv2", "addressdetails": 1}, headers={"User-Agent": "WeatherGPT/1.0 place-search"}, timeout=10)
            response.raise_for_status()
            value = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PlaceSearchError("Place details are temporarily unavailable") from exc
        return self._normalize(value) if isinstance(value, dict) else None

    @staticmethod
    def _normalize(item: dict[str, Any]) -> dict[str, Any]:
        address = item.get("address") or {}
        return {"place_id": str(item.get("place_id", "")), "name": address.get("city") or address.get("town") or address.get("village") or address.get("suburb") or item.get("name") or item.get("display_name", "Place").split(",")[0], "address": item.get("display_name", ""), "formatted_address": item.get("display_name", ""), "latitude": float(item["lat"]), "longitude": float(item["lon"]), "city": address.get("city") or address.get("town") or address.get("village"), "state": address.get("state"), "country": address.get("country"), "postal_code": address.get("postcode")}


_provider: PlaceSearchProvider = NominatimPlaceProvider()


def autocomplete(text: str, latitude: float | None = None, longitude: float | None = None) -> list[dict[str, Any]]:
    normalized = " ".join(text.split()).lower()
    key = f"places:{normalized}:{latitude}:{longitude}"
    saved = cache.get(key)
    if saved is not None:
        return saved
    if len(normalized) < 2:
        return []
    results = _provider.autocomplete(normalized, latitude, longitude)
    cache.set(key, results, ttl_seconds=120)
    for item in results:
        cache.set(f"place:{item['place_id']}", item, ttl_seconds=600)
    return results


def place_details(place_id: str) -> dict[str, Any] | None:
    saved = cache.get(f"place:{place_id}")
    if saved is not None:
        return saved
    value = _provider.get_place_details(place_id)
    if value is not None:
        cache.set(f"place:{place_id}", value, ttl_seconds=600)
    return value

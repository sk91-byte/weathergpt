"""Provider-neutral place autocomplete and details lookup."""

from __future__ import annotations

from typing import Any, Protocol

import requests
from math import cos, radians, sqrt

from backend.services.cache_service import cache


class PlaceSearchError(Exception):
    """Raised when the configured place provider cannot answer."""


class PlaceSearchProvider(Protocol):
    def autocomplete(self, text: str, latitude: float | None = None, longitude: float | None = None, limit: int = 8) -> list[dict[str, Any]]: ...
    def get_place_details(self, place_id: str) -> dict[str, Any] | None: ...


class NominatimPlaceProvider:
    """OpenStreetMap provider; results are normalized before reaching clients."""

    base_url = "https://nominatim.openstreetmap.org"

    def autocomplete(self, text: str, latitude: float | None = None, longitude: float | None = None, limit: int = 8) -> list[dict[str, Any]]:
        headers = {"User-Agent": "WeatherGPT/2.0 place-search"}
        raw_results: list[dict[str, Any]] = []

        # 1. Photon Komoot fast autocomplete
        try:
            photon_params: dict[str, Any] = {"q": text.strip(), "limit": limit}
            if latitude is not None and longitude is not None:
                photon_params["lat"] = latitude
                photon_params["lon"] = longitude
            p_res = requests.get("https://photon.komoot.io/api/", params=photon_params, headers=headers, timeout=5)
            if p_res.status_code == 200:
                for feat in p_res.json().get("features", []):
                    props = feat.get("properties", {})
                    country = props.get("country", "")
                    if country and country.lower() not in ["india", "in"]:
                        continue
                    coords = feat.get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2:
                        p_lon, p_lat = coords[0], coords[1]
                        name = props.get("name") or props.get("street") or props.get("district") or ""
                        if not name:
                            continue
                        p_type = _classify_place_type(
                            osm_key=props.get("osm_key", ""),
                            osm_value=props.get("osm_value", ""),
                            name=name
                        )
                        city = props.get("city") or props.get("district")
                        district = props.get("district")
                        state = props.get("state")
                        addr_parts = [
                            props.get("street"),
                            district if district != city else None,
                            city,
                            state,
                            props.get("postcode")
                        ]
                        formatted = _format_clean_address(addr_parts)
                        display = f"{name}, {formatted}" if formatted else name
                        raw_results.append({
                            "place_id": f"photon_{props.get('osm_id', f'{p_lat}_{p_lon}')}",
                            "name": name,
                            "display_name": display,
                            "formatted_address": formatted or display,
                            "latitude": float(p_lat),
                            "longitude": float(p_lon),
                            "city": city,
                            "district": district,
                            "state": state,
                            "country": "India",
                            "place_type": p_type
                        })
        except Exception:
            pass

        # 2. Nominatim OpenStreetMap search
        queries_to_try = [text.strip()]
        words = text.strip().split()
        if "," not in text and len(words) >= 2:
            queries_to_try.append(f"{' '.join(words[:-1])}, {words[-1]}")

        for q in queries_to_try:
            params: dict[str, Any] = {"q": q, "countrycodes": "in", "format": "jsonv2", "addressdetails": 1, "limit": limit}
            if latitude is not None and longitude is not None:
                params["viewbox"] = f"{longitude - 1.5},{latitude + 1.5},{longitude + 1.5},{latitude - 1.5}"
                params["bounded"] = 0
            try:
                response = requests.get(f"{self.base_url}/search", params=params, headers=headers, timeout=6)
                if response.status_code == 200:
                    values = response.json()
                    if isinstance(values, list):
                        for item in values:
                            if isinstance(item, dict) and item.get("lat") and item.get("lon"):
                                raw_results.append(self._normalize(item, query=text))
                        if len(raw_results) >= limit:
                            break
            except Exception:
                pass

        if not raw_results:
            # If both failed due to connection error, raise PlaceSearchError
            try:
                # Quick health check fallback
                pass
            except Exception as exc:
                raise PlaceSearchError("Place search is temporarily unavailable") from exc

        # 3. Deduplicate and rank
        deduped: list[dict[str, Any]] = []
        for item in raw_results:
            if not _is_duplicate(item, deduped):
                deduped.append(item)

        q_lower = text.strip().lower()

        def rank_key(item: dict[str, Any]) -> tuple:
            nm = item["name"].lower()
            exact = 0 if nm == q_lower else 1
            starts = 0 if nm.startswith(q_lower) else 1
            contains = 0 if q_lower in nm else 1
            prox = 0.0
            if latitude is not None and longitude is not None:
                dlat = (item["latitude"] - latitude) * 111.0
                dlon = (item["longitude"] - longitude) * 111.0 * cos(radians(latitude))
                prox = sqrt(dlat * dlat + dlon * dlon)
            return (exact, starts, contains, prox)

        deduped.sort(key=rank_key)
        return deduped[:limit]

    def get_place_details(self, place_id: str) -> dict[str, Any] | None:
        try:
            response = requests.get(f"{self.base_url}/details", params={"place_id": place_id, "format": "jsonv2", "addressdetails": 1}, headers={"User-Agent": "WeatherGPT/1.0 place-search"}, timeout=10)
            response.raise_for_status()
            value = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise PlaceSearchError("Place details are temporarily unavailable") from exc
        return self._normalize(value) if isinstance(value, dict) else None

    @staticmethod
    def _normalize(item: dict[str, Any], query: str = "") -> dict[str, Any]:
        address = item.get("address") or {}
        display_name = item.get("display_name", "")
        raw_name = str(item.get("name") or "").strip()

        # Resolve primary name: prioritize the landmark/building/amenity/road/locality
        name = _resolve_primary_name(raw_name, display_name, address, query)

        city = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("city_district")
            or address.get("suburb")
        )
        district = address.get("state_district") or address.get("county") or city
        state = address.get("state")
        country = "India"
        place_type = _classify_place_type(
            raw_type=str(item.get("type", "")),
            raw_class=str(item.get("class", "")),
            name=name
        )

        addr_parts = [
            address.get("suburb") or address.get("neighbourhood") or address.get("residential"),
            address.get("road"),
            city if city != name else None,
            district if district != city and district != name else None,
            state if state != name else None,
            address.get("postcode")
        ]
        formatted_address = _format_clean_address(addr_parts) or display_name

        return {
            "place_id": str(item.get("place_id", f"{item.get('lat')}_{item.get('lon')}")),
            "name": name,
            "display_name": display_name,
            "formatted_address": formatted_address,
            "latitude": float(item["lat"]),
            "longitude": float(item["lon"]),
            "city": city,
            "district": district,
            "state": state,
            "country": country,
            "place_type": place_type
        }


def _classify_place_type(osm_key: str = "", osm_value: str = "", raw_type: str = "", raw_class: str = "", name: str = "") -> str:
    combined = f"{osm_key} {osm_value} {raw_type} {raw_class} {name}".lower()
    if any(k in combined for k in ["university", "college", "campus", "institute", "vidyapeeth", "iit", "iim", "nit"]):
        return "college" if "college" in combined else "university"
    if any(k in combined for k in ["school", "vidyalaya", "academy", "gurukul"]):
        return "school"
    if any(k in combined for k in ["hospital", "clinic", "dispensary", "aiims", "medical", "healthcare", "trauma"]):
        return "hospital"
    if any(k in combined for k in ["aerodrome", "airport", "terminal"]):
        return "airport"
    if any(k in combined for k in ["railway station", "station", "metro", "junction", "halt", "subway"]):
        return "station"
    if any(k in combined for k in ["bus station", "bus stop", "isbt", "bus stand"]):
        return "bus_station"
    if any(k in combined for k in ["mall", "market", "bazaar", "plaza", "commercial", "shopping"]):
        return "commercial"
    if any(k in combined for k in ["hotel", "resort", "guest_house"]):
        return "hotel"
    if any(k in combined for k in ["temple", "mandir", "gurudwara", "mosque", "masjid", "church"]):
        return "religious"
    if any(k in combined for k in ["park", "garden", "monument", "gate", "memorial", "fort", "palace"]):
        return "landmark"
    if any(k in combined for k in ["highway", "road", "expressway", "margv", "marg", "street", "lane", "path"]):
        return "road"
    if any(k in combined for k in ["sector", "colony", "vihar", "enclave", "block", "suburb", "neighbourhood", "residential", "quarter"]):
        return "locality"
    if any(k in combined for k in ["village", "gram"]):
        return "village"
    if any(k in combined for k in ["city", "town", "municipality"]):
        return "city"
    return "locality"


def _format_clean_address(parts: list[Any]) -> str:
    cleaned: list[str] = []
    seen = set()
    for p in parts:
        if not p:
            continue
        item = str(p).strip().strip(",")
        if not item:
            continue
        lower = item.lower()
        if lower in seen or lower in ["india", "in"]:
            continue
        seen.add(lower)
        cleaned.append(item)
    if cleaned:
        cleaned.append("India")
    return ", ".join(cleaned)


def _resolve_primary_name(raw_name: str, display_name: str, address: dict[str, Any], query: str) -> str:
    if raw_name and len(raw_name) > 2 and not raw_name.isdigit():
        return raw_name

    for k in ["amenity", "building", "university", "college", "school", "hospital", "station", "suburb", "residential", "neighbourhood", "road"]:
        val = address.get(k)
        if val and len(str(val).strip()) > 2:
            return str(val).strip()

    q_words = [w.lower() for w in query.split() if len(w) > 2]
    segments = [s.strip() for s in display_name.split(",") if s.strip()]
    for seg in segments:
        seg_lower = seg.lower()
        if any(w in seg_lower for w in q_words) and not seg.startswith("India"):
            return seg

    return segments[0] if segments else "Location"


def _is_duplicate(item: dict[str, Any], existing: list[dict[str, Any]]) -> bool:
    for ex in existing:
        dlat = (item["latitude"] - ex["latitude"]) * 111.0
        dlon = (item["longitude"] - ex["longitude"]) * 111.0 * cos(radians(item["latitude"]))
        dist_km = sqrt(dlat * dlat + dlon * dlon)
        if dist_km < 0.2:
            return True
        if item["name"].lower() == ex["name"].lower() and item.get("city") == ex.get("city"):
            return True
    return False


_provider: PlaceSearchProvider = NominatimPlaceProvider()


def autocomplete(text: str, latitude: float | None = None, longitude: float | None = None, limit: int = 8) -> list[dict[str, Any]]:
    normalized = " ".join(text.split()).lower()
    key = f"places:{normalized}:{latitude}:{longitude}:{limit}"
    saved = cache.get(key)
    if saved is not None:
        return saved
    if len(normalized) < 2:
        return []
    results = _provider.autocomplete(normalized, latitude, longitude, limit)
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


def nearby_places(latitude: float, longitude: float, radius_km: float = 5, limit: int = 12) -> list[dict[str, Any]]:
    """Find practical waiting and safety places near a coordinate."""
    key = f"nearby-places:{round(latitude, 4)}:{round(longitude, 4)}:{radius_km}:{limit}"
    saved = cache.get(key)
    if saved is not None:
        return saved
    # Nominatim's public endpoint is deliberately queried once with a broad
    # amenity expression to keep the feature lightweight and rate-limit friendly.
    try:
        delta_lat = radius_km / 111.0
        delta_lon = radius_km / max(1.0, 111.0 * cos(radians(latitude)))
        response = requests.get(f"{NominatimPlaceProvider.base_url}/search", params={
            "q": "cafe OR restaurant OR hotel OR fuel OR hospital OR convenience",
            "format": "jsonv2", "addressdetails": 1, "limit": min(limit, 20),
            "viewbox": f"{longitude - delta_lon},{latitude + delta_lat},{longitude + delta_lon},{latitude - delta_lat}", "bounded": 1,
        }, headers={"User-Agent": "WeatherGPT/1.0 nearby-places"}, timeout=10)
        response.raise_for_status()
        values = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise PlaceSearchError("Nearby place search is temporarily unavailable") from exc
    result: list[dict[str, Any]] = []
    for item in values if isinstance(values, list) else []:
        if not isinstance(item, dict) or not item.get("lat") or not item.get("lon"): continue
        normalized = NominatimPlaceProvider._normalize(item)
        tags = item.get("type", "").lower()
        category = "cafe" if "cafe" in tags else "restaurant" if "restaurant" in tags else "petrol" if "fuel" in tags else "hospital" if "hospital" in tags else "hotel" if "hotel" in tags else "convenience"
        distance = sqrt(((float(item["lat"]) - latitude) * 111) ** 2 + ((float(item["lon"]) - longitude) * 111 * cos(radians(latitude))) ** 2)
        result.append({**normalized, "category": category, "distance_km": round(distance, 2)})
    result.sort(key=lambda item: item["distance_km"])
    result = result[:limit]
    cache.set(key, result, ttl_seconds=120)
    return result

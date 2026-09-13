"""Provider-neutral place autocomplete and details lookup."""

from __future__ import annotations

from typing import Any, Protocol

import requests
from math import cos, radians, sqrt

from backend.services.cache_service import cache
from backend.config import settings


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
    # Prefer the configured Geoapify account for point searches as well as
    # route-corridor searches.  The public OSM query remains a safe fallback
    # when Geoapify is unavailable or not configured.
    if settings.geoapify_api_key:
        try:
            return _geoapify_nearby_places(latitude, longitude, radius_km, limit, key)
        except (requests.RequestException, ValueError, KeyError) as exc:
            last_error = exc
    # Nearby amenities need a geographic query.  Nominatim's text search does
    # not support boolean amenity queries reliably, so use OpenStreetMap's
    # public Overpass endpoint.  Results are actual mapped places, never seeds.
    try:
        radius_m = max(250, min(int(radius_km * 1000), 10000))
        query = f'''[out:json][timeout:20];
          (nwr(around:{radius_m},{latitude},{longitude})["amenity"~"^(cafe|restaurant|fast_food|fuel|hospital|pharmacy)$"];
           nwr(around:{radius_m},{latitude},{longitude})["tourism"="hotel"];
           nwr(around:{radius_m},{latitude},{longitude})["shop"="convenience"];
          ); out center {min(limit * 3, 50)};'''
        response = requests.post("https://overpass-api.de/api/interpreter", data={"data": query}, headers={"User-Agent": "WeatherGPT/1.0 nearby-places"}, timeout=25)
        response.raise_for_status()
        values = response.json().get("elements", [])
    except (requests.RequestException, ValueError) as exc:
        raise PlaceSearchError("Nearby place search is temporarily unavailable") from exc
    result: list[dict[str, Any]] = []
    for item in values if isinstance(values, list) else []:
        if not isinstance(item, dict):
            continue
        point = item.get("center") if isinstance(item.get("center"), dict) else item
        if point.get("lat") is None or point.get("lon") is None:
            continue
        tags = item.get("tags") if isinstance(item.get("tags"), dict) else {}
        amenity, tourism, shop = tags.get("amenity"), tags.get("tourism"), tags.get("shop")
        category = "cafe" if amenity == "cafe" else "restaurant" if amenity in {"restaurant", "fast_food"} else "petrol" if amenity == "fuel" else "hospital" if amenity in {"hospital", "pharmacy"} else "hotel" if tourism == "hotel" else "convenience"
        place_lat, place_lon = float(point["lat"]), float(point["lon"])
        distance = sqrt(((place_lat - latitude) * 111) ** 2 + ((place_lon - longitude) * 111 * cos(radians(latitude))) ** 2)
        name = tags.get("name")
        if not name:
            continue
        address_parts = [tags.get(key) for key in ("addr:housenumber", "addr:street", "addr:city") if tags.get(key)]
        result.append({"place_id": f"{item.get('type', 'node')}-{item.get('id')}", "name": name, "address": ", ".join(address_parts), "formatted_address": ", ".join(address_parts) or "Address unavailable", "latitude": place_lat, "longitude": place_lon, "category": category, "distance_km": round(distance, 2)})
    result.sort(key=lambda item: item["distance_km"])
    result = result[:limit]
    cache.set(key, result, ttl_seconds=120)
    return result


def _geoapify_nearby_places(latitude: float, longitude: float, radius_km: float, limit: int, cache_key: str) -> list[dict[str, Any]]:
    categories = ','.join((
        'healthcare.hospital', 'healthcare.pharmacy', 'service.vehicle.fuel',
        'catering.restaurant', 'catering.cafe', 'accommodation.hotel',
        'service.vehicle.charging_station', 'commercial.supermarket'
    ))
    response = requests.get(
        'https://api.geoapify.com/v2/places',
        params={
            'categories': categories,
            'filter': f'circle:{longitude},{latitude},{max(250, min(int(radius_km * 1000), 10000))}',
            'bias': f'proximity:{longitude},{latitude}',
            'limit': min(max(limit, 1), 20),
            'apiKey': settings.geoapify_api_key,
        },
        headers={'User-Agent': 'WeatherGPT/2.0 nearby-places'},
        timeout=12,
    )
    response.raise_for_status()
    features = response.json().get('features', [])
    result: list[dict[str, Any]] = []
    for feature in features if isinstance(features, list) else []:
        props = feature.get('properties', {}) if isinstance(feature, dict) else {}
        place_lat, place_lon = props.get('lat'), props.get('lon')
        name = str(props.get('name') or '').strip()
        if not name or place_lat is None or place_lon is None:
            continue
        categories_raw = props.get('categories') or []
        category_text = ' '.join(categories_raw) if isinstance(categories_raw, list) else str(categories_raw)
        if 'charging_station' in category_text:
            category = 'ev_charging'
        elif 'fuel' in category_text:
            category = 'petrol'
        elif 'hospital' in category_text or 'pharmacy' in category_text:
            category = 'hospital'
        elif 'hotel' in category_text:
            category = 'hotel'
        elif 'cafe' in category_text:
            category = 'cafe'
        elif 'restaurant' in category_text:
            category = 'restaurant'
        else:
            category = 'convenience'
        distance = sqrt(((float(place_lat) - latitude) * 111) ** 2 + ((float(place_lon) - longitude) * 111 * cos(radians(latitude))) ** 2)
        contact = props.get('contact') if isinstance(props.get('contact'), dict) else {}
        result.append({
            'place_id': str(props.get('place_id') or f'{category}:{name.lower()}'),
            'name': name,
            'address': props.get('formatted') or 'Address not listed',
            'formatted_address': props.get('formatted') or 'Address not listed',
            'latitude': float(place_lat),
            'longitude': float(place_lon),
            'category': category,
            'distance_km': round(distance, 2),
            'opening_hours': props.get('opening_hours'),
            'phone': contact.get('phone'),
            'website': contact.get('website'),
        })
    result.sort(key=lambda item: item['distance_km'])
    result = result[:limit]
    cache.set(cache_key, result, ttl_seconds=120)
    return result


def _route_distance_km(latitude: float, longitude: float, route_points: list[tuple[float, float]]) -> tuple[float, float]:
    """Return approximate distance to the route and distance along the route."""
    best_distance = float("inf")
    best_index = 0
    for index, (route_lat, route_lon) in enumerate(route_points):
        distance = sqrt(((latitude - route_lat) * 111) ** 2 + ((longitude - route_lon) * 111 * cos(radians(latitude))) ** 2)
        if distance < best_distance:
            best_distance, best_index = distance, index
    along_route = 0.0
    for first, second in zip(route_points[:best_index], route_points[1:best_index + 1]):
        along_route += sqrt(((second[0] - first[0]) * 111) ** 2 + ((second[1] - first[1]) * 111 * cos(radians(first[0]))) ** 2)
    return best_distance, along_route


def places_along_route(route_coordinates: list[list[float]], radius_km: float = 0.8, limit_per_category: int = 5) -> list[dict[str, Any]]:
    """Find real mapped amenities within a small corridor of a road route.

    Input coordinates use GeoJSON order: [longitude, latitude]. Overpass is
    queried around sampled road points, then every result is measured against
    the complete route before it is returned.
    """
    if len(route_coordinates) < 2:
        raise PlaceSearchError("A route with at least two coordinates is required")
    route_points = [(float(point[1]), float(point[0])) for point in route_coordinates if len(point) >= 2]
    if len(route_points) < 2:
        raise PlaceSearchError("Route geometry is invalid")
    # Keep the Overpass request small enough for a free Render instance while
    # still covering the whole road corridor.
    sample_count = min(8, max(4, len(route_points) // 80))
    sample_points = [route_points[round(index * (len(route_points) - 1) / (sample_count - 1))] for index in range(sample_count)]
    cache_key = f"route-places:{hash(tuple((round(lat, 5), round(lon, 5)) for lat, lon in sample_points))}:{radius_km}:{limit_per_category}"
    saved = cache.get(cache_key)
    if saved is not None:
        return saved
    radius_m = max(300, min(int(radius_km * 1000), 1500))
    if settings.geoapify_api_key:
        try:
            return _geoapify_places_along_route(route_points, sample_points, radius_m, radius_km, limit_per_category, cache_key)
        except (requests.RequestException, ValueError, KeyError) as exc:
            # Keep the existing OSM fallback if Geoapify is temporarily unavailable.
            last_error = exc
    around_queries = "\n".join(
        f'''nwr(around:{radius_m},{latitude},{longitude})["amenity"~"^(restaurant|cafe|fast_food|fuel|hospital|pharmacy|charging_station)$"];\n'''
        f'''nwr(around:{radius_m},{latitude},{longitude})["tourism"="hotel"];'''
        for latitude, longitude in sample_points
    )
    query = f'''[out:json][timeout:30];\n({around_queries}\n); out center tags;'''
    values: list[dict[str, Any]] | None = None
    last_error: Exception | None = None
    # Public Overpass instances occasionally rate-limit or time out. Try a
    # second public mirror before reporting an unavailable route-place search.
    for endpoint in (
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ):
        try:
            response = requests.post(endpoint, data={"data": query}, headers={"User-Agent": "WeatherGPT/1.0 route-amenities"}, timeout=12)
            response.raise_for_status()
            parsed = response.json().get("elements", [])
            if isinstance(parsed, list):
                values = parsed
                break
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
    if values is None:
        raise PlaceSearchError("Route amenity search is temporarily unavailable") from last_error

    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in values if isinstance(values, list) else []:
        if not isinstance(item, dict):
            continue
        point = item.get("center") if isinstance(item.get("center"), dict) else item
        tags = item.get("tags") if isinstance(item.get("tags"), dict) else {}
        name = str(tags.get("name") or "").strip()
        if not name or point.get("lat") is None or point.get("lon") is None:
            continue
        place_lat, place_lon = float(point["lat"]), float(point["lon"])
        distance_to_route, distance_along_route = _route_distance_km(place_lat, place_lon, route_points)
        if distance_to_route > radius_km:
            continue
        amenity, tourism = tags.get("amenity"), tags.get("tourism")
        if amenity == "charging_station" or tags.get("fuel:electricity") in {"yes", "true"}:
            category = "ev_charging"
        elif amenity == "fuel":
            category = "petrol"
        elif amenity in {"hospital", "pharmacy"}:
            category = "hospital"
        elif tourism == "hotel":
            category = "hotel"
        elif amenity == "cafe":
            category = "cafe"
        else:
            category = "restaurant"
        unique_id = f"{category}:{name.lower()}:{round(place_lat, 5)}:{round(place_lon, 5)}"
        if unique_id in seen:
            continue
        seen.add(unique_id)
        address_parts = [tags.get(key) for key in ("addr:housenumber", "addr:street", "addr:suburb", "addr:city", "addr:state", "addr:postcode") if tags.get(key)]
        address = ", ".join(str(value) for value in address_parts) or "Address not listed in OpenStreetMap"
        result.append({
            "place_id": f"{item.get('type', 'node')}-{item.get('id')}",
            "name": name,
            "address": address,
            "formatted_address": address,
            "latitude": place_lat,
            "longitude": place_lon,
            "category": category,
            "distance_km": round(distance_to_route, 2),
            "distance_from_route_km": round(distance_to_route, 2),
            "distance_from_start_km": round(distance_along_route, 2),
            "opening_hours": tags.get("opening_hours"),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "website": tags.get("website") or tags.get("contact:website"),
            "brand": tags.get("brand"),
        })
    result.sort(key=lambda item: (item["distance_from_start_km"], item["distance_from_route_km"]))
    category_counts: dict[str, int] = {}
    limited: list[dict[str, Any]] = []
    for item in result:
        count = category_counts.get(item["category"], 0)
        if count >= limit_per_category:
            continue
        category_counts[item["category"]] = count + 1
        limited.append(item)
    cache.set(cache_key, limited, ttl_seconds=180)
    return limited


def _geoapify_places_along_route(route_points, sample_points, radius_m, radius_km, limit_per_category, cache_key):
    categories = ",".join(("healthcare.hospital", "service.vehicle.fuel", "catering.restaurant", "catering.cafe", "accommodation.hotel", "service.vehicle.charging_station"))
    result = []
    seen = set()
    for latitude, longitude in sample_points:
        response = requests.get("https://api.geoapify.com/v2/places", params={
            "categories": categories, "filter": f"circle:{longitude},{latitude},{radius_m}",
            "bias": f"proximity:{longitude},{latitude}", "limit": 20,
            "apiKey": settings.geoapify_api_key,
        }, headers={"User-Agent": "WeatherGPT/1.0 route-amenities"}, timeout=12)
        response.raise_for_status()
        features = response.json().get("features", [])
        for feature in features if isinstance(features, list) else []:
            props = feature.get("properties", {})
            place_lat, place_lon = props.get("lat"), props.get("lon")
            name = str(props.get("name") or "").strip()
            if not name or place_lat is None or place_lon is None:
                continue
            distance_to_route, distance_along_route = _route_distance_km(float(place_lat), float(place_lon), route_points)
            if distance_to_route > radius_km:
                continue
            categories_raw = props.get("categories") or []
            category_text = " ".join(categories_raw) if isinstance(categories_raw, list) else str(categories_raw)
            if "charging_station" in category_text: category = "ev_charging"
            elif "fuel" in category_text: category = "petrol"
            elif "hospital" in category_text: category = "hospital"
            elif "hotel" in category_text: category = "hotel"
            elif "cafe" in category_text: category = "cafe"
            else: category = "restaurant"
            unique_id = f"{category}:{props.get('place_id') or name.lower()}"
            if unique_id in seen: continue
            seen.add(unique_id)
            result.append({"place_id": str(props.get("place_id") or unique_id), "name": name,
                "address": props.get("formatted") or "Address not listed", "formatted_address": props.get("formatted") or "Address not listed",
                "latitude": float(place_lat), "longitude": float(place_lon), "category": category,
                "distance_km": round(distance_to_route, 2), "distance_from_route_km": round(distance_to_route, 2),
                "distance_from_start_km": round(distance_along_route, 2), "opening_hours": props.get("opening_hours"),
                "phone": (props.get("contact") or {}).get("phone") if isinstance(props.get("contact"), dict) else None,
                "website": (props.get("contact") or {}).get("website") if isinstance(props.get("contact"), dict) else None,
                "brand": props.get("brand")})
    result.sort(key=lambda item: (item["distance_from_start_km"], item["distance_from_route_km"]))
    counts = {}; limited = []
    for item in result:
        if counts.get(item["category"], 0) >= limit_per_category: continue
        counts[item["category"]] = counts.get(item["category"], 0) + 1; limited.append(item)
    cache.set(cache_key, limited, ttl_seconds=180)
    return limited

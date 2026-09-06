"""Location lookup for Indian cities, towns, and villages."""

from typing import Any

import requests


LOCATIONS: dict[str, dict[str, Any]] = {
    "delhi": {"name": "Delhi", "latitude": 28.6139, "longitude": 77.2090},
    "mumbai": {"name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777},
    "bangalore": {"name": "Bengaluru", "latitude": 12.9716, "longitude": 77.5946},
    "banglore": {"name": "Bengaluru", "latitude": 12.9716, "longitude": 77.5946},
    "bengaluru": {"name": "Bengaluru", "latitude": 12.9716, "longitude": 77.5946},
    "bombay": {"name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777},
    "chennai": {"name": "Chennai", "latitude": 13.0827, "longitude": 80.2707},
    "kolkata": {"name": "Kolkata", "latitude": 22.5726, "longitude": 88.3639},
    "hyderabad": {"name": "Hyderabad", "latitude": 17.3850, "longitude": 78.4867},
    "pune": {"name": "Pune", "latitude": 18.5204, "longitude": 73.8567},
    "ahmedabad": {"name": "Ahmedabad", "latitude": 23.0225, "longitude": 72.5714},
    "jaipur": {"name": "Jaipur", "latitude": 26.9124, "longitude": 75.7873},
    "lucknow": {"name": "Lucknow", "latitude": 26.8467, "longitude": 80.9462},
    "patna": {"name": "Patna", "latitude": 25.5941, "longitude": 85.1376},
    "bhopal": {"name": "Bhopal", "latitude": 23.2599, "longitude": 77.4126},
    "chandigarh": {"name": "Chandigarh", "latitude": 30.7333, "longitude": 76.7794},
    "bhubaneswar": {"name": "Bhubaneswar", "latitude": 20.2961, "longitude": 85.8245},
    "ranchi": {"name": "Ranchi", "latitude": 23.3441, "longitude": 85.3096},
}


def get_location(location_name: str | None) -> dict[str, Any] | None:
    """Resolve a place name to coordinates, using the global OSM geocoder.

    The local aliases keep common names fast; Nominatim provides nationwide
    coverage for smaller Indian towns and villages as well.
    """
    if not location_name:
        return None
    normalized = location_name.strip().lower()
    if normalized in LOCATIONS:
        return {**LOCATIONS[normalized], "source": "named_location"}

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": location_name.strip(),
                "countrycodes": "in",
                "format": "jsonv2",
                "limit": 1,
                "addressdetails": 1,
            },
            headers={"User-Agent": "WeatherGPT/1.0 (location lookup)"},
            timeout=10,
        )
        response.raise_for_status()
        results = response.json()
        if results:
            item = results[0]
            address = item.get("address", {})
            if address.get("country_code", "").lower() == "in":
                name = (
                    address.get("city")
                    or address.get("town")
                    or address.get("village")
                    or address.get("municipality")
                    or address.get("suburb")
                    or item.get("display_name", location_name).split(",")[0]
                )
                return {"name": name, "latitude": float(item["lat"]), "longitude": float(item["lon"])}

        # Open-Meteo's geocoder often has better coverage for Indian suburbs
        # and localities that are not returned by the first provider.
        response = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": location_name.strip(), "count": 10, "language": "en", "format": "json"},
            timeout=10,
        )
        response.raise_for_status()
        candidates = response.json().get("results", [])
        india = next((candidate for candidate in candidates if candidate.get("country_code") == "IN"), None)
        if india:
            return {
                "name": india.get("name", location_name.strip()),
                "latitude": float(india["latitude"]),
                "longitude": float(india["longitude"]),
            }
        return None
    except (requests.RequestException, ValueError, TypeError, KeyError, IndexError):
        return None


def reverse_geocode(latitude: float, longitude: float) -> dict[str, Any] | None:
    """Resolve coordinates to a nearby place using OpenStreetMap Nominatim."""
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": latitude, "lon": longitude, "format": "jsonv2", "zoom": 18, "addressdetails": 1},
            headers={"User-Agent": "WeatherGPT-development/1.0"},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        address = payload.get("address", {})
        # Prefer the smallest useful locality so users see names such as
        # "Vijay Vihar" instead of only the parent city "Delhi".
        area = (
            address.get("neighbourhood")
            or address.get("quarter")
            or address.get("suburb")
            or address.get("residential")
            or address.get("village")
            or address.get("town")
            or address.get("city")
        )
        city = address.get("city") or address.get("town") or address.get("village")
        label = f"{area}, {city}" if area and city and area.lower() != city.lower() else (area or city)
        return {
            "name": label or "Current location",
            "area": area or "Current area",
            "city": city or "",
            "state": address.get("state", ""),
            "latitude": latitude,
            "longitude": longitude,
            "display_name": payload.get("display_name", label or "Current location"),
        }
    except (requests.RequestException, ValueError, AttributeError):
        return None

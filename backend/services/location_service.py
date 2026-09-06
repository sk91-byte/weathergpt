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
    """Resolve coordinates to a detailed nearby locality using OSM Nominatim and fallbacks."""
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": latitude, "lon": longitude, "format": "jsonv2", "zoom": 18, "addressdetails": 1},
            headers={"User-Agent": "WeatherGPT-Locality/1.0"},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        address = payload.get("address", {})

        # If zoom 18 did not yield a specific sub-locality, query zoom 16 for broader locality/suburb
        if not any(address.get(k) for k in ["neighbourhood", "quarter", "suburb", "residential", "city_district"]):
            try:
                resp16 = requests.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={"lat": latitude, "lon": longitude, "format": "jsonv2", "zoom": 16, "addressdetails": 1},
                    headers={"User-Agent": "WeatherGPT-Locality/1.0"},
                    timeout=8,
                )
                if resp16.ok:
                    addr16 = resp16.json().get("address", {})
                    for k in ["neighbourhood", "quarter", "suburb", "residential", "city_district"]:
                        if addr16.get(k):
                            address[k] = addr16[k]
            except Exception:
                pass

        neighbourhood = address.get("neighbourhood") or address.get("housing_estate") or ""
        quarter = address.get("quarter") or address.get("subdivision") or ""
        suburb = address.get("suburb") or ""
        residential = address.get("residential") or ""
        city_district = address.get("city_district") or address.get("district") or address.get("subdistrict") or ""
        village = address.get("village") or address.get("hamlet") or ""
        town = address.get("town") or ""
        city = address.get("city") or address.get("municipality") or town or village or ""
        state = address.get("state", "")

        # Prefer the most specific useful locality (e.g., "Vijay Vihar" or "Rohini")
        area = (
            neighbourhood
            or quarter
            or suburb
            or residential
            or village
            or town
            or city_district
        )

        display_name = payload.get("display_name", "")
        # If area is missing or equals the parent city, parse leading segments from display_name
        if not area or area.strip().lower() == city.strip().lower():
            parts = [p.strip() for p in display_name.split(",") if p.strip()]
            for p in parts:
                p_lower = p.lower()
                if (
                    p_lower not in {city.lower(), state.lower(), "india"}
                    and not p.replace(" ", "").isdigit()
                    and not any(term in p_lower for term in ["district", "postal", "pin", "state"])
                ):
                    area = p
                    break

        if area and city and area.strip().lower() != city.strip().lower():
            label = f"{area.strip()}, {city.strip()}"
        elif area and state and area.strip().lower() != state.strip().lower():
            label = f"{area.strip()}, {state.strip()}"
        else:
            label = area or city or state or "Current location"

        return {
            "name": label or "Current location",
            "area": area or city or "Current area",
            "neighbourhood": neighbourhood,
            "quarter": quarter,
            "suburb": suburb,
            "residential": residential,
            "city_district": city_district,
            "village": village,
            "town": town,
            "city": city or "",
            "state": state,
            "latitude": latitude,
            "longitude": longitude,
            "display_name": display_name or label or "Current location",
        }
    except (requests.RequestException, ValueError, AttributeError):
        # Fallback to BigDataCloud reverse geocode if Nominatim is rate-limited or unavailable
        try:
            bdc_resp = requests.get(
                "https://api.bigdatacloud.net/data/reverse-geocode-client",
                params={"latitude": latitude, "longitude": longitude, "localityLanguage": "en"},
                headers={"User-Agent": "WeatherGPT-Locality/1.0"},
                timeout=8,
            )
            if bdc_resp.ok:
                bdc_data = bdc_resp.json()
                locality = bdc_data.get("locality") or ""
                city_name = bdc_data.get("city") or bdc_data.get("principalSubdivision") or ""
                state_name = bdc_data.get("principalSubdivision") or ""
                admin_items = bdc_data.get("localityInfo", {}).get("administrative", [])
                sub_area = ""
                if admin_items:
                    sub_area = admin_items[-1].get("name", "")
                chosen_area = sub_area or locality or city_name
                label_bdc = (
                    f"{chosen_area}, {city_name}"
                    if chosen_area and city_name and chosen_area.lower() != city_name.lower()
                    else (chosen_area or city_name)
                )
                return {
                    "name": label_bdc or "Current location",
                    "area": chosen_area or "",
                    "neighbourhood": chosen_area if chosen_area != city_name else "",
                    "quarter": "",
                    "suburb": "",
                    "residential": "",
                    "city_district": locality,
                    "village": "",
                    "town": "",
                    "city": city_name,
                    "state": state_name,
                    "latitude": latitude,
                    "longitude": longitude,
                    "display_name": f"{chosen_area}, {city_name}, {state_name}, India",
                }
        except Exception:
            pass
        return None

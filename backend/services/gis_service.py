"""Map-ready weather data; no map tiles or location history are stored."""

from typing import Any

from backend.services.weather_service import get_current_weather
from backend.services.json_data_service import nearby_reports


def get_map_weather(latitude: float, longitude: float, zoom: int) -> dict[str, Any]:
    weather = get_current_weather(latitude, longitude)
    features = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [longitude, latitude]}, "properties": weather["current"]}]
    for report in nearby_reports(latitude, longitude, 100):
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [report["longitude"], report["latitude"]]}, "properties": {"kind": "citizen_report", **report}})
    return {
        "type": "FeatureCollection", "data_source": weather["source"], "is_demo": False,
        "features": features,
        "map": {"zoom": zoom, "layers": ["temperature", "rainfall", "wind", "alerts"]},
    }

"""Small future-facing digital-twin representation."""


def build_digital_twin(location: dict, weather: dict, risk: dict, reports: list[dict] | None = None, alerts: list[dict] | None = None) -> dict:
    return {"location": location, "weather": weather, "risk": risk, "infrastructure": [], "population": None, "reports": reports or [], "alerts": alerts or [], "capabilities": ["flood_simulation", "urban_heat", "traffic_weather_impact", "critical_infrastructure"]}

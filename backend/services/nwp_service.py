"""Provider-neutral numerical-weather-prediction interfaces."""

from typing import Any, Protocol


class NWPProvider(Protocol):
    name: str
    def get_forecast_data(self, latitude: float, longitude: float) -> dict[str, Any]: ...


class UnavailableNWPProvider:
    def __init__(self, name: str): self.name = name
    def get_forecast_data(self, latitude: float, longitude: float) -> dict[str, Any]:
        return {"available": False, "provider": self.name, "message": f"{self.name} provider is not configured", "is_demo": False}

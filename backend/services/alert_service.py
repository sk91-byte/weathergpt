"""Normalized weather-alert providers."""

from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Protocol
from uuid import uuid4

from pydantic import BaseModel


class WeatherAlert(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    description: str
    source: str
    latitude: float
    longitude: float
    affected_area: str
    start_time: str
    end_time: str
    issued_at: str
    source_url: str | None = None
    is_demo: bool = False


class AlertProvider(Protocol):
    def list_alerts(self) -> list[WeatherAlert]: ...


class MockAlertProvider:
    """Development-only alerts; these are never official warnings."""

    def list_alerts(self) -> list[WeatherAlert]:
        now = datetime.now(timezone.utc).isoformat()
        return [WeatherAlert(
            id="demo-alert-delhi", alert_type="development_test", severity="advisory",
            title="Demo weather advisory", description="TEST DATA ONLY: not an official warning.",
            source="Mock Provider (DEMO)", latitude=28.6139, longitude=77.2090,
            affected_area="Demo area", start_time=now, end_time=now, issued_at=now,
            source_url=None, is_demo=True,
        )]


class OfficialAlertProvider:
    """Placeholder for a configured authoritative meteorological provider."""

    def list_alerts(self) -> list[WeatherAlert]:
        return []


def list_alerts(provider: AlertProvider | None = None) -> list[WeatherAlert]:
    return (provider or MockAlertProvider()).list_alerts()


def nearby_alerts(latitude: float, longitude: float, radius_km: float) -> list[WeatherAlert]:
    def distance(alert: WeatherAlert) -> float:
        p1, p2 = radians(latitude), radians(alert.latitude)
        dlat, dlon = p2 - p1, radians(alert.longitude - longitude)
        value = sin(dlat / 2) ** 2 + cos(p1) * cos(p2) * sin(dlon / 2) ** 2
        return 6371 * 2 * asin(sqrt(value))
    return [alert for alert in list_alerts() if distance(alert) <= radius_km]


def create_test_alert() -> WeatherAlert:
    alert = MockAlertProvider().list_alerts()[0]
    return alert.model_copy(update={"id": f"test-{uuid4()}", "title": "TEST alert", "is_demo": True})

"""Normalized weather-alert providers."""

from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Protocol
from uuid import uuid4

import requests
from pydantic import BaseModel

from backend.config import settings
from backend.services.imd_service import IMDClient, IMDServiceError, _records, _value, imd_access_configured


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
    """Adapter for a configured authoritative alert feed.

    The feed URL is intentionally configuration-driven because official
    providers expose different schemas and access arrangements. Without a
    configured feed this provider returns no alerts; it never falls back to a
    demo alert in a production request.
    """

    def list_alerts(self) -> list[WeatherAlert]:
        if not settings.official_alerts_url:
            return []
        headers = {"Accept": "application/json", "User-Agent": "WeatherGPT/1.0"}
        if settings.official_alerts_api_key:
            headers["Authorization"] = f"Bearer {settings.official_alerts_api_key}"
        try:
            response = requests.get(settings.official_alerts_url, headers=headers, timeout=15)
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError):
            return []
        items = payload if isinstance(payload, list) else payload.get("alerts", payload.get("data", [])) if isinstance(payload, dict) else []
        if not isinstance(items, list):
            return []
        normalized: list[WeatherAlert] = []
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            latitude = item.get("latitude", item.get("lat"))
            longitude = item.get("longitude", item.get("lon", item.get("lng")))
            if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
                continue
            normalized.append(WeatherAlert(
                id=str(item.get("id", item.get("identifier", f"official-{index}"))),
                alert_type=str(item.get("alert_type", item.get("event", "weather"))),
                severity=str(item.get("severity", item.get("urgency", "advisory"))),
                title=str(item.get("title", item.get("headline", "Official weather alert"))),
                description=str(item.get("description", item.get("instruction", "See the official source for details."))),
                source=str(item.get("source", "Official meteorological provider")),
                latitude=float(latitude), longitude=float(longitude),
                affected_area=str(item.get("affected_area", item.get("area", "Specified alert area"))),
                start_time=str(item.get("start_time", item.get("effective", ""))),
                end_time=str(item.get("end_time", item.get("expires", ""))),
                issued_at=str(item.get("issued_at", item.get("sent", ""))),
                source_url=item.get("source_url", item.get("web")),
                is_demo=False,
            ))
        return normalized


class IMDAlertProvider:
    """Read an IMD district warning for an explicitly configured district."""

    warning_names = {
        "2": "Heavy rain", "3": "Heavy snow", "4": "Thunderstorm and lightning",
        "5": "Hailstorm", "6": "Dust storm", "7": "Dust-raising winds",
        "8": "Strong surface winds", "9": "Heat wave", "10": "Hot day",
        "11": "Warm night", "12": "Cold wave", "13": "Cold day",
        "14": "Ground frost", "15": "Fog", "16": "Very heavy rain", "17": "Extremely heavy rain",
    }

    def list_alerts(self) -> list[WeatherAlert]:
        if not settings.imd_district_id:
            return []
        try:
            records = _records(IMDClient().get("districtwarning", {"id": settings.imd_district_id}))
        except IMDServiceError:
            return []
        if not records:
            return []
        record = records[0]
        district = str(_value(record, "district") or "Configured IMD district")
        issued_at = str(_value(record, "date", "utc") or "Unavailable")
        latitude = settings.imd_alert_latitude or 0.0
        longitude = settings.imd_alert_longitude or 0.0
        alerts: list[WeatherAlert] = []
        color_severity = {"1": "Extreme", "2": "High", "3": "Moderate", "4": "Low"}
        for day in range(1, 6):
            raw_codes = str(_value(record, f"Day_{day}") or "")
            codes = [code.strip() for code in raw_codes.split(",") if code.strip() and code.strip() != "1"]
            color = str(_value(record, f"Day{day}_Color") or "3")
            for code in codes:
                title = self.warning_names.get(code, "IMD weather warning")
                alerts.append(WeatherAlert(
                    id=f"imd-{settings.imd_district_id}-day{day}-{code}", alert_type=title.lower().replace(" ", "_"),
                    severity=color_severity.get(color, "Moderate"), title=f"IMD warning: {title}",
                    description=f"India Meteorological Department warning for {district}, day {day}: {title}.",
                    source="India Meteorological Department", latitude=latitude, longitude=longitude,
                    affected_area=district, start_time=issued_at, end_time=str(_value(record, "date") or "Unavailable"),
                    issued_at=issued_at, source_url="https://mausam.imd.gov.in/responsive/districtWiseWarningGIS.php", is_demo=False,
                ))
        return alerts


def list_alerts(provider: AlertProvider | None = None) -> list[WeatherAlert]:
    if provider:
        return provider.list_alerts()
    if imd_access_configured() and settings.imd_district_id:
        return IMDAlertProvider().list_alerts()
    return OfficialAlertProvider().list_alerts()


def alert_feed_status() -> dict[str, object]:
    return {
        "configured": bool(settings.official_alerts_url),
        "source": "configured official provider" if settings.official_alerts_url else None,
        "imd_configured": bool(imd_access_configured() and settings.imd_district_id),
        "imd_location_configured": settings.imd_alert_latitude is not None and settings.imd_alert_longitude is not None,
        "demo_data_enabled": False,
    }


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

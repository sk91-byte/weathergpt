"""Normalized weather-alert providers."""

from datetime import datetime, timezone
from html import unescape
from math import asin, cos, radians, sin, sqrt
from typing import Protocol
from uuid import uuid4
from xml.etree import ElementTree

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
    distance_km: float | None = None


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


class SachetAlertProvider:
    """Parse NDMA SACHET CAP/RSS alerts into the app's normalized alert model."""

    severity_map = {
        "extreme": "Extreme", "severe": "High", "moderate": "Moderate",
        "minor": "Low", "unknown": "Low", "advisory": "Low",
    }

    @staticmethod
    def _local_name(tag: str) -> str:
        return tag.rsplit("}", 1)[-1].lower()

    @classmethod
    def _value(cls, node: ElementTree.Element, name: str) -> str:
        for child in node.iter():
            if cls._local_name(child.tag) == name.lower() and child.text:
                return unescape(child.text.strip())
        return ""

    @staticmethod
    def _coordinates(area: ElementTree.Element) -> tuple[float, float]:
        circle = ""
        polygon = ""
        for child in area.iter():
            name = child.tag.rsplit("}", 1)[-1].lower()
            if name == "circle" and child.text:
                circle = child.text.strip()
            if name == "polygon" and child.text:
                polygon = child.text.strip()
        point = circle.split()[0] if circle else (polygon.split()[0] if polygon else "")
        try:
            latitude, longitude = [float(value.strip()) for value in point.split(",")[:2]]
            return latitude, longitude
        except (TypeError, ValueError):
            return 0.0, 0.0

    @classmethod
    def _cap_alerts(cls, root: ElementTree.Element, source_url: str) -> list[WeatherAlert]:
        alerts: list[WeatherAlert] = []
        alert_nodes = [node for node in root.iter() if cls._local_name(node.tag) == "alert"]
        for index, alert_node in enumerate(alert_nodes):
            info_nodes = [node for node in alert_node if cls._local_name(node.tag) == "info"]
            info = info_nodes[0] if info_nodes else alert_node
            areas = [node for node in info.iter() if cls._local_name(node.tag) == "area"]
            area = areas[0] if areas else info
            event = cls._value(info, "event") or "Weather emergency"
            headline = cls._value(info, "headline") or event
            description = cls._value(info, "description") or cls._value(info, "instruction") or headline
            severity_raw = cls._value(info, "severity") or cls._value(info, "urgency") or "advisory"
            latitude, longitude = cls._coordinates(area)
            identifier = cls._value(alert_node, "identifier") or f"sachet-{index}"
            alerts.append(WeatherAlert(
                id=identifier, alert_type=event.lower().replace(" ", "_"),
                severity=cls.severity_map.get(severity_raw.lower(), "Moderate"),
                title=headline, description=description, source="NDMA SACHET",
                latitude=latitude, longitude=longitude,
                affected_area=cls._value(area, "areadesc") or "India",
                start_time=cls._value(info, "effective"), end_time=cls._value(info, "expires"),
                issued_at=cls._value(alert_node, "sent") or cls._value(info, "effective"),
                source_url=source_url, is_demo=False,
            ))
        return alerts

    @classmethod
    def _rss_alerts(cls, root: ElementTree.Element, source_url: str) -> list[WeatherAlert]:
        alerts: list[WeatherAlert] = []
        items = [node for node in root.iter() if cls._local_name(node.tag) == "item"]
        for index, item in enumerate(items):
            title = cls._value(item, "title") or "SACHET disaster alert"
            description = cls._value(item, "description") or title
            link = cls._value(item, "link") or source_url
            issued = cls._value(item, "pubdate") or cls._value(item, "date")
            alerts.append(WeatherAlert(
                id=cls._value(item, "guid") or f"sachet-rss-{index}", alert_type="disaster_alert",
                severity="High", title=title, description=description,
                source="NDMA SACHET", latitude=0.0, longitude=0.0,
                affected_area="India", start_time=issued, end_time="", issued_at=issued,
                source_url=link, is_demo=False,
            ))
        return alerts

    def list_alerts(self) -> list[WeatherAlert]:
        try:
            response = requests.get(
                settings.sachet_alerts_url,
                headers={"Accept": "application/cap+xml, application/rss+xml, application/xml, text/xml", "User-Agent": "WeatherGPT/1.0"},
                timeout=15,
            )
            response.raise_for_status()
            root = ElementTree.fromstring(response.content)
            if self._local_name(root.tag) == "rss" or any(self._local_name(node.tag) == "item" for node in root.iter()):
                return self._rss_alerts(root, settings.sachet_alerts_url)
            return self._cap_alerts(root, settings.sachet_alerts_url)
        except (requests.RequestException, ElementTree.ParseError, ValueError):
            return []


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
    if settings.sachet_alerts_enabled:
        return SachetAlertProvider().list_alerts()
    return OfficialAlertProvider().list_alerts()


def alert_feed_status() -> dict[str, object]:
    return {
        "configured": bool(settings.official_alerts_url),
        "source": "configured official provider" if settings.official_alerts_url else None,
        "imd_configured": bool(imd_access_configured() and settings.imd_district_id),
        "imd_location_configured": settings.imd_alert_latitude is not None and settings.imd_alert_longitude is not None,
        "sachet_configured": settings.sachet_alerts_enabled and bool(settings.sachet_alerts_url),
        "sachet_source": settings.sachet_alerts_url if settings.sachet_alerts_enabled else None,
        "demo_data_enabled": False,
    }


def nearby_alerts(latitude: float, longitude: float, radius_km: float, location_name: str | None = None) -> list[WeatherAlert]:
    def distance(alert: WeatherAlert) -> float:
        # CAP feeds may publish nationwide alerts without a coordinate.
        if alert.latitude == 0.0 and alert.longitude == 0.0:
            search_text = f"{alert.title} {alert.description} {alert.affected_area}".lower()
            selected_location = (location_name or "").lower().strip()
            if not selected_location or selected_location in {"india", "current location"}:
                return float("inf")
            return 0.0 if selected_location in search_text else float("inf")
        p1, p2 = radians(latitude), radians(alert.latitude)
        dlat, dlon = p2 - p1, radians(alert.longitude - longitude)
        value = sin(dlat / 2) ** 2 + cos(p1) * cos(p2) * sin(dlon / 2) ** 2
        return 6371 * 2 * asin(sqrt(value))
    matched: list[WeatherAlert] = []
    for alert in list_alerts():
        distance_km = distance(alert)
        if distance_km <= radius_km:
            matched.append(alert.model_copy(update={"distance_km": round(distance_km, 2)}))
    return matched


def create_test_alert() -> WeatherAlert:
    alert = MockAlertProvider().list_alerts()[0]
    return alert.model_copy(update={"id": f"test-{uuid4()}", "title": "TEST alert", "is_demo": True})

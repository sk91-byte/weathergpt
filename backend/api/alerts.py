"""Safe normalized alert endpoints."""

from fastapi import APIRouter, HTTPException, Query

from backend.services.alert_service import alert_feed_status, create_test_alert, list_alerts, nearby_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def get_alerts() -> list[dict]:
    return [alert.model_dump() for alert in list_alerts()]


@router.get("/nearby")
def get_nearby_alerts(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), radius_km: float = Query(25, gt=0, le=500)) -> list[dict]:
    return [alert.model_dump() for alert in nearby_alerts(latitude, longitude, radius_km)]


@router.get("/status")
def get_alert_status() -> dict:
    """Show whether an authoritative feed is configured; never implies alerts exist."""
    return alert_feed_status()


@router.get("/{alert_id}")
def get_alert(alert_id: str) -> dict:
    alert = next((item for item in list_alerts() if item.id == alert_id), None)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert.model_dump()


@router.post("/test")
def test_alert() -> dict:
    return create_test_alert().model_dump()

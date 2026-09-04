"""NWP status endpoint."""

from fastapi import APIRouter

from backend.services.gfs_provider import GFSProvider
from backend.services.wrf_provider import WRFProvider

router = APIRouter(prefix="/nwp", tags=["nwp"])


@router.get("/status")
def nwp_status() -> dict:
    return {"providers": [GFSProvider().get_forecast_data(0, 0), WRFProvider().get_forecast_data(0, 0)]}

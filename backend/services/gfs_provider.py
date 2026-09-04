"""GFS adapter placeholder; no GRIB data is claimed as live."""

from backend.services.nwp_service import UnavailableNWPProvider


class GFSProvider(UnavailableNWPProvider):
    def __init__(self): super().__init__("GFS")

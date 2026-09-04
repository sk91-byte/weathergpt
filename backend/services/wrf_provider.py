"""WRF adapter placeholder; running WRF requires external model infrastructure."""

from backend.services.nwp_service import UnavailableNWPProvider


class WRFProvider(UnavailableNWPProvider):
    def __init__(self): super().__init__("WRF")

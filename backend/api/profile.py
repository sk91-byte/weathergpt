"""Local development profile and preference storage."""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from backend.services.json_data_service import get_profile, update_profile
from backend.services.language_service import is_supported_language

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=320)
    language: str | None = Field(default=None, max_length=12)
    profile_type: str | None = Field(default=None, max_length=40)
    temperature_unit: str | None = Field(default=None, max_length=12)
    wind_unit: str | None = Field(default=None, max_length=12)
    location: dict[str, Any] | None = None
    route: dict[str, Any] | None = None
    notifications_enabled: bool | None = None

    @field_validator("language")
    @classmethod
    def language_must_be_supported(cls, value: str | None) -> str | None:
        if value is not None and not is_supported_language(value):
            raise ValueError("unsupported language code; use GET /languages")
        return value.lower().strip() if value else value


@router.get("")
def profile() -> dict[str, Any]:
    return get_profile()


@router.put("")
def save_profile(request: ProfileUpdate) -> dict[str, Any]:
    return update_profile(request.model_dump(exclude_none=True))


@router.patch("")
def patch_profile(request: ProfileUpdate) -> dict[str, Any]:
    return update_profile(request.model_dump(exclude_none=True))

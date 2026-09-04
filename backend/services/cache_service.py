"""Replaceable cache interface; Redis can be added without changing weather code."""

from typing import Any


class CacheService:
    def __init__(self) -> None:
        self._values: dict[str, Any] = {}

    def get(self, key: str) -> Any:
        return self._values.get(key)

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        self._values[key] = value

    def delete(self, key: str) -> None:
        self._values.pop(key, None)

    def exists(self, key: str) -> bool:
        return key in self._values


cache = CacheService()

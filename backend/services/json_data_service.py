"""Local JSON persistence for WeatherGPT development.

The file is intentionally local and git-ignored. Writes are locked and
performed through a temporary file so an interrupted write does not corrupt
the store. This is a development data store, not a multi-user production DB.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any
from uuid import uuid4

from backend.config import settings


MAX_MESSAGES = 40
_lock = RLock()


def _path() -> Path:
    path = Path(settings.json_data_file)
    if not path.is_absolute():
        path = Path.cwd() / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _empty() -> dict[str, Any]:
    return {"schema_version": 1, "users": {}, "preferences": {}, "conversations": {}, "messages": {}, "locations": {}, "routes": {}, "alerts": [], "data_sources": [], "reports": [], "decisions": {}, "template_candidates": []}


def _read() -> dict[str, Any]:
    path = _path()
    if not path.exists():
        return _empty()
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(value, dict):
            return _empty()
        base = _empty()
        for key, item in value.items():
            if key in base:
                base[key] = item
        return base
    except (OSError, json.JSONDecodeError):
        return _empty()


def _write(data: dict[str, Any]) -> None:
    path = _path()
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, path)


def _ensure_user(data: dict[str, Any], user_id: str = "local-user") -> dict[str, Any]:
    if user_id not in data["users"]:
        data["users"][user_id] = {"user_id": user_id, "name": None, "email": None, "created_at": _now(), "updated_at": _now(), "is_active": True}
    return data["users"][user_id]


def create_or_get_conversation(conversation_id: str | None = None, user_id: str = "local-user") -> dict[str, Any]:
    with _lock:
        data = _read()
        _ensure_user(data, user_id)
        cid = conversation_id or str(uuid4())
        conversation = data["conversations"].get(cid)
        if conversation is None:
            conversation = {"conversation_id": cid, "user_id": user_id, "title": "Weather conversation", "created_at": _now(), "updated_at": _now(), "last_message_at": None, "state": {}}
            data["conversations"][cid] = conversation
            data["messages"][cid] = []
            _write(data)
        return {**conversation, "messages": list(data["messages"].get(cid, []))}


def get_conversation(conversation_id: str) -> dict[str, Any] | None:
    with _lock:
        data = _read()
        conversation = data["conversations"].get(conversation_id)
        return {**conversation, "messages": list(data["messages"].get(conversation_id, []))} if conversation else None


def add_message(conversation_id: str, role: str, content: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    with _lock:
        data = _read()
        conversation = data["conversations"].get(conversation_id)
        if conversation is None:
            conversation = data["conversations"].setdefault(conversation_id, {"conversation_id": conversation_id, "user_id": "local-user", "title": "Weather conversation", "created_at": _now(), "updated_at": _now(), "last_message_at": None, "state": {}})
        item = {"role": role, "content": content, "created_at": _now(), "metadata": metadata or {}}
        data["messages"].setdefault(conversation_id, []).append(item)
        data["messages"][conversation_id] = data["messages"][conversation_id][-MAX_MESSAGES:]
        conversation["updated_at"] = _now()
        conversation["last_message_at"] = conversation["updated_at"]
        if metadata and isinstance(metadata.get("context"), dict):
            conversation["state"] = metadata["context"]
            state = metadata["context"]
            location_name = state.get("last_location")
            if location_name:
                data["locations"][location_name.lower()] = {"name": location_name, "latitude": state.get("last_latitude"), "longitude": state.get("last_longitude"), "source": state.get("location_source"), "updated_at": _now()}
        _ensure_user(data, conversation.get("user_id", "local-user"))["updated_at"] = _now()
        _write(data)
        return {**conversation, "messages": list(data["messages"].get(conversation_id, []))}


def list_conversations() -> list[dict[str, Any]]:
    with _lock:
        data = _read()
        return [{**item, "messages": []} for item in data["conversations"].values()]


def conversation_messages(conversation_id: str, limit: int = MAX_MESSAGES) -> list[dict[str, Any]]:
    conversation = get_conversation(conversation_id)
    return (conversation or {}).get("messages", [])[-limit:]


def delete_conversation(conversation_id: str) -> bool:
    with _lock:
        data = _read()
        if conversation_id not in data["conversations"]:
            return False
        data["conversations"].pop(conversation_id, None)
        data["messages"].pop(conversation_id, None)
        _write(data)
        return True


def get_profile(user_id: str = "local-user") -> dict[str, Any]:
    with _lock:
        data = _read()
        user = _ensure_user(data, user_id)
        defaults = {"language": "en", "profile_type": "general_public", "temperature_unit": "celsius", "wind_unit": "kmh", "location": None, "route": None, "notifications_enabled": True}
        preference = {**defaults, **data["preferences"].get(user_id, {})}
        return {"user": user, "preferences": preference}


def update_profile(values: dict[str, Any], user_id: str = "local-user") -> dict[str, Any]:
    with _lock:
        data = _read()
        user = _ensure_user(data, user_id)
        user["updated_at"] = _now()
        defaults = {"language": "en", "profile_type": "general_public", "temperature_unit": "celsius", "wind_unit": "kmh", "location": None, "route": None, "notifications_enabled": True}
        preference = {**defaults, **data["preferences"].get(user_id, {})}
        data["preferences"][user_id] = preference
        for key in ("name", "email"):
            if key in values: user[key] = values[key]
        for key in ("language", "profile_type", "temperature_unit", "wind_unit", "location", "route", "notifications_enabled"):
            if key in values: preference[key] = values[key]
        if preference.get("location"):
            data["locations"][str(preference["location"].get("name", "saved-location")).lower()] = {**preference["location"], "saved_by_user": True, "updated_at": _now()}
        if preference.get("route"):
            route_id = str(preference["route"].get("route_id", uuid4())) if isinstance(preference["route"], dict) else str(uuid4())
            data["routes"][route_id] = preference["route"]
        _write(data)
        return {"user": user, "preferences": preference}


def add_report(report: dict[str, Any]) -> dict[str, Any]:
    with _lock:
        data = _read()
        data["reports"].append(report)
        _write(data)
        return report


def nearby_reports(latitude: float, longitude: float, radius_km: float = 25) -> list[dict[str, Any]]:
    """Approximate nearby lookup using a bounding box; suitable for the JSON foundation."""
    with _lock:
        data = _read()
        lat_delta = radius_km / 111.0
        lon_delta = radius_km / max(1.0, 111.0 * abs(__import__("math").cos(latitude * 3.1415926535 / 180.0)))
        return [item for item in data["reports"] if abs(float(item.get("latitude", 999)) - latitude) <= lat_delta and abs(float(item.get("longitude", 999)) - longitude) <= lon_delta]


def save_decision(decision: dict[str, Any]) -> dict[str, Any]:
    with _lock:
        data = _read()
        data["decisions"][decision["decision_id"]] = decision
        _write(data)
        return decision


def get_saved_decision(decision_id: str) -> dict[str, Any] | None:
    with _lock:
        return _read()["decisions"].get(decision_id)


def save_template_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    """Store a new Gemini-derived pattern for review, never auto-approve it."""
    with _lock:
        data = _read()
        item = {**candidate, "approval_status": "pending", "created_at": _now()}
        data["template_candidates"].append(item)
        data["template_candidates"] = data["template_candidates"][-500:]
        _write(data)
        return item


def list_template_candidates(status: str | None = None) -> list[dict[str, Any]]:
    with _lock:
        values = _read().get("template_candidates", [])
        return values if not status else [item for item in values if item.get("approval_status") == status]

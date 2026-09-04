"""Small replaceable short-term conversation store.

This deliberately keeps only recent, non-sensitive chat content in memory.  A
database-backed implementation can later provide the same functions.
"""

from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4
from typing import Any
import asyncio

from backend.config import settings


MAX_MESSAGES = 20
_conversations: dict[str, dict[str, Any]] = {}
_lock = Lock()


def _postgres_enabled() -> bool:
    return bool(settings.database_url and settings.storage_mode.lower() == "postgres")


def _json_enabled() -> bool:
    return settings.storage_mode.lower() == "json" or not _postgres_enabled()


def _run(coro: Any) -> Any:
    return asyncio.run(coro)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_conversation(conversation_id: str | None = None) -> dict[str, Any]:
    if _postgres_enabled():
        from backend.database.database import SessionFactory
        from backend.repositories.conversation_repository import get_or_create
        async def operation() -> dict[str, Any]:
            async with SessionFactory() as session:
                return await get_or_create(session, conversation_id)
        return _run(operation())
    if _json_enabled():
        from backend.services.json_data_service import create_or_get_conversation
        return create_or_get_conversation(conversation_id)
    conversation = {"conversation_id": conversation_id or str(uuid4()), "messages": [], "created_at": _now(), "updated_at": _now()}
    with _lock:
        _conversations[conversation["conversation_id"]] = conversation
    return conversation


def get_conversation(conversation_id: str | None) -> dict[str, Any] | None:
    if not conversation_id:
        return None
    if _postgres_enabled():
        from backend.database.database import SessionFactory
        from backend.repositories.conversation_repository import get
        async def operation() -> dict[str, Any] | None:
            async with SessionFactory() as session:
                return await get(session, conversation_id)
        return _run(operation())
    if _json_enabled():
        from backend.services.json_data_service import get_conversation as get_json_conversation
        return get_json_conversation(conversation_id)
    with _lock:
        conversation = _conversations.get(conversation_id)
        return dict(conversation) if conversation else None


def add_message(conversation_id: str, role: str, content: str, **metadata: Any) -> dict[str, Any]:
    if _postgres_enabled():
        from backend.database.database import SessionFactory
        from backend.repositories.conversation_repository import add, get
        async def operation() -> dict[str, Any]:
            async with SessionFactory() as session:
                await add(session, conversation_id, role, content, metadata)
                return (await get(session, conversation_id)) or {"conversation_id": conversation_id, "messages": []}
        return _run(operation())
    if _json_enabled():
        from backend.services.json_data_service import add_message as add_json_message
        return add_json_message(conversation_id, role, content, metadata)
    with _lock:
        conversation = _conversations.setdefault(
            conversation_id,
            {"conversation_id": conversation_id, "messages": [], "created_at": _now(), "updated_at": _now()},
        )
        item: dict[str, Any] = {"role": role, "content": content}
        item.update(metadata)
        conversation["messages"].append(item)
        conversation["messages"] = conversation["messages"][-MAX_MESSAGES:]
        conversation["updated_at"] = _now()
        return dict(conversation)


def clear_conversation(conversation_id: str) -> bool:
    if _postgres_enabled():
        from backend.database.database import SessionFactory
        from backend.repositories.conversation_repository import clear
        async def operation() -> bool:
            async with SessionFactory() as session:
                return await clear(session, conversation_id)
        return _run(operation())
    if _json_enabled():
        from backend.services.json_data_service import delete_conversation as delete_json_conversation
        return delete_json_conversation(conversation_id)
    with _lock:
        return _conversations.pop(conversation_id, None) is not None


def conversation_context(conversation: dict[str, Any] | None) -> dict[str, Any]:
    """Return the last structured weather context without exposing the store."""
    if not conversation:
        return {}
    state = conversation.get("state")
    if isinstance(state, dict) and state:
        return state
    for message in reversed(conversation.get("messages", [])):
        context = message.get("context")
        if isinstance(context, dict):
            return context
    return {}


def list_conversations() -> list[dict[str, Any]]:
    if _json_enabled():
        from backend.services.json_data_service import list_conversations as list_json_conversations
        return list_json_conversations()
    if not _postgres_enabled():
        with _lock:
            return [{key: value for key, value in item.items() if key != "messages"} for item in _conversations.values()]
    from backend.database.database import SessionFactory
    from backend.repositories.conversation_repository import list_all
    async def operation() -> list[dict[str, Any]]:
        async with SessionFactory() as session:
            return await list_all(session)
    return _run(operation())


def conversation_messages(conversation_id: str, limit: int = MAX_MESSAGES) -> list[dict[str, Any]]:
    if _json_enabled():
        from backend.services.json_data_service import conversation_messages as json_messages
        return json_messages(conversation_id, limit)
    if not _postgres_enabled():
        conversation = get_conversation(conversation_id)
        return (conversation or {}).get("messages", [])[-limit:]
    from backend.database.database import SessionFactory
    from backend.repositories.conversation_repository import messages
    async def operation() -> list[dict[str, Any]]:
        async with SessionFactory() as session:
            return await messages(session, conversation_id, limit)
    return _run(operation())


def delete_conversation(conversation_id: str) -> bool:
    if _json_enabled():
        from backend.services.json_data_service import delete_conversation as delete_json_conversation
        return delete_json_conversation(conversation_id)
    if not _postgres_enabled():
        return clear_conversation(conversation_id)
    from backend.database.database import SessionFactory
    from backend.repositories.conversation_repository import clear
    async def operation() -> bool:
        async with SessionFactory() as session:
            return await clear(session, conversation_id)
    return _run(operation())

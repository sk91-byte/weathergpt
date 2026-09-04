"""Async PostgreSQL repository for conversations and recent messages."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Conversation, Message


def _uuid(value: str | None) -> UUID | None:
    try:
        return UUID(value) if value else None
    except ValueError:
        return None


async def get_or_create(session: AsyncSession, conversation_id: str | None) -> dict:
    parsed = _uuid(conversation_id)
    item = await session.get(Conversation, parsed) if conversation_id else None
    if item is None:
        item = Conversation(id=parsed, title="Weather conversation")
        session.add(item)
        await session.flush()
    return _dump(item)


async def get(session: AsyncSession, conversation_id: str) -> dict | None:
    item = await session.get(Conversation, _uuid(conversation_id))
    return _dump(item) if item else None


async def add(session: AsyncSession, conversation_id: str, role: str, content: str, metadata: dict | None = None) -> None:
    item = await session.get(Conversation, _uuid(conversation_id))
    if item is None:
        return
    item.last_message_at = datetime.now(timezone.utc)
    if metadata and isinstance(metadata.get("context"), dict):
        item.state = metadata["context"]
    session.add(Message(conversation_id=item.id, role=role, content=content, metadata_json=metadata or {}))
    await session.commit()


async def list_all(session: AsyncSession) -> list[dict]:
    rows = (await session.execute(select(Conversation).order_by(Conversation.updated_at.desc()))).scalars().all()
    return [_dump(item) for item in rows]


async def messages(session: AsyncSession, conversation_id: str, limit: int = 20) -> list[dict]:
    rows = (await session.execute(select(Message).where(Message.conversation_id == _uuid(conversation_id)).order_by(Message.created_at.desc()).limit(limit))).scalars().all()
    return [{"id": item.id, "role": item.role, "content": item.content, "created_at": item.created_at.isoformat(), "metadata": item.metadata_json} for item in reversed(rows)]


async def clear(session: AsyncSession, conversation_id: str) -> bool:
    result = await session.execute(delete(Conversation).where(Conversation.id == _uuid(conversation_id)))
    await session.commit()
    return bool(result.rowcount)


def _dump(item: Conversation) -> dict:
    return {"conversation_id": str(item.id), "title": item.title, "messages": [], "state": item.state or {}, "created_at": item.created_at.isoformat(), "updated_at": item.updated_at.isoformat(), "last_message_at": item.last_message_at.isoformat() if item.last_message_at else None}

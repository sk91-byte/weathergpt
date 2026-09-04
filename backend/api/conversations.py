"""Conversation history endpoints.

Authentication is intentionally not implemented yet. In development these
endpoints use possession of the opaque conversation ID as the temporary access
mechanism; this is not production authorization.
"""

from fastapi import APIRouter, HTTPException, Query

from backend.services.conversation_service import conversation_messages, delete_conversation, get_conversation, list_conversations

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("")
def conversations() -> list[dict]:
    return list_conversations()


@router.get("/{conversation_id}")
def conversation(conversation_id: str) -> dict:
    item = get_conversation(conversation_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    item.pop("messages", None)
    return item


@router.get("/{conversation_id}/messages")
def conversation_history(conversation_id: str, limit: int = Query(20, ge=1, le=100)) -> list[dict]:
    if get_conversation(conversation_id) is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation_messages(conversation_id, limit)


@router.delete("/{conversation_id}")
def remove_conversation(conversation_id: str) -> dict[str, bool]:
    if not delete_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": True}

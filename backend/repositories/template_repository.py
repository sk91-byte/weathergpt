"""Async PostgreSQL repository for reviewable response-template candidates."""

from hashlib import sha256

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import TemplateCandidate


def fingerprint(candidate: dict) -> str:
    value = "|".join(str(candidate.get(key, "")) for key in ("persona", "language", "intent", "question"))
    return sha256(value.strip().lower().encode("utf-8")).hexdigest()


async def save_candidate(session: AsyncSession, candidate: dict) -> dict:
    key = fingerprint(candidate)
    existing = (await session.execute(select(TemplateCandidate).where(TemplateCandidate.fingerprint == key))).scalar_one_or_none()
    if existing:
        return dump(existing)
    item = TemplateCandidate(
        fingerprint=key,
        template_id=candidate["template_id"],
        persona=candidate["persona"],
        language=candidate["language"],
        intent=candidate["intent"],
        example_questions=candidate.get("example_questions", []),
        required_live_data=candidate.get("required_live_data", []),
        draft_answer=candidate["draft_answer"],
        recommended_questions=candidate.get("recommended_questions", []),
        answer_template=candidate.get("answer_template"),
        approval_status="pending",
        review_note=candidate.get("review_note"),
    )
    session.add(item)
    await session.commit()
    return dump(item)


async def list_candidates(session: AsyncSession, status: str | None = None) -> list[dict]:
    query = select(TemplateCandidate).order_by(TemplateCandidate.created_at.desc())
    if status:
        query = query.where(TemplateCandidate.approval_status == status)
    return [dump(item) for item in (await session.execute(query)).scalars().all()]


def dump(item: TemplateCandidate) -> dict:
    return {
        "id": item.id,
        "template_id": item.template_id,
        "persona": item.persona,
        "language": item.language,
        "intent": item.intent,
        "example_questions": item.example_questions or [],
        "required_live_data": item.required_live_data or [],
        "draft_answer": item.draft_answer,
        "recommended_questions": item.recommended_questions or [],
        "answer_template": item.answer_template,
        "approval_status": item.approval_status,
        "review_note": item.review_note,
        "created_at": item.created_at.isoformat(),
    }

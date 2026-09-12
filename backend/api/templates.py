"""Approved quick-question catalogue exposed to the chat UI."""

from fastapi import APIRouter, Query

from backend.services.template_service import recommended_questions, template_count

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/recommended")
def get_recommended_questions(
    persona: str = Query(default="citizen", max_length=40),
    language: str = Query(default="en", max_length=20),
    has_route: bool = False,
) -> dict[str, object]:
    return {
        "questions": recommended_questions(persona, language, has_route),
        "source": "approved_template_catalogue",
        "template_count": template_count(),
    }

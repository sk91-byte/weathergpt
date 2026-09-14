"""Voice APIs: provider-backed STT/TTS routed through the normal chat pipeline."""

import base64

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, field_validator

from backend.services.voice_service import VoiceServiceError, configured_provider, voice_health
from backend.services.language_service import is_supported_language
from backend.services.chat_service import process_chat_message

router = APIRouter(prefix="/voice", tags=["voice"])


class SynthesisRequest(BaseModel):
    text: str
    language: str = "en"

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        if not is_supported_language(value):
            raise ValueError("unsupported language code; use GET /languages")
        return value.lower().strip()


class VoiceChatRequest(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    conversation_id: str | None = None
    language: str = "en"
    profile_type: str = "general_public"

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        value = value.lower().strip()
        if not is_supported_language(value):
            raise ValueError("unsupported language code; use GET /languages")
        return value


MAX_AUDIO_BYTES = 10 * 1024 * 1024
ALLOWED_AUDIO_TYPES = {"audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/m4a", "audio/webm", "audio/ogg", "application/ogg", "video/webm"}


def _read_audio_metadata(file: UploadFile, audio: bytes) -> None:
    if not audio:
        raise HTTPException(status_code=400, detail="The audio recording is empty")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio recording is too large (maximum 10 MB)")
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()
    valid_extension = filename.endswith((".wav", ".mp3", ".m4a", ".webm", ".ogg"))
    if content_type and content_type not in ALLOWED_AUDIO_TYPES and not valid_extension:
        raise HTTPException(status_code=415, detail="Unsupported audio format. Use WAV, MP3, M4A, WebM, or OGG")


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("en")) -> dict:
    language = language.lower().strip()
    if not is_supported_language(language):
        raise HTTPException(status_code=422, detail="unsupported language code; use GET /languages")
    audio = await file.read()
    _read_audio_metadata(file, audio)
    try:
        text = configured_provider().speech_to_text(audio, file.filename or "audio", language)
    except VoiceServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"text": text, "language": language, "provider": "Gemini", "success": True}


@router.post("/synthesize")
def synthesize(request: SynthesisRequest) -> dict:
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    try:
        audio = configured_provider().text_to_speech(request.text, request.language)
    except VoiceServiceError as exc:
        if "supported" in str(exc).lower():
            return {"success": False, "error_type": "language_not_supported"}
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"audio_base64": base64.b64encode(audio).decode("ascii"), "content_type": "audio/wav", "provider": "Gemini", "success": True}


@router.post("/chat")
async def voice_chat(
    file: UploadFile = File(...), latitude: float | None = Form(None), longitude: float | None = Form(None),
    conversation_id: str | None = Form(None), language: str = Form("en"), profile_type: str = Form("general_public")
) -> dict:
    language = language.lower().strip()
    if not is_supported_language(language):
        raise HTTPException(status_code=422, detail="unsupported language code; use GET /languages")
    audio = await file.read()
    _read_audio_metadata(file, audio)
    try:
        provider = configured_provider()
        transcription = provider.speech_to_text(audio, file.filename or "audio", language)
    except VoiceServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    result = process_chat_message(transcription, latitude=latitude, longitude=longitude, language=language, conversation_id=conversation_id, profile=profile_type)
    response_text = result.get("response", "")
    audio_base64 = None
    tts_error = None
    try:
        audio_base64 = base64.b64encode(provider.text_to_speech(response_text, language)).decode("ascii")
    except VoiceServiceError:
        tts_error = "Voice playback is temporarily unavailable; the text response is still available."
    return {"transcription": transcription, "response_text": response_text, "language": language, "conversation_id": result.get("conversation_id"), "data_source": result.get("data_source"), "ai_used": result.get("ai_used"), "decision": result.get("decision"), "audio_base64": audio_base64, "audio_content_type": "audio/wav" if audio_base64 else None, "tts_error": tts_error, "success": True}


@router.get("/health")
def health() -> dict:
    return voice_health()

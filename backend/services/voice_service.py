"""Provider-backed voice adapters. Raw audio is processed in memory only."""

import io
import os
import wave
from typing import Protocol

from google.genai import types

from backend.config import settings
from backend.services.llm_service import _client
from backend.services.language_service import get_language, supported_language_codes


class VoiceServiceError(Exception):
    """A safe, user-facing voice processing error."""


class VoiceProvider(Protocol):
    name: str
    def speech_to_text(self, audio: bytes, filename: str, language: str | None = None) -> str: ...
    def text_to_speech(self, text: str, language: str) -> bytes: ...


class GeminiVoiceProvider:
    """Gemini audio understanding plus Gemini native TTS."""
    name = "Gemini"

    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise VoiceServiceError("Voice provider is not configured")
        self.client = _client()

    def speech_to_text(self, audio: bytes, filename: str, language: str | None = None) -> str:
        try:
            mime_type = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/m4a", ".webm": "audio/webm", ".ogg": "audio/ogg"}.get(os.path.splitext(filename.lower())[1], "audio/wav")
            language_meta = get_language(language) if language else None
            language_hint = f"{language_meta['name']} ({language_meta['locale']})" if language_meta else "the spoken language"
            response = self.client.models.generate_content(
                model=os.getenv("GEMINI_VOICE_MODEL", settings.gemini_model),
                contents=[types.Part.from_text(text=f"Transcribe this audio exactly. The likely language is {language_hint}. Return only the spoken words, without commentary."), types.Part.from_bytes(data=audio, mime_type=mime_type)],
            )
            text = (response.text or "").strip()
            if not text:
                raise VoiceServiceError("No speech was detected")
            return text
        except VoiceServiceError:
            raise
        except Exception as exc:
            raise VoiceServiceError("Speech recognition failed") from exc

    def text_to_speech(self, text: str, language: str) -> bytes:
        try:
            language_meta = get_language(language)
            # Gemini TTS expects the base BCP-47 language code (for example
            # `hi`, not the browser recognition locale `hi-IN`).
            speech_locale = language_meta["locale"].split("-")[0]
            prompt = f"Speak naturally in {language_meta['name']} ({speech_locale}). Preserve names, numbers, and place names clearly.\n\nText to speak:\n{text}"
            response = self.client.models.generate_content(
                model=os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts"),
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        language_code=speech_locale,
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=os.getenv("GEMINI_TTS_VOICE", "Kore")
                            )
                        )
                    )
                )
            )
            data = response.candidates[0].content.parts[0].inline_data.data
            if not data:
                raise VoiceServiceError("No audio was generated")
            return _pcm_to_wav(data)
        except Exception as exc:
            raise VoiceServiceError("Voice playback could not be generated") from exc


def _pcm_to_wav(pcm: bytes) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(24000)
        stream.writeframes(pcm)
    return output.getvalue()


def configured_provider() -> GeminiVoiceProvider:
    if os.getenv("VOICE_PROVIDER", "gemini").lower() != "gemini":
        raise VoiceServiceError("Selected voice provider is unavailable")
    return GeminiVoiceProvider()


def voice_health() -> dict[str, object]:
    configured = bool(settings.gemini_api_key) and os.getenv("VOICE_PROVIDER", "gemini").lower() == "gemini"
    return {"provider": "Gemini", "configured": configured, "stt_available": configured, "tts_available": configured, "live_available": configured, "supported_languages": sorted(supported_language_codes()), "status": "configured" if configured else "unavailable"}

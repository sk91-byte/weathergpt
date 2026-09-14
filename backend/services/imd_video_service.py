"""Free-tier IMD YouTube transcript and Gemini advisory pipeline."""
from __future__ import annotations
import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Any
import requests
from google.genai import types
from backend.config import settings
from backend.services.language_service import get_language, is_supported_language
from backend.services.llm_service import _call_gemini_with_retry, _client, _response_text

class IMDBriefingError(Exception):
    pass

@dataclass(frozen=True)
class VideoInfo:
    video_id: str
    title: str
    published_at: str | None = None
    channel_title: str | None = None
    source: str = "YouTube"

def _yt(resource: str, params: dict[str, Any]) -> dict[str, Any]:
    if not settings.youtube_api_key:
        raise IMDBriefingError("YOUTUBE_API_KEY is not configured")
    try:
        response = requests.get(f"https://www.googleapis.com/youtube/v3/{resource}", params={**params, "key": settings.youtube_api_key}, timeout=12)
        response.raise_for_status()
        return response.json()
    except requests.HTTPError as exc:
        raise IMDBriefingError("YouTube API request failed") from exc
    except (requests.RequestException, ValueError) as exc:
        raise IMDBriefingError("YouTube API is temporarily unavailable") from exc

def latest_video() -> VideoInfo:
    if settings.youtube_api_key:
        playlist_id = settings.imd_youtube_playlist_id
        if not playlist_id:
            channel_params = {"part": "contentDetails", "maxResults": 1}
            channel_params["id" if settings.imd_youtube_channel_id else "forHandle"] = settings.imd_youtube_channel_id or settings.imd_youtube_handle.lstrip("@")
            channels = _yt("channels", channel_params).get("items") or []
            if not channels:
                raise IMDBriefingError("The configured IMD YouTube channel was not found")
            playlist_id = channels[0]["contentDetails"]["relatedPlaylists"]["uploads"]
        items = _yt("playlistItems", {"part": "snippet,contentDetails", "playlistId": playlist_id, "maxResults": 10}).get("items") or []
        for item in items:
            snippet = item.get("snippet") or {}
            video_id = (item.get("contentDetails") or {}).get("videoId")
            if video_id:
                return VideoInfo(video_id, snippet.get("title", "IMD weather briefing"), snippet.get("publishedAt"), snippet.get("channelTitle"), "YouTube Data API v3")
        raise IMDBriefingError("No uploaded IMD weather briefing video was found")
    if not settings.imd_youtube_channel_id:
        raise IMDBriefingError("Set IMD_YOUTUBE_CHANNEL_ID for the RSS fallback")
    try:
        response = requests.get("https://www.youtube.com/feeds/videos.xml", params={"channel_id": settings.imd_youtube_channel_id}, timeout=12)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        ns = {"yt": "http://www.youtube.com/xml/schemas/2015", "atom": "http://www.w3.org/2005/Atom"}
        entry = root.find("atom:entry", ns)
        video_id = entry.findtext("yt:videoId", namespaces=ns) if entry is not None else None
        if not video_id:
            raise IMDBriefingError("No uploaded IMD weather briefing video was found")
        return VideoInfo(video_id, entry.findtext("atom:title", default="IMD weather briefing", namespaces=ns), entry.findtext("atom:published", namespaces=ns), source="YouTube channel RSS")
    except IMDBriefingError:
        raise
    except (requests.RequestException, ET.ParseError) as exc:
        raise IMDBriefingError("The IMD YouTube RSS feed is temporarily unavailable") from exc

def fetch_transcript(video_id: str) -> list[dict[str, Any]]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled, VideoUnavailable
        api = YouTubeTranscriptApi()
        try:
            transcript = api.fetch(video_id, languages=["en", "hi"])
        except NoTranscriptFound:
            first = next(iter(api.list(video_id)), None)
            if first is None:
                raise
            transcript = first.fetch()
        snippets = getattr(transcript, "snippets", transcript)
        result = []
        for item in snippets:
            text = item.get("text") if isinstance(item, dict) else getattr(item, "text", "")
            start = item.get("start") if isinstance(item, dict) else getattr(item, "start", 0)
            duration = item.get("duration") if isinstance(item, dict) else getattr(item, "duration", 0)
            if str(text).strip():
                result.append({"text": str(text).strip(), "start": round(float(start), 3), "duration": round(float(duration), 3), "end": round(float(start) + float(duration), 3)})
        if not result:
            raise IMDBriefingError("The video transcript is empty")
        return result
    except TranscriptsDisabled as exc:
        raise IMDBriefingError("Captions are disabled for this IMD video") from exc
    except (VideoUnavailable, NoTranscriptFound) as exc:
        raise IMDBriefingError("No usable transcript was found for this IMD video") from exc
    except IMDBriefingError:
        raise
    except Exception as exc:
        raise IMDBriefingError("The YouTube transcript could not be fetched") from exc

def _transcript_text(items: list[dict[str, Any]], limit: int = 50000) -> str:
    lines, used = [], 0
    for item in items:
        line = f"[{item['start']:.1f}-{item['end']:.1f}] {item['text']}"
        if used + len(line) > limit: break
        lines.append(line); used += len(line) + 1
    return "\n".join(lines)

def _gemini_json(prompt: str) -> Any:
    response = _call_gemini_with_retry(lambda: _client().models.generate_content(model=settings.gemini_model, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json", max_output_tokens=1400, temperature=0.1)), max_retries=0)
    try: return json.loads(_response_text(response))
    except json.JSONDecodeError as exc: raise IMDBriefingError("Gemini returned invalid transcript-location JSON") from exc

def find_mentions(transcript: list[dict[str, Any]], location: str) -> list[dict[str, Any]]:
    prompt = "Find only explicit mentions of this Indian city, district, state, or route. Return JSON only as {\"matches\":[{\"start\":number,\"end\":number,\"matched_text\":string,\"reason\":string}]}. Do not infer nearby locations. If none, return an empty list.\n\nLocation: " + location + "\n\nTranscript:\n" + _transcript_text(transcript)
    payload = _gemini_json(prompt)
    matches = payload.get("matches", []) if isinstance(payload, dict) else []
    return [item for item in matches if isinstance(item, dict) and isinstance(item.get("start"), (int, float)) and isinstance(item.get("matched_text"), str)]

def synthesize(location: str, persona: str, language: str, video: VideoInfo, matches: list[dict[str, Any]]) -> str:
    meta = get_language(language if is_supported_language(language) else "en")
    evidence = "\n".join(f"[{item['start']}-{item.get('end', item['start'])}] {item['matched_text']}" for item in matches) or "No explicit mention of this location was found. Do not invent a local warning."
    prompt = f"Write a concise actionable weather advisory for {location} using only this IMD transcript evidence. Respond in {meta['name']} ({meta['native_name']}). Persona: {persona}. Do not claim live conditions beyond this video. Mention timestamps when useful. Return clean text only.\n\nVideo: {video.title}\nEvidence:\n{evidence}"
    response = _call_gemini_with_retry(lambda: _client().models.generate_content(model=settings.gemini_model, contents=prompt, config=types.GenerateContentConfig(max_output_tokens=900, temperature=0.3)), max_retries=0)
    return _response_text(response) or "No advisory was generated from the available transcript."

def create_briefing(location: str, video_id: str | None, persona: str, language: str) -> dict[str, Any]:
    if not settings.gemini_api_key: raise IMDBriefingError("GEMINI_API_KEY is not configured")
    video = VideoInfo(video_id.strip(), "Selected IMD weather briefing", source="Explicit video ID") if video_id and video_id.strip() else latest_video()
    transcript = fetch_transcript(video.video_id)
    matches = find_mentions(transcript, location)
    response = synthesize(location, persona, language, video, matches)
    return {"ai_response": response, "clean_text": response, "location": location, "language": language, "video": {"id": video.video_id, "title": video.title, "published_at": video.published_at, "channel_title": video.channel_title, "source": video.source, "url": f"https://www.youtube.com/watch?v={video.video_id}"}, "official_sources": [{"name": "India Meteorological Department", "url": "https://mausam.imd.gov.in/"}, {"name": "SACHET official alerts", "url": "https://sachet.ndma.gov.in/"}], "matches": matches, "transcript_segments": len(transcript), "is_live": False, "data_source": "IMD YouTube transcript + Gemini"}

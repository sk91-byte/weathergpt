"""Simple rule-based parser for basic weather questions."""

import re
from typing import Any


SUPPORTED_CITY_NAMES = (
    "Bengaluru|Bangalore|Banglore|Mumbai|Bombay|Delhi|Gurugram|Gurgaon|Chennai|Kolkata|"
    "Hyderabad|Pune|Ahmedabad|Jaipur|Lucknow|Patna|Bhopal|Chandigarh|"
    "Bhubaneswar|Ranchi"
)

HINDI_CITY_ALIASES = {
    "दिल्ली": "Delhi",
    "नई दिल्ली": "New Delhi",
    "गुरुग्राम": "Gurugram",
    "गुड़गांव": "Gurugram",
    "मुंबई": "Mumbai",
    "चेन्नई": "Chennai",
    "कोलकाता": "Kolkata",
    "हैदराबाद": "Hyderabad",
    "पुणे": "Pune",
    "अहमदाबाद": "Ahmedabad",
    "जयपुर": "Jaipur",
    "लखनऊ": "Lucknow",
    "पटना": "Patna",
    "भोपाल": "Bhopal",
    "चंडीगढ़": "Chandigarh",
    "भुवनेश्वर": "Bhubaneswar",
    "रांची": "Ranchi",
    "पिथौरागढ़": "Pithoragarh",
}


def parse_weather_query(message: str, previous_context: dict[str, Any] | None = None) -> dict[str, Any]:
    """Parse common weather language deterministically, using prior context safely."""
    previous_context = previous_context or {}
    normalized = message.strip().lower()
    current_phrases = (r"\bnear me\b", r"\baround me\b", r"\bwhere i am\b", r"\bhere\b", r"\bmy area\b", r"\bmy location\b", r"\bweather of mine\b", r"\bmy weather\b", r"मेरे पास", r"मेरी लोकेशन", r"मेरे स्थान", r"मेरे इलाके", r"मेरे आसपास", r"यहाँ", r"यहां")
    is_current_location = any(re.search(phrase, normalized) for phrase in current_phrases)
    location = None
    if not is_current_location:
        for hindi_name, english_name in HINDI_CITY_ALIASES.items():
            if hindi_name in normalized:
                location = english_name
                break
    # Accept natural variants such as "weather of Pithoragarh", "forecast
    # for Chennai", and "weather in a small town".
    location_match = None if is_current_location or location else re.search(r"\b(?:in|of|for|near)\s+([a-z]+(?:[\s,]+[a-z]+){0,3})", normalized)
    if location_match and location is None:
        location = location_match.group(1).strip(" ?.,!")
        location = re.sub(r"\s+(today|tomorrow|tonight|now|right now|currently|outside|at the moment|this weekend|next week)\b.*$", "", location).strip(" ?.,!")
        # The parser matches against normalized text, but API responses should
        # preserve a human-readable place name for the UI and follow-up chat.
        location = location.title()
    elif location is None:
        location_match = re.search(rf"\b({SUPPORTED_CITY_NAMES})\b", normalized, re.IGNORECASE)
        location = location_match.group(1) if location_match else None

    observed_rain = any(phrase in normalized for phrase in ("is it raining", "raining outside", "rain right now", "raining right now", "currently raining", "abhi barish", "abhi baarish", "abhi बारिश", "अभी बारिश", "बारिश हो रही", "बारिश हो रहा"))
    if observed_rain:
        intent = "current_weather"
    elif any(keyword in normalized for keyword in ("forecast", "tomorrow", "day after tomorrow", "this weekend", "next few days", "rahega", "rahegi", "rain", "raining", "barish", "baarish", "umbrella", "carry", "chahiye", "chahie", "chaive", "bahar", "jana", "jaana", "office", "बाहर", "पूर्वानुमान", "कल", "बारिश", "बरसात", "छाता")):
        intent = "forecast"
    elif any(keyword in normalized for keyword in ("weather", "mausam", "temperature", "tapman", "hot", "cold", "humidity", "humid", "nami", "wind", "hawa", "sunrise", "sunset", "मौसम", "तापमान", "गर्मी", "ठंड", "नमी", "हवा", "आज", "अभी")):
        intent = "current_weather"
    else:
        intent = previous_context.get("last_intent", "unknown") if any(
            phrase in normalized for phrase in ("explain", "detail", "that", "there", "then", "it", "what about", "how about", "how hot", "how cold", "more", "why", "kyun", "kyon", "aur batao", "batao", "kya mujhe", "और बताओ", "और जानकारी", "क्यों", "विस्तार", "बताओ", "क्या ले जाऊँ", "क्या साथ", "क्या बचना")
        ) else "unknown"

    if location is None and any(phrase in normalized for phrase in ("there", "it", "that", "what about", "how about", "how hot", "how cold", "explain", "detail", "more", "why", "kyun", "kyon", "aur batao", "batao", "kya mujhe", "और बताओ", "और जानकारी", "क्यों", "वहाँ", "वहां", "उसका", "विस्तार", "बताओ", "क्या ले जाऊँ", "क्या साथ", "क्या बचना")):
        location = previous_context.get("last_location")

    if "day after tomorrow" in normalized or "परसों" in normalized:
        time_reference = "day_after_tomorrow"
    elif "tomorrow" in normalized or "कल" in normalized:
        time_reference = "tomorrow"
    elif "tonight" in normalized or "आज रात" in normalized:
        time_reference = "tonight"
    elif "this evening" in normalized:
        time_reference = "this_evening"
    elif "this weekend" in normalized:
        time_reference = "this_weekend"
    elif "next few days" in normalized:
        time_reference = "next_few_days"
    elif any(word in normalized for word in ("now", "today", "current", "अभी", "आज")):
        time_reference = "today"
    else:
        time_reference = previous_context.get("last_time_reference", "today")

    if any(word in normalized for word in ("rain", "raining", "barish", "baarish", "umbrella", "chata", "chhata", "छाता", "बारिश", "बरसात")):
        request_type = "rain"
    elif any(word in normalized for word in ("temperature", "hot", "cold")):
        request_type = "temperature"
    else:
        request_type = previous_context.get("last_request_type", "general_weather")

    location_mode = "current_location" if is_current_location else ("named_location" if location else "none")
    if location_mode == "current_location":
        location = None
    language = "hi" if any(phrase in normalized for phrase in ("in hindi", "hindi mein", "हिंदी")) else previous_context.get("preferred_language", "en")
    return {"intent": intent, "location": location, "location_mode": location_mode, "time_reference": time_reference, "request_type": request_type, "preferred_language": language}

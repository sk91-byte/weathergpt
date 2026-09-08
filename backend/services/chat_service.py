"""Business workflow for location-aware WeatherGPT chat."""

import re
from typing import Any

from backend.config import settings
from backend.services.llm_service import WeatherQuery, generate_general_response, generate_weather_response, interpret_weather_query
from backend.services.location_service import LOCATIONS, get_location, reverse_geocode
from backend.services.language_service import get_language
from backend.services.query_parser import HINDI_CITY_ALIASES, parse_weather_query
from backend.services.llm_service import LLMServiceError
from backend.services.weather_service import WeatherServiceError, get_current_weather, get_weather_forecast
from backend.services.conversation_service import add_message, conversation_context, create_conversation, get_conversation
from backend.services.json_data_service import get_profile
from backend.services.decision_engine import analyze_decision


def _language_from_message(message: str) -> str | None:
    text = message.lower()
    if "hinglish" in text:
        return "en"
    if "gujarati" in text or "ગુજરાતી" in text or any("\u0a80" <= character <= "\u0aff" for character in message):
        return "gu"
    if "hindi" in text or "हिंदी" in text or any("\u0900" <= character <= "\u097f" for character in message):
        return "hi"
    if "english" in text:
        return "en"
    return None


def _normalise_profile(profile: str | None) -> str:
    aliases = {
        "citizen": "general_public", "general_public": "general_public", "student": "student",
        "farmer": "farmer", "traveller": "traveller", "researcher": "researcher",
        "commuter": "commuter", "worker": "worker", "outdoor_worker": "outdoor_worker",
    }
    return aliases.get((profile or "general_public").strip().lower(), "general_public")


def _follow_up_suggestions(language: str, profile: str, intent: str, has_route: bool = False) -> list[str]:
    sets = {
        "en": {
            "general_public": ["Will it rain in the next 3 hours?", "What should I carry?", "Is it safe to go outside?", "Explain the main risk."],
            "farmer": ["Should I irrigate today?", "Is it safe to spray crops?", "What should I do if rain starts?", "Explain the crop risk."],
            "traveller": ["Should I leave now?", "What should I carry for the journey?", "Will rain slow the route?", "Show the safest travel advice."],
            "student": ["Is it safe to go to college?", "Should I carry an umbrella?", "What time is better to leave?", "What should I keep in my bag?"],
            "researcher": ["Show the data source.", "What is the forecast confidence?", "What changed from the last update?", "Explain the uncertainty."],
        },
        "hi": {
            "general_public": ["अगले 3 घंटे में बारिश होगी?", "क्या साथ लेकर निकलूं?", "क्या बाहर जाना सुरक्षित है?", "मुख्य जोखिम समझाइए।"],
            "farmer": ["आज सिंचाई करूं?", "क्या फसल पर स्प्रे करना सुरक्षित है?", "बारिश शुरू हो तो क्या करूं?", "फसल का जोखिम समझाइए।"],
            "traveller": ["अभी निकलना चाहिए?", "यात्रा में क्या साथ रखूं?", "क्या बारिश से रास्ता धीमा होगा?", "सबसे सुरक्षित यात्रा सलाह दें।"],
            "student": ["क्या कॉलेज जाना सुरक्षित है?", "क्या छाता ले जाऊं?", "किस समय निकलना बेहतर है?", "बैग में क्या रखूं?"],
            "researcher": ["डेटा का स्रोत बताइए।", "पूर्वानुमान का भरोसा कितना है?", "पिछले अपडेट से क्या बदला?", "अनिश्चितता समझाइए।"],
        },
        "gu": {
            "general_public": ["આગામી 3 કલાકમાં વરસાદ પડશે?", "શું સાથે લઈને નીકળું?", "બહાર જવું સલામત છે?", "મુખ્ય જોખમ સમજાવો."],
            "farmer": ["આજે સિંચાઈ કરું?", "પાક પર છંટકાવ કરવો સલામત છે?", "વરસાદ શરૂ થાય તો શું કરું?", "પાકનું જોખમ સમજાવો."],
            "traveller": ["હમણાં નીકળવું જોઈએ?", "મુસાફરીમાં શું સાથે રાખું?", "વરસાદથી રસ્તો ધીમો થશે?", "સૌથી સલામત મુસાફરી સલાહ આપો."],
            "student": ["કોલેજ જવું સલામત છે?", "છત્રી લઈ જાઉં?", "કયા સમયે નીકળવું સારું?", "બેગમાં શું રાખું?"],
            "researcher": ["ડેટાનો સ્ત્રોત જણાવો.", "આગાહી પર કેટલો વિશ્વાસ રાખી શકાય?", "છેલ્લા અપડેટથી શું બદલાયું?", "અનિશ્ચિતતા સમજાવો."],
        },
        "hinglish": {
            "general_public": ["Agale 3 ghante mein baarish hogi?", "Kya saath lekar niklun?", "Kya bahar jaana safe hai?", "Main risk samjhao."],
            "farmer": ["Aaj irrigation karun?", "Crop spray karna safe hai?", "Baarish shuru ho to kya karun?", "Crop risk samjhao."],
            "traveller": ["Abhi nikalna chahiye?", "Journey mein kya carry karun?", "Kya baarish se route slow hoga?", "Safest travel advice do."],
            "student": ["College jaana safe hai?", "Kya chhata le jaun?", "Kis time nikalna better hai?", "Bag mein kya rakhu?"],
            "researcher": ["Data source batao.", "Forecast confidence kitna hai?", "Last update se kya badla?", "Uncertainty samjhao."],
        },
    }
    mode = language if language in {"hi", "gu", "hinglish"} else "en"
    values = list(sets[mode].get(profile, sets[mode]["general_public"]))
    if has_route:
        values[0] = {"en": "Should I leave now for this route?", "hi": "इस रास्ते के लिए अभी निकलना चाहिए?", "gu": "આ રસ્તા માટે હમણાં નીકળવું જોઈએ?", "hinglish": "Is route ke liye abhi nikalna chahiye?"}[mode]
    return values


def _query_analysis(query: WeatherQuery, response_mode: str, profile: str, message: str) -> dict[str, Any]:
    return {
        "intent": query.intent, "request_type": query.request_type, "location": query.location,
        "location_mode": query.location_mode, "time_reference": query.time_reference,
        "response_language": response_mode, "persona": profile,
        "understood_as": "decision_support" if query.request_type in {"rain", "forecast"} or _asks_for_decision(message) else "weather_information",
        "confidence": "high" if query.intent != "unknown" and (query.location or query.location_mode == "current_location") else "needs_clarification",
    }


def _is_hinglish(message: str) -> bool:
    """Detect common Roman-script Hindi without overriding an explicit UI language."""
    text = message.lower()
    if any("\u0900" <= character <= "\u097f" for character in text):
        return False
    markers = (
        "kya ", "kaise", "kaisa", "kyun", "kyon", "kyu", "mujhe", "mera ",
        "meri ", "mere ", "aaj", "kal ", "barish", "baarish", "chata", "chhata",
        "bahar", "le jana", "le jaana", "chahiye", "chahie", "mausam", "nami",
        "garmi", "thand", "hawa", "batao", "sath", "saath",
    )
    return any(marker in text for marker in markers)


def _response_mode(message: str, selected_language: dict[str, Any]) -> str:
    """Return the presentation style while keeping the selected language metadata."""
    code = selected_language["code"]
    if code == "hi":
        return "hi"
    if code == "en" and _is_hinglish(message):
        return "hinglish"
    return code


def _small_talk_response(message: str, language: str) -> str | None:
    """Handle lightweight conversation without making an unnecessary weather call."""
    text = message.lower().strip().strip(" ?!.।")
    greetings = {"hi", "hello", "hey", "namaste", "namaskar", "नमस्ते", "नमस्कार", "हैलो"}
    thanks = {"thanks", "thank you", "thx", "धन्यवाद", "शुक्रिया"}
    capabilities = ("what can you do", "help me", "आप क्या कर सकते", "क्या कर सकते")
    if text in greetings:
        if language == "hi": return "नमस्ते! मैं WeatherGPT हूँ। अपने शहर का मौसम, बारिश, पूर्वानुमान या बाहर जाने की सलाह पूछिए।"
        if language == "gu": return "નમસ્તે! હું WeatherGPT છું. તમારા શહેરનું હવામાન, વરસાદ, આગાહી અથવા બહાર જવાની સલાહ પૂછો."
        if language == "hinglish": return "Namaste! Main WeatherGPT hoon. Apne city ka weather, baarish, forecast ya bahar jaane ki advice poochho."
        return "Hey! I’m WeatherGPT. Ask me about your city’s weather, rain, forecast, or whether it’s a good time to go out."
    if text in thanks:
        if language == "hi": return "खुशी हुई मदद करके! मौसम से जुड़ा कुछ और पूछना हो तो बताइए।"
        if language == "gu": return "મદદ કરીને આનંદ થયો! હવામાન વિશે બીજું કંઈ પૂછવું હોય તો કહો."
        if language == "hinglish": return "Khushi hui help karke! Weather se related kuch aur poochna ho to batao."
        return "Anytime! If you want, I can also check rain, a forecast, or whether it’s a good time to head out."
    if any(phrase in text for phrase in capabilities):
        if language == "hi": return "मैं लाइव मौसम, बारिश का मौका, पूर्वानुमान और मौसम के हिसाब से बाहर जाने, यात्रा करने या क्या साथ रखने की सलाह दे सकता हूँ।"
        if language == "gu": return "હું લાઇવ હવામાન, વરસાદની શક્યતા, આગાહી અને બહાર જવા અથવા મુસાફરી માટે વ્યવહારુ સલાહ આપી શકું છું."
        if language == "hinglish": return "Main live weather, baarish ke chances, forecast aur weather ke hisaab se travel ya kya saath rakhna hai—sab mein help kar sakta hoon."
        return "I can check live weather, rain chances, forecasts, and practical advice for going out, travelling, or deciding what to carry."
    return None


def _place_mentions(message: str) -> list[tuple[str, str, int, int]]:
    """Find known Indian place names in the order in which the user said them."""
    aliases: dict[str, str] = {alias: item["name"] for alias, item in LOCATIONS.items()}
    aliases.update({alias: name for alias, name in HINDI_CITY_ALIASES.items()})
    aliases.update({"new delhi": "New Delhi", "pithoragarh": "Pithoragarh"})
    text = message.lower()
    matches: list[tuple[str, str, int, int]] = []
    for alias in sorted(aliases, key=len, reverse=True):
        pattern = re.escape(alias)
        if alias[0].isascii():
            pattern = rf"(?<![a-z]){pattern}(?![a-z])"
        for found in re.finditer(pattern, text, re.IGNORECASE):
            if any(found.start() < end and found.end() > start for _, _, start, end in matches):
                continue
            matches.append((alias, aliases[alias], found.start(), found.end()))
    return sorted(matches, key=lambda item: item[2])


def _extract_route_places(message: str) -> tuple[str, str] | None:
    """Extract origin and destination from common English, Hindi, and Hinglish forms."""
    text = message.lower()
    mentions = _place_mentions(message)
    if len(mentions) < 2:
        # This fallback supports small towns when they are used with an explicit
        # English connector, then lets the nationwide geocoder resolve them.
        match = re.search(r"\bfrom\s+([a-z][a-z .'-]{1,45}?)\s+(?:to|towards)\s+([a-z][a-z .'-]{1,45}?)(?:[?.!,]|$)", text)
        if match:
            return match.group(1).strip(), match.group(2).strip()
        return None
    if re.search(r"\bfrom\b", text) and re.search(r"\bto\b|\btowards\b", text):
        from_index = text.find("from")
        to_index = min([index for index in (text.find(" to "), text.find(" towards ")) if index >= 0], default=-1)
        if to_index >= 0:
            origin = next((item[1] for item in mentions if item[2] > from_index and item[2] < to_index), mentions[0][1])
            destination = next((item[1] for item in mentions if item[2] > to_index), mentions[-1][1])
            return origin, destination
    connector = re.search(r"\bse\b|\sसे\s", text)
    if connector:
        origin_candidates = [item for item in mentions if item[3] <= connector.start()]
        destination_candidates = [item for item in mentions if item[2] >= connector.end()]
        origin = origin_candidates[-1][1] if origin_candidates else mentions[0][1]
        destination = destination_candidates[0][1] if destination_candidates else next((item[1] for item in mentions if item[1] != origin), mentions[-1][1])
        return origin, destination
    to_match = re.search(r"\bto\b|\btowards\b|\sसे\s", text)
    if to_match:
        before = [item for item in mentions if item[3] <= to_match.start()]
        after = [item for item in mentions if item[2] >= to_match.end()]
        if before and after:
            return before[-1][1], after[0][1]
    return None


def _route_forecast(data: dict[str, Any], time_reference: str) -> dict[str, Any]:
    if time_reference == "tomorrow" and len(data.get("forecast", [])) > 1:
        data["forecast"] = data["forecast"][1:2]
        if len(data.get("hourly", [])) > 24:
            data["hourly"] = data["hourly"][24:48]
    return data


def _route_point_summary(name: str, data: dict[str, Any], forecast: bool, language: str) -> str:
    display_name = _hindi_location(name) if language == "hi" else name
    if forecast:
        high, low, probability = _forecast_values(data)
        if language == "hi":
            return f"{display_name}: अधिकतम {high}°C, न्यूनतम {low}°C, बारिश की संभावना {probability}%"
        if language == "hinglish":
            return f"{display_name}: maximum {high}°C, minimum {low}°C, baarish ke chances {probability}%"
        if language == "gu":
            return f"{display_name}: મહત્તમ {high}°C, લઘુત્તમ {low}°C, વરસાદની શક્યતા {probability}%"
        return f"{display_name}: high {high}°C, low {low}°C, rain chance {probability}%"
    current = data.get("current", {})
    return f"{display_name}: {current.get('temperature_c', '--')}°C, {_condition_text(current.get('condition'), language)}"


def _route_response(message: str, origin: dict[str, Any], destination: dict[str, Any], origin_data: dict[str, Any], destination_data: dict[str, Any], forecast: bool, decision_question: bool, language: str) -> str:
    origin_summary = _route_point_summary(origin["name"], origin_data, forecast, language)
    destination_summary = _route_point_summary(destination["name"], destination_data, forecast, language)
    probabilities = []
    for data in (origin_data, destination_data):
        _, _, probability = _forecast_values(data)
        if isinstance(probability, (int, float)):
            probabilities.append(probability)
    max_rain = max(probabilities) if probabilities else None
    # This is a transparent point-forecast score, not an official road-safety rating.
    safety_score = max(0, round(100 - (max_rain * 0.35 if isinstance(max_rain, (int, float)) else 0)))
    if decision_question:
        if safety_score < 80:
            advice_key = "wettest"
            advice = f"The point-forecast safety score is {safety_score}/100, so I’d avoid the wettest period if you can. Try leaving after the rain risk reduces, keep rain protection handy, allow extra travel time, and drive carefully on slippery or waterlogged roads."
        elif max_rain is not None and max_rain >= 40:
            advice_key = "possible_rain"
            advice = "The trip is possible, but keep an umbrella or raincoat with you and allow some extra time for wet roads."
        else:
            advice_key = "reasonable"
            advice = "The available point forecasts look reasonable for travel, with normal care on the road."
    else:
        advice_key = "check_again"
        advice = "Keep checking close to departure because weather can change along the route."
    route_limit = "I can compare the origin and destination, but I do not have road-by-road observations for every intermediate kilometre."
    if language == "hi":
        advice_hi = {
            "wettest": "अगर संभव हो तो सबसे ज्यादा बारिश वाले समय से बचें। बारिश से बचने का सामान रखें, अतिरिक्त समय दें और फिसलन या जलभराव वाली सड़कों पर सावधानी से चलाएं।",
            "possible_rain": "यात्रा हो सकती है, लेकिन छाता या रेनकोट साथ रखें और गीली सड़कों के लिए थोड़ा अतिरिक्त समय दें।",
            "reasonable": "मौजूदा जगहों के पूर्वानुमान के आधार पर सामान्य सावधानी के साथ यात्रा ठीक लगती है।",
            "check_again": "निकलने से ठीक पहले फिर से मौसम देख लें, क्योंकि रास्ते में मौसम बदल सकता है।",
        }[advice_key]
        if safety_score < 80:
            advice_hi = f"मौसम के आधार पर सुरक्षा स्कोर {safety_score}/100 है, इसलिए अगर संभव हो तो कम बारिश वाले समय पर निकलें। " + advice_hi
        return f"आपकी यात्रा का अपडेट: {origin_summary}। {destination_summary}। {advice_hi} {route_limit.replace('I can compare the origin and destination, but I do not have road-by-road observations for every intermediate kilometre.', 'मैं शुरुआत और मंजिल की जगहों का मौसम देख सकता हूँ, लेकिन रास्ते के हर हिस्से का अलग सड़क-स्तर डेटा उपलब्ध नहीं है।')}"
    if language == "hinglish":
        advice_hinglish = {
            "wettest": "Agar possible ho to sabse zyada baarish wale time se bachna. Rain protection saath rakhna, extra travel time dena aur slippery ya waterlogged roads par carefully drive karna.",
            "possible_rain": "Trip possible hai, bas chhata ya raincoat saath rakhna aur geeli sadkon ke liye thoda extra time rakhna.",
            "reasonable": "Available point forecasts ke hisaab se normal road care ke saath trip theek lag rahi hai.",
            "check_again": "Nikalne se thodi der pehle weather phir check kar lena, kyunki route mein weather badal sakta hai.",
        }[advice_key]
        if safety_score < 80:
            advice_hinglish = f"Point forecast ke hisaab se safety score {safety_score}/100 hai, isliye possible ho to baarish kam hone ke baad nikalna better rahega. " + advice_hinglish
        limit_hinglish = "Main origin aur destination ka weather compare kar sakta hoon, lekin beech ke har kilometre ka road-level data available nahi hai."
        return f"Trip update: {origin_summary}. {destination_summary}. {advice_hinglish} {limit_hinglish}"
    if language == "gu":
        advice_gu = {
            "wettest": "શક્ય હોય તો સૌથી વધુ વરસાદના સમયથી બચો. વરસાદથી બચવાનું સામાન રાખો, થોડો વધારાનો સમય રાખો અને લપસણા અથવા પાણી ભરાયેલા રસ્તાઓ પર સાવચેતીથી વાહન ચલાવો.",
            "possible_rain": "મુસાફરી કરી શકાય છે, પરંતુ છત્રી અથવા રેનકોટ સાથે રાખો અને ભીના રસ્તાઓ માટે થોડો વધારાનો સમય રાખો.",
            "reasonable": "મળેલા સ્થળ-આધારિત આગાહી મુજબ સામાન્ય સાવચેતી સાથે મુસાફરી યોગ્ય લાગે છે.",
            "check_again": "નીકળતા પહેલાં ફરી હવામાન તપાસો, કારણ કે રસ્તામાં હવામાન બદલાઈ શકે છે.",
        }[advice_key]
        if safety_score < 80:
            advice_gu = f"સ્થળ-આધારિત સુરક્ષા સ્કોર {safety_score}/100 છે, તેથી શક્ય હોય તો વરસાદ ઓછો થયા પછી નીકળવું સારું. " + advice_gu
        return f"તમારી મુસાફરી અપડેટ: {origin_summary}. {destination_summary}. {advice_gu} હું શરૂઆત અને અંતિમ સ્થળનું હવામાન સરખાવી શકું છું, પરંતુ રસ્તાના દરેક કિલોમીટર માટે અલગ ડેટા ઉપલબ્ધ નથી."
    return f"Trip update: {origin_summary}. {destination_summary}. {advice} {route_limit}"


def _asks_for_current_location(message: str) -> bool:
    text = message.lower()
    return any(phrase in text for phrase in ("near me", "around me", "where i am", "my location", "weather of mine", "my weather", "मेरे पास", "मेरी लोकेशन", "मेरे स्थान", "मेरे इलाके", "मेरे आसपास", "यहाँ", "यहां"))


def _asks_for_decision(message: str) -> bool:
    text = message.lower()
    return any(phrase in text for phrase in ("should i", "can i travel", "is it safe", "carry an umbrella", "umbrella carry", "umbrella", "raincoat", "what should i carry", "what should i take", "what should i avoid", "take it", "take with me", "so take", "then carry", "work outside", "go outside", "wash my car", "wash the car", "irrigat", "what should i do", "risk", "why did the risk", "what changed", "kya mujhe", "carry karna", "chahiye", "chahie", "chaive", "kya carry", "carry karu", "le jana chahiye", "le jaana chahiye", "jana chahiye", "jaana chahiye", "office ke liye", "office jana", "office jaana", "jaana hai", "jana hai", "le jaun", "le jaaun", "ja sakta", "ja sakti", "bahar jana", "bahar jaana", "bahar ja sakta", "nikalna", "nikal sakta", "chata", "chhata", "safe hai", "surakshit", "क्या बाहर", "बाहर जाना", "सुरक्षित", "क्या ले जाऊँ", "क्या साथ ले", "क्या बचना", "सावधानी"))


def _is_why_followup(message: str) -> bool:
    text = message.lower().strip().strip("?!.।")
    return text in {"why", "क्यों", "why is that", "why so", "what is the reason", "कारण क्या है", "ऐसा क्यों", "kyun", "kyon", "kyu"} or any(
        phrase in text for phrase in ("why did you", "why this decision", "why this advice", "kyun aisa", "kyon aisa", "kisliye", "kis karan", "किसलिए", "किस कारण", "क्यों ऐसा")
    )


def _hindi_level(level: str) -> str:
    return {"extreme": "बहुत ज्यादा", "high": "ज्यादा", "moderate": "मध्यम", "low": "कम", "very_low": "बहुत कम"}.get(level, level)


def _hindi_location(name: str) -> str:
    return {"Delhi": "दिल्ली", "New Delhi": "नई दिल्ली", "Gurugram": "गुरुग्राम", "Bengaluru": "बेंगलुरु", "Chennai": "चेन्नई", "Kolkata": "कोलकाता", "Mumbai": "मुंबई", "Hyderabad": "हैदराबाद", "Pune": "पुणे", "Ahmedabad": "अहमदाबाद", "Jaipur": "जयपुर", "Lucknow": "लखनऊ", "Patna": "पटना", "Bhopal": "भोपाल", "Chandigarh": "चंडीगढ़", "Bhubaneswar": "भुवनेश्वर", "Ranchi": "रांची", "Pithoragarh": "पिथौरागढ़"}.get(name, name)


def _hindi_reasons(reasons: list[str]) -> list[str]:
    import re
    labels = {"Rain": "बारिश", "Flood": "जलभराव", "Lightning": "बिजली चमकने", "Storm": "तूफान", "Wind": "तेज़ हवा", "Heat": "गर्मी", "Visibility": "दृश्यता"}
    translated = []
    for reason in reasons:
        match = re.search(r"([A-Za-z ]+) risk is ([0-9.]+)/100 \(([^)]+)\)", reason)
        if match:
            label = labels.get(match.group(1).strip(), match.group(1).strip())
            translated.append(f"{label} का जोखिम {match.group(2)}/100 ({_hindi_level(match.group(3))}) है")
        else:
            translated.append(reason)
    return translated


def _hinglish_reasons(reasons: list[str]) -> list[str]:
    import re
    labels = {"Rain": "baarish", "Flood": "waterlogging", "Lightning": "bijli chamakne", "Storm": "toofan", "Wind": "tez hawa", "Heat": "garmi", "Visibility": "visibility"}
    translated = []
    for reason in reasons:
        match = re.search(r"([A-Za-z ]+) risk is ([0-9.]+)/100 \(([^)]+)\)", reason)
        if match:
            label = labels.get(match.group(1).strip(), match.group(1).strip().lower())
            translated.append(f"{label} ka risk {match.group(2)}/100 ({match.group(3)}) hai")
        else:
            translated.append(reason)
    return translated


def _explain_previous_decision(decision: dict[str, Any], language: str) -> str:
    reasons = decision.get("why") or decision.get("explanation", {}).get("factors") or []
    actions = decision.get("recommended_actions") or []
    location = decision.get("location", {}).get("name", "इस स्थान")
    score = decision.get("risk_score", "--")
    level = str(decision.get("risk_level", "unavailable"))
    if language == "hi":
        reason_text = " ".join(_hindi_reasons([str(item) for item in reasons])) or "मौसम के किसी जोखिम संकेत ने सलाह की सीमा पार नहीं की।"
        action_text = " ".join(_hindi_actions([str(item) for item in actions]))
        return f"मैंने {_hindi_location(location)} के लिए यह सलाह इसलिए दी क्योंकि कुल मौसम जोखिम {score}/100 ({_hindi_level(level)}) है। {reason_text} इसलिए: {action_text}"
    if language == "hinglish":
        reason_text = " ".join(_hinglish_reasons([str(item) for item in reasons])) or "Kisi bade weather risk ne advisory limit cross nahi ki thi."
        action_text = " ".join(_hinglish_actions([str(item) for item in actions]))
        return f"Maine {location} ke liye ye advice isliye di kyunki overall weather risk {score}/100 ({level}) hai. {reason_text} Isliye: {action_text}"
    reason_text = " ".join(str(item) for item in reasons) or "No individual weather risk crossed the advisory threshold."
    action_text = " ".join(str(item) for item in actions)
    return f"I gave that advice for {location} because the overall weather risk is {score}/100 ({level}). {reason_text} So: {action_text}"


def _explain_previous_weather(weather: dict[str, Any], location: str, language: str) -> str:
    current = weather.get("current", {})
    condition = str(current.get("condition", "the available weather condition")).lower()
    temperature = current.get("temperature_c", "--")
    humidity = current.get("humidity_percent", "--")
    wind = current.get("wind_speed_kmh", "--")
    if language == "hi":
        condition = {"overcast": "बादल छाए हुए", "mainly clear": "आसमान ज्यादातर साफ", "partly cloudy": "कुछ बादल", "clear sky": "आसमान साफ", "rain": "बारिश", "precipitation": "बारिश या बूंदाबांदी", "thunderstorm": "गरज-चमक", "fog": "कोहरा"}.get(condition, condition)
        return f"मैंने {_hindi_location(location)} का यह विवरण लाइव मौसम डेटा के आधार पर बताया था: तापमान {temperature}°C, स्थिति {condition}, नमी {humidity}% और हवा {wind} किमी/घंटा।"
    if language == "hinglish":
        condition = {"overcast": "baadal chhaye hue", "mainly clear": "aasman zyada tar saaf", "partly cloudy": "thode baadal", "clear sky": "aasman saaf", "rain": "baarish", "precipitation": "baarish ya boondabaandi", "thunderstorm": "garaj-chamak", "fog": "kohra"}.get(condition, condition)
        return f"Maine {location} ka ye update live weather data ke basis par diya tha: temperature {temperature}°C, condition {condition}, humidity {humidity}% aur hawa {wind} km/h."
    return f"I described {location} using the latest live weather data: {temperature}°C, {condition}, humidity {humidity}%, and wind {wind} km/h."


def _hindi_actions(actions: list[str]) -> list[str]:
    translations = {
        "Carry an umbrella and allow extra time for wet roads.": "छाता साथ रखें और गीली सड़कों के लिए अतिरिक्त समय रखें।",
        "Avoid exposed outdoor areas during thunderstorms.": "आंधी-तूफान के दौरान खुले स्थानों से बचें।",
        "Limit prolonged outdoor exposure and take regular water breaks.": "लंबे समय तक बाहर रहने से बचें और नियमित रूप से पानी पिएं।",
        "Use caution near unsecured structures and loose objects.": "असुरक्षित ढांचों और ढीली वस्तुओं के पास सावधानी बरतें।",
        "Expect waterlogging in vulnerable areas; check official local updates.": "संवेदनशील इलाकों में जलभराव हो सकता है; आधिकारिक स्थानीय अपडेट देखें।",
        "Consider travelling before the highest-risk period if possible.": "अगर संभव हो तो सबसे ज्यादा जोखिम वाले समय से पहले यात्रा करें।",
    }
    return [translations.get(item, item) for item in actions]


def _hinglish_actions(actions: list[str]) -> list[str]:
    translations = {
        "Carry an umbrella and allow extra time for wet roads.": "Chhata saath rakhna aur geeli sadkon ke liye thoda extra time rakhna.",
        "Avoid exposed outdoor areas during thunderstorms.": "Garaj-chamak ke time khuli jagahon se bachna.",
        "Limit prolonged outdoor exposure and take regular water breaks.": "Zyada der bahar mat rehna aur beech-beech mein paani peena.",
        "Use caution near unsecured structures and loose objects.": "Kamzor structures aur loose objects ke paas sambhal kar rehna.",
        "Expect waterlogging in vulnerable areas; check official local updates.": "Low-lying areas mein waterlogging ho sakti hai; local official updates dekh lena.",
        "Consider travelling before the highest-risk period if possible.": "Agar possible ho to sabse risky time se pehle travel kar lena.",
    }
    return [translations.get(item, item) for item in actions]


def _localized_items(items: list[str], language: str) -> list[str]:
    translations = {
        "hi": {
            "Umbrella or rain protection": "छाता या बारिश से बचाव",
            "Water and sun protection": "पानी और धूप से बचाव",
            "Open fields, isolated trees, and exposed outdoor areas": "खुले मैदान, अकेले पेड़ और खुले बाहरी स्थान",
            "Waterlogged roads and underpasses": "जलभराव वाली सड़कें और अंडरपास",
            "Loose objects and unsecured structures": "ढीली वस्तुएं और असुरक्षित ढांचे",
            "Prolonged exposure during the hottest period": "सबसे ज्यादा गर्मी के समय लंबे समय तक बाहर रहना",
        },
        "hinglish": {
            "Umbrella or rain protection": "Chhata ya rain protection",
            "Water and sun protection": "Paani aur sun protection",
            "Open fields, isolated trees, and exposed outdoor areas": "Khule maidan, akele ped aur exposed outdoor areas",
            "Waterlogged roads and underpasses": "Waterlogged roads aur underpasses",
            "Loose objects and unsecured structures": "Loose objects aur unsafe structures",
            "Prolonged exposure during the hottest period": "Sabse zyada garmi ke time lambi der bahar rehna",
        },
    }
    mapping = translations.get(language, {})
    return [mapping.get(item, item) for item in items]


def _decision_rain_probability(weather_data: dict[str, Any]) -> Any:
    _, _, probability = _forecast_values(weather_data)
    if probability != "--":
        return probability
    probabilities = [item.get("precipitation_probability_percent") for item in weather_data.get("hourly", [])]
    available = [item for item in probabilities if isinstance(item, (int, float))]
    return max(available) if available else "--"


def _decision_response(message: str, decision: dict[str, Any], weather_data: dict[str, Any], location: str, language: str) -> str:
    """Turn deterministic risk output into a warm, human answer."""
    score = decision.get("risk_score", "--")
    level = str(decision.get("risk_level", "unavailable"))
    probability = _decision_rain_probability(weather_data)
    try:
        rain = float(probability)
    except (TypeError, ValueError):
        rain = None
    try:
        numeric_score = float(score) if score is not None else None
    except (TypeError, ValueError):
        numeric_score = None
    question = message.lower()
    is_car_question = "wash" in question and "car" in question
    is_travel_question = any(word in question for word in ("travel", "trip", "drive", "journey", "jana", "jaana", "यात्रा", "जाना"))
    is_rain_question = any(word in question for word in ("rain", "raining", "baarish", "barish", "umbrella", "chhata", "raincoat", "wet", "बारिश", "छाता"))
    if is_car_question and rain is not None and rain >= 40:
        direct = "I’d hold off on washing the car for now—the rain may undo your hard work."
    elif is_rain_question and rain is not None and rain >= 40:
        direct = "Yes—keep an umbrella or raincoat with you, and allow extra time because wet roads can slow traffic."
    elif is_travel_question and numeric_score is not None and numeric_score >= 60:
        direct = "I’d avoid the highest-risk time if you can. The trip may still be possible, but give yourself extra time and drive carefully."
    elif is_travel_question:
        direct = "The forecast is available, but I cannot calculate a complete route safety score yet. Keep checking the live forecast before travelling."
    elif numeric_score is not None and numeric_score >= 60:
        direct = "I’d be a little careful about outdoor plans today."
    elif numeric_score is not None and numeric_score >= 40:
        direct = "You can go out, but keep a little weather backup with you."
    elif numeric_score is not None:
        direct = "Good news—normal outdoor plans look reasonable from the available forecast."
    else:
        direct = "I can share the live forecast, but a complete safety score is unavailable because the provider did not return enough hourly risk inputs."
    reasons = [str(item) for item in (decision.get("why") or [])]
    actions = [str(item) for item in (decision.get("recommended_actions") or [])]
    carry = [str(item) for item in (decision.get("what_to_carry") or [])]
    avoid = [str(item) for item in (decision.get("what_to_avoid") or [])]
    if language == "hi":
        direct_hi = {
            "I’d hold off on washing the car for now—the rain may undo your hard work.": "अभी गाड़ी धोना टाल दें—बारिश आपकी मेहनत फिर खराब कर सकती है।",
            "Yes—keep an umbrella or raincoat with you, and allow extra time because wet roads can slow traffic.": "हाँ, छाता या रेनकोट साथ रखें और थोड़ा अतिरिक्त समय रखें—गीली सड़कों पर ट्रैफिक धीमा हो सकता है।",
            "I’d avoid the highest-risk time if you can. The trip may still be possible, but give yourself extra time and drive carefully.": "अगर संभव हो तो सबसे ज्यादा जोखिम वाले समय से बचें। यात्रा हो सकती है, लेकिन अतिरिक्त समय रखें और सावधानी से चलाएं।",
            "The trip looks reasonable from the available forecast, with normal care while travelling.": "मौजूदा पूर्वानुमान के आधार पर सामान्य सावधानी के साथ यात्रा ठीक लगती है।",
            "I’d be a little careful about outdoor plans today.": "आज बाहर जाने की योजना में थोड़ी सावधानी रखें।",
            "You can go out, but keep a little weather backup with you.": "आप बाहर जा सकते हैं, लेकिन मौसम को देखते हुए थोड़ी तैयारी साथ रखें।",
            "Good news—normal outdoor plans look reasonable from the available forecast.": "अच्छी खबर है—मौजूदा पूर्वानुमान के आधार पर सामान्य बाहर जाने की योजना ठीक लगती है।",
            "The forecast is available, but I cannot calculate a complete route safety score yet. Keep checking the live forecast before travelling.": "पूर्वानुमान उपलब्ध है, लेकिन अभी पूरा यात्रा सुरक्षा स्कोर नहीं निकाला जा सका। यात्रा से पहले लाइव मौसम फिर जांच लें।",
            "I can share the live forecast, but a complete safety score is unavailable because the provider did not return enough hourly risk inputs.": "मैं लाइव पूर्वानुमान बता सकता हूँ, लेकिन प्रदाता से पर्याप्त घंटेवार जोखिम डेटा नहीं मिला, इसलिए पूरा सुरक्षा स्कोर उपलब्ध नहीं है।",
        }[direct]
        reason_text = "प्रदाता से पर्याप्त घंटेवार जोखिम डेटा नहीं मिला।" if numeric_score is None else (" ".join(_hindi_reasons(reasons)) or "मौसम का कोई बड़ा जोखिम संकेत नहीं मिला।")
        action_text = " ".join(_hindi_actions(actions))
        details = []
        if carry: details.append("साथ रखें: " + ", ".join(_localized_items(carry, "hi")))
        if avoid: details.append("बचें: " + ", ".join(_localized_items(avoid, "hi")))
        rain_text = f" बारिश की संभावना {probability}% है।" if rain is not None else ""
        score_text = f"{score}/100 ({_hindi_level(level)})" if numeric_score is not None else "उपलब्ध नहीं"
        return f"{_hindi_location(location)} में {direct_hi} कुल मौसम जोखिम: {score_text}।{rain_text} वजह: {reason_text} सलाह: {action_text} {' '.join(details)}".strip()
    if language == "gu":
        direct_gu = {
            "I’d hold off on washing the car for now—the rain may undo your hard work.": "હમણાં કાર ધોવાનું ટાળો—વરસાદથી તમારી મહેનત બગડી શકે છે.",
            "Yes—keep an umbrella or raincoat with you, and allow extra time because wet roads can slow traffic.": "હા, છત્રી અથવા રેનકોટ સાથે રાખો અને થોડો વધારાનો સમય રાખો—ભીના રસ્તાઓ પર ટ્રાફિક ધીમો થઈ શકે છે.",
            "I’d avoid the highest-risk time if you can. The trip may still be possible, but give yourself extra time and drive carefully.": "શક્ય હોય તો સૌથી વધુ જોખમનો સમય ટાળો. મુસાફરી શક્ય છે, પરંતુ વધારાનો સમય રાખો અને સાવચેતીથી વાહન ચલાવો.",
            "The trip looks reasonable from the available forecast, with normal care while travelling.": "મળેલી આગાહી મુજબ સામાન્ય સાવચેતી સાથે મુસાફરી યોગ્ય લાગે છે.",
            "I’d be a little careful about outdoor plans today.": "આજે બહાર જવાની યોજનામાં થોડી સાવચેતી રાખો.",
            "You can go out, but keep a little weather backup with you.": "તમે બહાર જઈ શકો છો, પરંતુ હવામાન માટે થોડી તૈયારી સાથે રાખો.",
            "Good news—normal outdoor plans look reasonable from the available forecast.": "સારા સમાચાર—મળેલી આગાહી મુજબ સામાન્ય બહારની યોજનાઓ યોગ્ય લાગે છે.",
            "The forecast is available, but I cannot calculate a complete route safety score yet. Keep checking the live forecast before travelling.": "આગાહી ઉપલબ્ધ છે, પરંતુ હમણાં સંપૂર્ણ મુસાફરી સુરક્ષા સ્કોર કાઢી શકાયો નથી. મુસાફરી પહેલાં લાઇવ હવામાન ફરી તપાસો.",
            "I can share the live forecast, but a complete safety score is unavailable because the provider did not return enough hourly risk inputs.": "હું લાઇવ આગાહી આપી શકું છું, પરંતુ પ્રદાતાએ પૂરતો કલાકવાર જોખમ ડેટા આપ્યો નથી, તેથી સંપૂર્ણ સુરક્ષા સ્કોર ઉપલબ્ધ નથી.",
        }[direct]
        reason_text = "પ્રદાતાએ પૂરતો કલાકવાર જોખમ ડેટા આપ્યો નથી." if numeric_score is None else (" ".join(reasons) or "મોટું હવામાન જોખમ મળ્યું નથી.")
        action_text = " ".join(actions)
        details = []
        if carry: details.append("સાથે રાખો: " + ", ".join(carry))
        if avoid: details.append("ટાળો: " + ", ".join(avoid))
        rain_text = f" વરસાદની શક્યતા {probability}% છે." if rain is not None else ""
        score_text = f"{score}/100 ({level})" if numeric_score is not None else "ઉપલબ્ધ નથી"
        return f"{location}માં {direct_gu} કુલ હવામાન જોખમ {score_text} છે.{rain_text} કારણ: {reason_text} સલાહ: {action_text} {' '.join(details)}".strip()
    if language == "hinglish":
        direct_hi = {
            "I’d hold off on washing the car for now—the rain may undo your hard work.": "Abhi car wash karna hold kar do—baarish tumhari mehnat kharab kar sakti hai.",
            "Yes—keep an umbrella or raincoat with you, and allow extra time because wet roads can slow traffic.": "Haan, chhata ya raincoat saath rakhna, aur thoda extra time rakhna—geeli sadkon par traffic slow ho sakta hai.",
            "I’d avoid the highest-risk time if you can. The trip may still be possible, but give yourself extra time and drive carefully.": "Agar possible ho to sabse risky time avoid karo. Trip ho sakti hai, bas extra time rakho aur carefully drive karo.",
            "The trip looks reasonable from the available forecast, with normal care while travelling.": "Available forecast ke hisaab se normal care ke saath trip theek lag rahi hai.",
            "I’d be a little careful about outdoor plans today.": "Aaj outdoor plans mein thoda careful rehna better hoga.",
            "You can go out, but keep a little weather backup with you.": "Bahar ja sakte ho, bas weather backup saath rakhna.",
            "Good news—normal outdoor plans look reasonable from the available forecast.": "Good news—available forecast ke hisaab se normal outdoor plans theek lag rahe hain.",
            "The forecast is available, but I cannot calculate a complete route safety score yet. Keep checking the live forecast before travelling.": "Forecast available hai, lekin abhi complete route safety score calculate nahi ho paaya. Travel se pehle live forecast phir check kar lena.",
            "I can share the live forecast, but a complete safety score is unavailable because the provider did not return enough hourly risk inputs.": "Live forecast mil raha hai, lekin provider se enough hourly risk data nahi mila, isliye complete safety score available nahi hai.",
        }[direct]
        reason_text = "Provider se enough hourly risk data nahi mila." if numeric_score is None else (" ".join(_hinglish_reasons(reasons)) or "Koi bada weather risk signal nahi mila.")
        action_text = " ".join(_hinglish_actions(actions))
        details = []
        if carry: details.append("Saath rakhna: " + ", ".join(_localized_items(carry, "hinglish")))
        if avoid: details.append("Avoid karna: " + ", ".join(_localized_items(avoid, "hinglish")))
        rain_text = f" Baarish ke chances {probability}% hain." if rain is not None else ""
        score_text = f"{score}/100 ({level})" if numeric_score is not None else "available nahi hai"
        return f"{location} mein {direct_hi} Overall weather risk {score_text} hai.{rain_text} Reason: {reason_text} Advice: {action_text} {' '.join(details)}".strip()
    reason_text = "The provider did not return enough hourly risk inputs to calculate a safety score." if numeric_score is None else (" ".join(reasons) or "No major weather risk signal crossed the advisory threshold.")
    action_text = " ".join(actions)
    details = []
    if carry: details.append("Carry: " + ", ".join(carry))
    if avoid: details.append("Avoid: " + ", ".join(avoid))
    rain_text = f" Rain chance is {probability}%." if rain is not None else ""
    score_text = f"{score}/100 ({level})" if numeric_score is not None else "unavailable"
    return f"{location}: {direct} Overall weather risk is {score_text}.{rain_text} The main reason is {reason_text} {action_text} {' '.join(details)}".strip()


def _condition_text(condition: Any, language: str) -> str:
    condition = str(condition or "unknown conditions").lower()
    translations = {
        "hi": {
            "thunderstorm with slight hail": "गरज-चमक के साथ हल्के ओले", "thunderstorm": "गरज-चमक",
            "mainly clear": "आसमान ज्यादातर साफ", "partly cloudy": "कुछ बादल", "clear sky": "आसमान साफ",
            "overcast": "बादल छाए हुए", "rain": "बारिश", "precipitation": "बारिश या बूंदाबांदी", "fog": "कोहरा",
        },
        "hinglish": {
            "thunderstorm with slight hail": "garaj-chamak ke saath halke ole", "thunderstorm": "garaj-chamak",
            "mainly clear": "aasman zyada tar saaf", "partly cloudy": "thode baadal", "clear sky": "aasman saaf",
            "overcast": "baadal chhaye hue", "rain": "baarish", "precipitation": "baarish ya boondabaandi", "fog": "kohra",
        },
        "gu": {
            "thunderstorm with slight hail": "હળવા કરા સાથે ગાજવીજ", "thunderstorm": "ગાજવીજ",
            "mainly clear": "આકાશ મોટાભાગે સાફ", "partly cloudy": "થોડા વાદળો", "clear sky": "આકાશ સાફ",
            "overcast": "વાદળછાયું", "rain": "વરસાદ", "precipitation": "વરસાદ અથવા ઝરમર", "fog": "ધુમ્મસ",
        },
    }
    return translations.get(language, {}).get(condition, condition)


def _forecast_values(weather_data: dict[str, Any]) -> tuple[Any, Any, Any]:
    day = (weather_data.get("forecast") or [{}])[0]
    return (
        day.get("temperature_max_c", "--"),
        day.get("temperature_min_c", "--"),
        day.get("precipitation_probability_percent", "--"),
    )


def _practical_forecast_advice(max_temperature: Any, min_temperature: Any, rain_probability: Any, language: str) -> str:
    try:
        rain = float(rain_probability)
    except (TypeError, ValueError):
        rain = None
    try:
        high = float(max_temperature)
    except (TypeError, ValueError):
        high = None
    try:
        low = float(min_temperature)
    except (TypeError, ValueError):
        low = None

    rain_advice = rain is not None and rain >= 40
    heat_advice = high is not None and high > 35
    cold_advice = low is not None and low < 15
    if language == "hi":
        parts = []
        if rain_advice:
            parts.append("छाता या रेनकोट साथ रखें और गीली सड़कों की वजह से थोड़ा जल्दी निकलें—ट्रैफिक धीमा हो सकता है।")
        if heat_advice:
            parts.append("पानी साथ रखें, सनस्क्रीन लगाएं और दोपहर की तेज़ गर्मी में बाहर कम रहें।")
        if cold_advice:
            parts.append("हल्की जैकेट या गर्म कपड़े साथ रखें।")
        return " ".join(parts) or "मौसम के हिसाब से सामान्य बाहर जाने की योजना ठीक लगती है; निकलने से पहले एक बार अपडेट देख लें।"
    if language == "hinglish":
        parts = []
        if rain_advice:
            parts.append("Chhata ya raincoat rakh lena, aur geeli sadkon ki wajah se thoda jaldi nikalna—traffic slow ho sakta hai.")
        if heat_advice:
            parts.append("Paani aur sunscreen zaroor rakhna, aur dopahar ki tez garmi mein bahar kam rehna.")
        if cold_advice:
            parts.append("Halki jacket ya warm layer saath rakhna.")
        return " ".join(parts) or "Weather ke hisaab se normal outdoor plans theek lag rahe hain; nikalne se pehle ek quick update dekh lena."
    if language == "gu":
        parts = []
        if rain_advice:
            parts.append("છત્રી અથવા રેનકોટ સાથે રાખો અને થોડું વહેલું નીકળો—ભીના રસ્તાઓ પર ટ્રાફિક ધીમો થઈ શકે છે.")
        if heat_advice:
            parts.append("પાણી અને સનસ્ક્રીન સાથે રાખો, અને બપોરની સૌથી વધુ ગરમીમાં બહાર ઓછું રહો.")
        if cold_advice:
            parts.append("હળવું જાકેટ અથવા ગરમ કપડાં સાથે રાખો.")
        return " ".join(parts) or "મળેલી આગાહી મુજબ સામાન્ય બહારની યોજના યોગ્ય લાગે છે; નીકળતા પહેલાં ફરી એકવાર અપડેટ તપાસો."
    parts = []
    if rain_advice:
        parts.append("Carry an umbrella or raincoat and leave a little early—wet roads can slow traffic.")
    if heat_advice:
        parts.append("Keep water and sunscreen handy, and avoid staying outside during the hottest hours.")
    if cold_advice:
        parts.append("A light jacket or warm layer would be useful.")
    return " ".join(parts) or "Normal outdoor plans look reasonable from the available forecast; check once more before you leave."


def _fallback_weather(language: str, location: str, weather_data: dict[str, Any], intent: str) -> str:
    if intent == "current_weather":
        current = weather_data.get("current", {})
        temperature = current.get("temperature_c", "--")
        condition = _condition_text(current.get("condition"), language)
        humidity = current.get("humidity_percent", "--")
        wind = current.get("wind_speed_kmh", "--")
        rain_now = current.get("rain_mm") or current.get("precipitation_mm") or 0
        try:
            raining_now = float(rain_now) > 0.1
        except (TypeError, ValueError):
            raining_now = False
        if language == "hi":
            now = "अभी बारिश हो रही है" if raining_now else f"अभी तापमान {temperature}°C है और मौसम {condition} है"
            advice = "छाता लेकर निकलें और गीली सड़कों पर सावधानी रखें।" if raining_now else ("पानी साथ रखें और दोपहर में धूप से बचें।" if isinstance(temperature, (int, float)) and temperature > 35 else "बाहर जाने के लिए मौसम ठीक लग रहा है।")
            return f"{location} में {now}। नमी {humidity}% है और हवा {wind} किमी/घंटा की रफ्तार से चल रही है। {advice}"
        if language == "hinglish":
            now = "abhi baarish ho rahi hai" if raining_now else f"abhi temperature {temperature}°C hai aur weather {condition} hai"
            advice = "Chhata lekar nikalna aur geeli sadkon par thoda sambhalna." if raining_now else ("Paani saath rakhna aur dopahar ki dhoop se bachna." if isinstance(temperature, (int, float)) and temperature > 35 else "Bahar jaane ke liye weather theek lag raha hai.")
            return f"{location} mein {now}. Humidity {humidity}% hai aur hawa {wind} km/h ki speed se chal rahi hai. {advice}"
        if language == "gu":
            now = "હમણાં વરસાદ પડી રહ્યો છે" if raining_now else f"હમણાં તાપમાન {temperature}°C છે અને હવામાન {condition} છે"
            advice = "છત્રી લઈને નીકળો અને ભીના રસ્તાઓ પર સાવધાની રાખો." if raining_now else "બહાર જતાં પહેલાં તાજું અપડેટ ચકાસો."
            return f"{location}માં {now}. ભેજ {humidity}% છે અને પવન {wind} km/h છે. {advice}"
        now = "it is raining right now" if raining_now else f"it is {temperature}°C with {condition} conditions"
        advice = "Take an umbrella and be careful on wet roads." if raining_now else ("Keep water handy and avoid the hottest hours." if isinstance(temperature, (int, float)) and temperature > 35 else "It looks comfortable for normal outdoor plans.")
        return f"Right now in {location}, {now}. Humidity is {humidity}% and wind is {wind} km/h. {advice}"

    high, low, rain_probability = _forecast_values(weather_data)
    advice = _practical_forecast_advice(high, low, rain_probability, language)
    if language == "hi":
        return f"{location} का पूर्वानुमान: अधिकतम {high}°C, न्यूनतम {low}°C और बारिश की संभावना {rain_probability}% है। {advice}"
    if language == "hinglish":
        return f"{location} ka forecast: maximum {high}°C, minimum {low}°C, aur baarish ke chances {rain_probability}% hain. {advice}"
    if language == "gu":
        return f"{location} માટે આગાહી: મહત્તમ {high}°C, લઘુત્તમ {low}°C અને વરસાદની શક્યતા {rain_probability}% છે. બહાર જતાં પહેલાં તાજું અપડેટ ચકાસો."
    return f"Here’s the outlook for {location}: a high of {high}°C, a low of {low}°C, and a {rain_probability}% chance of rain. {advice}"


def _localize_hindi_response(response: str) -> str:
    replacements = {
        "Delhi": "दिल्ली", "New Delhi": "नई दिल्ली", "Gurugram": "गुरुग्राम",
        "Chennai": "चेन्नई", "Kolkata": "कोलकाता", "Mumbai": "मुंबई",
        "Pithoragarh": "पिथौरागढ़", "thunderstorm with slight hail": "गरज-चमक के साथ हल्के ओले",
        "thunderstorm": "गरज-चमक", "slight hail": "हल्के ओले", "overcast": "बादल छाए हुए",
        "mainly clear": "आसमान ज्यादातर साफ", "partly cloudy": "कुछ बादल", "clear sky": "आसमान साफ", "clear conditions": "साफ मौसम", "fog": "कोहरा",
    }
    for source, target in replacements.items():
        response = response.replace(source, target).replace(source.lower(), target)
    return response


def process_chat_message(
    message: str,
    latitude: float | None = None,
    longitude: float | None = None,
    language: str | None = None,
    conversation_id: str | None = None,
    profile: str = "general_public",
    route_context: dict[str, Any] | None = None,
    location: str | None = None,
) -> dict[str, Any]:
    """Select a trusted location, retrieve weather, and generate an answer."""
    conversation = get_conversation(conversation_id) if conversation_id else None
    if conversation is None:
        conversation = create_conversation(conversation_id)
    conversation_id = conversation["conversation_id"]
    previous_context = {**conversation_context(conversation), **({"route_context": route_context} if route_context else {})}
    ai_used = True
    fallback_used = False
    fallback_reason: str | None = None
    try:
        query: WeatherQuery = interpret_weather_query(message, previous_context)
    except LLMServiceError as exc:
        parsed = parse_weather_query(message, previous_context)
        query = WeatherQuery(intent=parsed["intent"], location=parsed["location"], location_mode=parsed["location_mode"], time_reference=parsed["time_reference"], request_type=parsed["request_type"])
        ai_used = False
        fallback_used = True
        fallback_reason = "llm_interpretation_failed"
    # A city explicitly present in the user's latest message always wins over
    # model output and previous context (important for "...in Chennai?").
    explicit = parse_weather_query(message)
    if _asks_for_current_location(message):
        query = query.model_copy(update={"location": None, "location_mode": "current_location"})
        explicit = {**explicit, "location": None}
    explicit_named_location = bool(explicit.get("location"))
    if explicit_named_location:
        query = query.model_copy(update={"location": explicit["location"], "location_mode": "named_location"})
        if explicit.get("intent") != "unknown":
            query = query.model_copy(update={"intent": explicit["intent"]})
        elif any(phrase in message.lower() for phrase in ("talking about", "i mean", "actually", "asking about", "ke baare", "के बारे")):
            # A correction such as "I am talking about Gurugram" supplies a
            # new place even when the user does not repeat the word weather.
            query = query.model_copy(update={"intent": "current_weather", "request_type": "general_weather"})
    # A provider may correctly understand "tomorrow" but omit the implicit
    # city. Fill only from the user's own recent context; never guess a city.
    if query.location is not None and query.location.strip().lower() in {"there", "here", "it", "that", "me", "my location", "near me"}:
        pronoun = query.location.strip().lower()
        mode = "current_location" if pronoun in {"me", "near me", "my location"} else query.location_mode
        query = query.model_copy(update={"location": None, "location_mode": mode})
    if query.location is None and query.location_mode != "current_location" and previous_context.get("last_location"):
        query = query.model_copy(update={"location": previous_context["last_location"], "location_mode": "named_location"})
    decision_question = _asks_for_decision(message)
    if decision_question and query.intent == "unknown":
        query = query.model_copy(update={"intent": "forecast", "time_reference": "tomorrow" if "tomorrow" in message.lower() else query.time_reference, "request_type": "forecast"})
    if query.intent == "unknown" and previous_context.get("last_intent") and any(
        phrase in message.lower() for phrase in ("explain", "detail", "that", "there", "then", "what about", "will it", "how hot", "how cold")
    ):
        query = query.model_copy(update={"intent": previous_context["last_intent"]})
    saved_language = get_profile().get("preferences", {}).get("language")
    profile = _normalise_profile(profile)
    selected_language = get_language(_language_from_message(message) or language or saved_language)
    if language is None and previous_context.get("preferred_language") == "hi":
        selected_language = get_language("hi")
    response_mode = _response_mode(message, selected_language)
    result: dict[str, Any] = {
        "message": message,
        "intent": query.intent,
        "conversation_id": conversation_id,
        "ai_used": ai_used,
        "fallback_used": fallback_used,
        "fallback_reason": fallback_reason,
        "llm_provider": "Gemini" if settings.gemini_api_key else None,
        "llm_model": settings.gemini_model if settings.gemini_api_key else None,
        "data_source": "none",
        "is_live": True,
        "persona": profile,
    }
    result["language"] = selected_language
    result["analysis"] = _query_analysis(query, response_mode, profile, message)
    result["suggestions"] = _follow_up_suggestions(response_mode, profile, query.intent, bool(route_context))
    small_talk = _small_talk_response(message, response_mode)
    if small_talk:
        # Greetings are conversational requests too. Let Gemini generate the
        # response, using the local phrase only if the provider is unavailable.
        try:
            response_language = "Hindi" if response_mode == "hi" else "Hinglish" if response_mode == "hinglish" else selected_language["name"]
            result["response"] = generate_general_response(message, response_language, previous_context)
            result["ai_used"] = True
            result["fallback_used"] = False
            result["fallback_reason"] = None
            result["data_source"] = "Gemini"
        except LLMServiceError:
            result["response"] = small_talk
            result["ai_used"] = False
            result["fallback_used"] = False
            result["fallback_reason"] = None
            result["data_source"] = "conversation"
        add_message(conversation_id, "user", message)
        add_message(conversation_id, "assistant", result["response"], context=previous_context)
        return result
    route_places = _extract_route_places(message)
    if route_places:
        result["suggestions"] = _follow_up_suggestions(response_mode, profile, query.intent, True)
        origin_name, destination_name = route_places
        origin = get_location(origin_name)
        destination = get_location(destination_name)
        if origin is None or destination is None:
            result["response"] = (
                "यात्रा के लिए शुरुआत और मंजिल—दोनों जगहों के सही नाम बताइए。"
                if response_mode == "hi" else
                "Trip ke liye starting point aur destination dono ke clear names batao."
                if response_mode == "hinglish" else
                "Please provide clear names for both the starting point and destination."
            )
            add_message(conversation_id, "user", message)
            add_message(conversation_id, "assistant", result["response"], context=previous_context)
            return result
        route_query = parse_weather_query(message, previous_context)
        route_decision = decision_question
        route_forecast = route_decision or route_query["intent"] == "forecast"
        try:
            if route_forecast:
                origin_weather = _route_forecast(get_weather_forecast(origin["latitude"], origin["longitude"], days=2), route_query["time_reference"])
                destination_weather = _route_forecast(get_weather_forecast(destination["latitude"], destination["longitude"], days=2), route_query["time_reference"])
            else:
                origin_weather = get_current_weather(origin["latitude"], origin["longitude"])
                destination_weather = get_current_weather(destination["latitude"], destination["longitude"])
        except WeatherServiceError:
            result["response"] = (
                "अभी यात्रा के मौसम का डेटा नहीं मिल पाया। थोड़ी देर बाद फिर कोशिश करें।"
                if response_mode == "hi" else
                "Abhi trip weather data nahi mil paaya. Thodi der baad phir try karo."
                if response_mode == "hinglish" else
                "I could not retrieve the trip weather right now. Please try again in a moment."
            )
            add_message(conversation_id, "user", message)
            add_message(conversation_id, "assistant", result["response"], context=previous_context)
            return result
        origin = {**origin, "source": "named_location"}
        destination = {**destination, "source": "named_location"}
        result["intent"] = "forecast" if route_forecast else "current_weather"
        result["location"] = destination
        result["route"] = {
            "origin": {"name": origin["name"], "latitude": origin["latitude"], "longitude": origin["longitude"]},
            "destination": {"name": destination["name"], "latitude": destination["latitude"], "longitude": destination["longitude"]},
        }
        result["data_source"] = "Open-Meteo"
        result["response"] = _route_response(message, origin, destination, origin_weather, destination_weather, route_forecast, route_decision, response_mode)
        add_message(conversation_id, "user", message)
        add_message(conversation_id, "assistant", result["response"], context={"last_location": destination["name"], "last_intent": result["intent"], "preferred_language": selected_language["code"], "last_route": result["route"]})
        from backend.services.json_data_service import update_profile
        update_profile({"language": selected_language["code"], "profile_type": profile, "route": {"origin": origin["name"], "destination": destination["name"], "origin_coordinates": {"latitude": origin["latitude"], "longitude": origin["longitude"]}, "destination_coordinates": {"latitude": destination["latitude"], "longitude": destination["longitude"]}}})
        result["context"] = {"origin": origin["name"], "destination": destination["name"], "time_reference": route_query["time_reference"]}
        return result
    # A short follow-up such as “why?” refers to the last decision, not to a
    # brand-new weather lookup. Reuse the saved evidence and actions so voice
    # and text conversations behave identically.
    previous_decision = previous_context.get("last_decision")
    if _is_why_followup(message) and isinstance(previous_decision, dict):
        result["intent"] = previous_context.get("last_intent", "forecast")
        result["response"] = _explain_previous_decision(previous_decision, response_mode)
        result["decision"] = previous_decision
        result["location"] = previous_decision.get("location")
        result["data_source"] = "conversation_context"
        add_message(conversation_id, "user", message)
        add_message(conversation_id, "assistant", result["response"], context=previous_context)
        return result
    previous_weather = previous_context.get("last_weather")
    if _is_why_followup(message) and isinstance(previous_weather, dict) and previous_context.get("last_location"):
        result["intent"] = previous_context.get("last_intent", "current_weather")
        result["response"] = _explain_previous_weather(previous_weather, previous_context["last_location"], response_mode)
        result["location"] = {"name": previous_context["last_location"]}
        result["data_source"] = "conversation_context"
        add_message(conversation_id, "user", message)
        add_message(conversation_id, "assistant", result["response"], context=previous_context)
        return result
    if query.intent in {"general_chat", "app_help"}:
        try:
            response_language = "Hindi" if response_mode == "hi" else "Hinglish" if response_mode == "hinglish" else selected_language["name"]
            result["response"] = generate_general_response(
                message, response_language, previous_context, app_help=query.intent == "app_help"
            )
            result["intent"] = query.intent
            result["data_source"] = "Gemini"
        except LLMServiceError:
            result["ai_used"] = False
            result["fallback_used"] = True
            result["fallback_reason"] = "llm_generation_failed"
            result["response"] = "I can help with WeatherGPT features, weather questions, and normal conversation."
        add_message(conversation_id, "user", message)
        add_message(conversation_id, "assistant", result["response"], context=previous_context)
        return result
    if query.intent == "unknown":
        result["response"] = (
            "मैं WeatherGPT हूँ और मौसम से जुड़े सवालों में मदद कर सकता हूँ। अपने शहर का मौसम या पूर्वानुमान पूछें।"
            if response_mode == "hi" else
            "Main WeatherGPT hoon—weather se jude sawaal poochho, jaise aaj ka mausam, baarish ya forecast."
            if response_mode == "hinglish" else
            "I’m WeatherGPT, so I’m best suited to weather and forecast questions. Try asking me about the weather in your city."
        )
        add_message(conversation_id, "user", message)
        add_message(conversation_id, "assistant", result["response"], context=previous_context)
        return result

    resolved_location: dict[str, Any] | None = None
    # 1. Explicit coordinates always take precedence for weather retrieval.
    if latitude is not None and longitude is not None:
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            result["response"] = "Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180."
            add_message(conversation_id, "user", message)
            add_message(conversation_id, "assistant", result["response"], context=previous_context)
            return result
        geo = reverse_geocode(latitude, longitude)
        name_str = (
            location
            or (geo.get("name") if geo else None)
            or (query.location if query.location else None)
            or previous_context.get("last_location")
            or "selected location"
        )
        resolved_location = {
            "name": name_str,
            "latitude": latitude,
            "longitude": longitude,
            "source": "device_gps" if query.location_mode == "current_location" else "coordinates",
        }
    elif query.location_mode == "current_location":
        result["response"] = (
            "‘मेरे पास’ का मौसम बताने के लिए आपके फ़ोन का स्थान चाहिए। कृपया स्थान की अनुमति दें और फिर कोशिश करें।"
            if response_mode == "hi" else
            "Near me ka weather batane ke liye phone ki location chahiye. Location allow karke phir try karo."
            if response_mode == "hinglish" else
            "I need your device location to answer a 'near me' weather question. Please allow location access and try again."
        )
        add_message(conversation_id, "user", message)
        add_message(conversation_id, "assistant", result["response"], context=previous_context)
        return result
    else:
        target_name = location or query.location
        if target_name is None:
            result["response"] = (
                "कृपया शहर का नाम लिखें या अपने वर्तमान स्थान की अनुमति दें।"
                if response_mode == "hi" else
                "City ka naam batao, ya current location allow karo—phir main weather check kar deta hoon."
                if response_mode == "hinglish" else
                "Please include a city name, or allow location access so I can answer for your current location."
            )
            add_message(conversation_id, "user", message)
            add_message(conversation_id, "assistant", result["response"], context=previous_context)
            return result
        found_loc = get_location(target_name)
        if found_loc is None and previous_context.get("last_location", "").strip().lower() == target_name.strip().lower():
            if previous_context.get("last_latitude") is not None and previous_context.get("last_longitude") is not None:
                found_loc = {"name": target_name, "latitude": previous_context["last_latitude"], "longitude": previous_context["last_longitude"]}
        if found_loc is None:
            result["ai_used"] = False
            result["fallback_used"] = True
            result["fallback_reason"] = "location_not_found"
            result["data_source"] = "none"
            result["response"] = "I could not find that place in India. Please check the spelling and try again."
            add_message(conversation_id, "user", message)
            add_message(conversation_id, "assistant", result["response"], context=previous_context)
            return result
        resolved_location = {**found_loc, "source": "named_location"}

    result["location"] = resolved_location

    try:
        if query.intent == "current_weather":
            weather_data = get_current_weather(resolved_location["latitude"], resolved_location["longitude"])
        else:
            days = 2 if query.time_reference.lower() in {"tomorrow", "next day", "day_after_tomorrow"} else 1
            weather_data = get_weather_forecast(resolved_location["latitude"], resolved_location["longitude"], days=days)
            if query.time_reference.lower() == "tomorrow":
                weather_data["forecast"] = weather_data["forecast"][1:2]
            elif query.time_reference.lower() == "day_after_tomorrow":
                weather_data["forecast"] = weather_data["forecast"][2:3]
    except WeatherServiceError:
        result["ai_used"] = False
        result["fallback_used"] = True
        result["fallback_reason"] = "weather_provider_unavailable"
        result["data_source"] = "none"
        result["is_live"] = False
        result["response"] = (
            "अभी इस स्थान के लिए लाइव मौसम डेटा उपलब्ध नहीं है। मैं अनुमान नहीं लगाऊँगा—कृपया थोड़ी देर बाद फिर कोशिश करें।"
            if response_mode == "hi" else
            "Abhi is location ke liye live weather data available nahi hai. Main guess nahi karunga—thodi der baad try karo."
            if response_mode == "hinglish" else
            "Live weather data for this location is temporarily unavailable. I won't guess the conditions—please try again shortly."
        )
        add_message(conversation_id, "user", message)
        add_message(conversation_id, "assistant", result["response"], context=previous_context)
        return result

    result["data_source"] = weather_data.get("source", "Open-Meteo")
    result["is_live"] = weather_data.get("is_live", True)
    result["weather_timestamp"] = weather_data.get("current", {}).get("observed_at")

    if not settings.gemini_api_key:
        result["ai_used"] = False
        result["fallback_used"] = True
        result["fallback_reason"] = "llm_not_configured"

    if decision_question:
        if query.time_reference == "tomorrow" and len(weather_data.get("hourly", [])) > 24:
            weather_data["hourly"] = weather_data["hourly"][24:48]
        decision = analyze_decision(weather_data, resolved_location["latitude"], resolved_location["longitude"], profile, message, resolved_location["name"])
        result["decision"] = decision
        result["response"] = _decision_response(message, decision, weather_data, resolved_location["name"], response_mode)
        result["context"] = {"location": resolved_location["name"], "time_reference": query.time_reference}
        add_message(conversation_id, "user", message)
        saved_decision = {
            "decision_id": decision.get("decision_id"),
            "location": decision.get("location"),
            "risk_score": decision.get("risk_score"),
            "risk_level": decision.get("risk_level"),
            "why": decision.get("why", []),
            "recommended_actions": decision.get("recommended_actions", []),
            "what_to_carry": decision.get("what_to_carry", []),
            "what_to_avoid": decision.get("what_to_avoid", []),
            "precautions": decision.get("precautions", []),
            "peak_risk_window": decision.get("peak_risk_window"),
        }
        add_message(
            conversation_id,
            "assistant",
            result["response"],
            context={
                "last_location": resolved_location["name"],
                "last_latitude": resolved_location["latitude"],
                "last_longitude": resolved_location["longitude"],
                "last_intent": query.intent,
                "preferred_language": selected_language["code"],
                "last_decision": saved_decision,
            },
        )
        return result

    if result["ai_used"]:
        try:
            response_language = "Hindi" if response_mode == "hi" else "Hinglish" if response_mode == "hinglish" else selected_language["name"]
            result["response"] = generate_weather_response(message, query, weather_data, response_language, previous_context, profile)
            if response_mode == "hi":
                result["response"] = _localize_hindi_response(result["response"])
        except LLMServiceError:
            result["ai_used"] = False
            result["fallback_used"] = True
            result["fallback_reason"] = "llm_generation_failed"
            result["response"] = _fallback_weather(response_mode, resolved_location["name"], weather_data, query.intent)
    else:
        result["fallback_used"] = True
        if not result.get("fallback_reason"):
            result["fallback_reason"] = "llm_not_configured" if not settings.gemini_api_key else "llm_interpretation_failed"
        result["response"] = _fallback_weather(response_mode, resolved_location["name"], weather_data, query.intent)

    saved_coordinates = resolved_location.get("source") != "device_gps"
    context = {
        "last_location": resolved_location["name"],
        "last_latitude": resolved_location["latitude"] if saved_coordinates else None,
        "last_longitude": resolved_location["longitude"] if saved_coordinates else None,
        "location_source": resolved_location.get("source"),
        "last_intent": query.intent,
        "last_time_reference": query.time_reference,
        "last_request_type": query.request_type,
        "preferred_language": selected_language["code"],
        "last_weather": {"current": weather_data.get("current"), "forecast": weather_data.get("forecast", [])[:2]},
    }
    add_message(conversation_id, "user", message)
    add_message(conversation_id, "assistant", result["response"], context=context)
    from backend.services.json_data_service import update_profile
    update_profile(
        {
            "language": selected_language["code"],
            "profile_type": profile,
            "location": {
                "name": resolved_location["name"],
                "latitude": resolved_location["latitude"],
                "longitude": resolved_location["longitude"],
                "source": resolved_location.get("source"),
            },
        }
    )
    result["context"] = {"location": resolved_location["name"], "time_reference": query.time_reference}
    return result

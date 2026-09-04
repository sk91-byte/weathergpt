"""Canonical response-language registry for chat, preferences, and voice."""

from typing import Any

LANGUAGE_REGISTRY: tuple[dict[str, Any], ...] = (
    {"code":"en","english_name":"English","native_name":"English","script":"Latin","is_scheduled_language":False,"enabled":True},
    {"code":"as","english_name":"Assamese","native_name":"অসমীয়া","script":"Assamese","is_scheduled_language":True,"enabled":True},
    {"code":"bn","english_name":"Bengali","native_name":"বাংলা","script":"Bengali","is_scheduled_language":True,"enabled":True},
    {"code":"brx","english_name":"Bodo","native_name":"बड़ो","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"doi","english_name":"Dogri","native_name":"डोगरी","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"gu","english_name":"Gujarati","native_name":"ગુજરાતી","script":"Gujarati","is_scheduled_language":True,"enabled":True},
    {"code":"hi","english_name":"Hindi","native_name":"हिन्दी","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"kn","english_name":"Kannada","native_name":"ಕನ್ನಡ","script":"Kannada","is_scheduled_language":True,"enabled":True},
    {"code":"ks","english_name":"Kashmiri","native_name":"कॉशुर","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"gom","english_name":"Konkani","native_name":"कोंकणी","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"ml","english_name":"Malayalam","native_name":"മലയാളം","script":"Malayalam","is_scheduled_language":True,"enabled":True},
    {"code":"mni","english_name":"Manipuri","native_name":"মৈতৈলোন্","script":"Meitei Bengali","is_scheduled_language":True,"enabled":True},
    {"code":"mr","english_name":"Marathi","native_name":"मराठी","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"mai","english_name":"Maithili","native_name":"मैथिली","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"ne","english_name":"Nepali","native_name":"नेपाली","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"or","english_name":"Odia","native_name":"ଓଡ଼ିଆ","script":"Odia","is_scheduled_language":True,"enabled":True},
    {"code":"pa","english_name":"Punjabi","native_name":"ਪੰਜਾਬੀ","script":"Gurmukhi","is_scheduled_language":True,"enabled":True},
    {"code":"sa","english_name":"Sanskrit","native_name":"संस्कृतम्","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"sat","english_name":"Santhali","native_name":"ᱥᱟᱱᱛᱟᱲᱤ","script":"Ol Chiki","is_scheduled_language":True,"enabled":True},
    {"code":"sd","english_name":"Sindhi","native_name":"سنڌي","script":"Arabic","is_scheduled_language":True,"enabled":True},
    {"code":"ta","english_name":"Tamil","native_name":"தமிழ்","script":"Tamil","is_scheduled_language":True,"enabled":True},
    {"code":"te","english_name":"Telugu","native_name":"తెలుగు","script":"Telugu","is_scheduled_language":True,"enabled":True},
    {"code":"ur","english_name":"Urdu","native_name":"اُردُو","script":"Arabic","is_scheduled_language":True,"enabled":True},
)
LANGUAGES = {item["code"]: item["english_name"] for item in LANGUAGE_REGISTRY}

def supported_language_codes() -> set[str]:
    return {item["code"] for item in LANGUAGE_REGISTRY if item["enabled"]}

def languages() -> list[dict[str, Any]]:
    return [dict(item) for item in LANGUAGE_REGISTRY if item["enabled"]]

def is_supported_language(code: str | None) -> bool:
    return (code or "en").strip().lower() in supported_language_codes()

def get_language(code: str | None) -> dict[str, Any]:
    normalized = (code or "en").lower().strip()
    item = next((item for item in LANGUAGE_REGISTRY if item["code"] == normalized and item["enabled"]), LANGUAGE_REGISTRY[0])
    return {"code": item["code"], "name": item["english_name"], "native_name": item["native_name"]}

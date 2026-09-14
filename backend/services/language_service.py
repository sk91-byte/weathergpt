"""Canonical response-language registry for chat, preferences, and voice."""

from typing import Any

LANGUAGE_REGISTRY: tuple[dict[str, Any], ...] = (
    {"code":"en","english_name":"English","native_name":"English","locale":"en-IN","script":"Latin","is_scheduled_language":False,"enabled":True},
    {"code":"as","english_name":"Assamese","native_name":"অসমীয়া","locale":"as-IN","script":"Assamese","is_scheduled_language":True,"enabled":True},
    {"code":"bn","english_name":"Bengali","native_name":"বাংলা","locale":"bn-IN","script":"Bengali","is_scheduled_language":True,"enabled":True},
    {"code":"brx","english_name":"Bodo","native_name":"बड़ो","locale":"brx-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"doi","english_name":"Dogri","native_name":"डोगरी","locale":"doi-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"gu","english_name":"Gujarati","native_name":"ગુજરાતી","locale":"gu-IN","script":"Gujarati","is_scheduled_language":True,"enabled":True},
    {"code":"hi","english_name":"Hindi","native_name":"हिन्दી","locale":"hi-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"kn","english_name":"Kannada","native_name":"ಕನ್ನಡ","locale":"kn-IN","script":"Kannada","is_scheduled_language":True,"enabled":True},
    {"code":"ks","english_name":"Kashmiri","native_name":"कॉशुर","locale":"ks-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"gom","english_name":"Konkani","native_name":"कोंकणी","locale":"kok-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"ml","english_name":"Malayalam","native_name":"മലയാളം","locale":"ml-IN","script":"Malayalam","is_scheduled_language":True,"enabled":True},
    {"code":"mni","english_name":"Manipuri","native_name":"মৈতৈলোন্","locale":"mni-IN","script":"Meitei Bengali","is_scheduled_language":True,"enabled":True},
    {"code":"mr","english_name":"Marathi","native_name":"मराठी","locale":"mr-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"mai","english_name":"Maithili","native_name":"मैथिली","locale":"mai-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"ne","english_name":"Nepali","native_name":"नेपाली","locale":"ne-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"or","english_name":"Odia","native_name":"ଓଡ଼ିଆ","locale":"or-IN","script":"Odia","is_scheduled_language":True,"enabled":True},
    {"code":"pa","english_name":"Punjabi","native_name":"ਪੰਜਾਬੀ","locale":"pa-IN","script":"Gurmukhi","is_scheduled_language":True,"enabled":True},
    {"code":"sa","english_name":"Sanskrit","native_name":"संस्कृतम्","locale":"sa-IN","script":"Devanagari","is_scheduled_language":True,"enabled":True},
    {"code":"sat","english_name":"Santhali","native_name":"ᱥᱟᱱᱛᱟᱲᱤ","locale":"sat-IN","script":"Ol Chiki","is_scheduled_language":True,"enabled":True},
    {"code":"sd","english_name":"Sindhi","native_name":"سنڌي","locale":"sd-IN","script":"Arabic","is_scheduled_language":True,"enabled":True},
    {"code":"ta","english_name":"Tamil","native_name":"தமிழ்","locale":"ta-IN","script":"Tamil","is_scheduled_language":True,"enabled":True},
    {"code":"te","english_name":"Telugu","native_name":"తెలుగు","locale":"te-IN","script":"Telugu","is_scheduled_language":True,"enabled":True},
    {"code":"ur","english_name":"Urdu","native_name":"اُردُو","locale":"ur-IN","script":"Arabic","is_scheduled_language":True,"enabled":True},
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
    return {"code": item["code"], "name": item["english_name"], "native_name": item["native_name"], "locale": item["locale"], "script": item["script"]}

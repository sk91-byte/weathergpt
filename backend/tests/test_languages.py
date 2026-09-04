from backend.services.language_service import is_supported_language, languages


def test_registry_has_english_plus_22_scheduled_languages():
    values = languages()
    assert len(values) == 23
    assert sum(item["is_scheduled_language"] for item in values) == 22
    assert is_supported_language("hi")
    assert is_supported_language("gom")
    assert not is_supported_language("xyz")

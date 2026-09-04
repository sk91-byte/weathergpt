"""Optional image-analysis boundary; no fake classifier is provided."""


def analyze_weather_image(image_url: str | None = None) -> dict:
    return {"available": False, "reason": "No image-analysis provider is configured", "image_url": image_url}

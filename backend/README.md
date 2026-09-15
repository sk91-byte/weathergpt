# WeatherGPT backend

This directory contains the FastAPI backend for the WeatherGPT web and mobile clients. Run it from the project root with:

```powershell
uvicorn backend.main:app --reload
```

The backend uses optional values from `backend/.env`; defaults keep it runnable when that file does not exist. Open-Meteo supplies current, hourly, forecast, and historical weather data. IMD adapters are available when credentials or approved IP access are configured. NDMA SACHET RSS/CAP is used for official disaster-feed ingestion when enabled. Provider failures are returned as unavailable; the backend does not generate placeholder weather.

Gemini and Groq integrations are optional for `/chat`, translation/explanation, IMD briefing summaries, and voice. Set the relevant API keys in `backend/.env` to enable them. The weather and alert providers remain the source of truth.

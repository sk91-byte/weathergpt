# WeatherGPT backend

This directory contains the Task 1 FastAPI backend. Run it from the project root with:

```powershell
uvicorn backend.main:app --reload
```

The backend uses optional values from `backend/.env`; defaults keep it runnable when that file does not exist. Current weather and forecast requests are fetched from Open-Meteo, with WeatherAPI used only when its optional key is configured and Open-Meteo is unavailable. Provider failures are returned as unavailable; the backend does not generate placeholder weather.

Task 4 adds an optional Gemini integration for `/chat`. Set `GEMINI_API_KEY` in `backend/.env` to enable LLM-powered query understanding and answer generation. The weather API remains the source of truth.

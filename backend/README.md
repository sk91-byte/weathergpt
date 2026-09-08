# WeatherGPT backend

This directory contains the Task 1 FastAPI backend. Run it from the project root with:

```powershell
uvicorn backend.main:app --reload
```

The backend uses optional values from `backend/.env`; defaults keep it runnable when that file does not exist. For Indian coordinates, IMD is the preferred current/city-forecast provider once `IMD_API_KEY` or approved IP access is configured. Open-Meteo remains the global fallback and supplies hourly inputs and historical climate data; WeatherAPI is used only when its optional key is configured and Open-Meteo is unavailable. Provider failures are returned as unavailable; the backend does not generate placeholder weather.

Task 4 adds an optional Gemini integration for `/chat`. Set `GEMINI_API_KEY` in `backend/.env` to enable LLM-powered query understanding and answer generation. The weather API remains the source of truth.

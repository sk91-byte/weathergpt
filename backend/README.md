# WeatherGPT backend

This directory contains the Task 1 FastAPI backend. Run it from the project root with:

```powershell
uvicorn backend.main:app --reload
```

The backend uses optional values from `backend/.env`; defaults keep it runnable when that file does not exist. The weather service currently returns demo data and does not call an external API.

Task 4 adds an optional Gemini integration for `/chat`. Set `GEMINI_API_KEY` in `backend/.env` to enable LLM-powered query understanding and answer generation. The weather API remains the source of truth.

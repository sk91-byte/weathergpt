# WeatherGPT

WeatherGPT is a FastAPI backend foundation for an AI-powered conversational weather application. Task 2 connects it to real weather data from the public [Open-Meteo API](https://open-meteo.com/en/docs). AI/LLM features are intentionally not included yet.

## Project structure

```text
WeatherGPT/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── api/health.py
│   ├── api/weather.py
│   └── services/weather_service.py
├── .gitignore
└── README.md
```

## Windows setup

From the project root:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
python -m uvicorn backend.main:app --reload
```

Open Swagger at `http://127.0.0.1:8000/docs`.

## Weather endpoints

Latitude and longitude are geographic coordinates. Latitude ranges from -90 to 90; longitude ranges from -180 to 180. The values below identify Delhi and Mumbai:

Delhi:

```text
http://127.0.0.1:8000/weather/current?latitude=28.6139&longitude=77.2090
http://127.0.0.1:8000/weather/forecast?latitude=28.6139&longitude=77.2090&days=7
```

Mumbai:

```text
http://127.0.0.1:8000/weather/current?latitude=19.0760&longitude=72.8777
http://127.0.0.1:8000/weather/forecast?latitude=19.0760&longitude=72.8777&days=7
```

Responses contain actual values retrieved from Open-Meteo, not demo weather values. The current response includes temperature, apparent temperature, humidity, precipitation, rain, wind, weather code, and a readable condition. The forecast response includes daily values plus hourly temperature and precipitation probability.

Invalid coordinates return HTTP 400. Forecast values for `days` outside 1–16 return HTTP 400. Provider or network failures return HTTP 503.

## Chat endpoint

Task 3 adds a rule-based natural-language endpoint. It understands basic current-weather and forecast questions for the supported Indian cities. It does not use an AI/LLM yet.

Workflow:

```text
User message -> Query parser -> Location service -> Weather service -> Response
```

Send a `POST` request to `/chat` with JSON such as:

```json
{"message": "What is the weather in Delhi?"}
```

PowerShell example:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/chat -ContentType "application/json" -Body '{"message":"What is the weather in Delhi?"}'
```

Other examples:

```json
{"message": "Will it rain in Mumbai?"}
{"message": "What is the forecast for Bangalore?"}
{"message": "Tell me a joke"}
```

The city directory is intentionally limited to Indian cities until a geocoding service is added. Unsupported cities receive a helpful response rather than fake coordinates. Swagger at `/docs` can also be used to try `POST /chat`.

## AI integration (Task 4)

WeatherGPT now uses Google's official Gemini Python SDK for two stages: the LLM first produces a structured interpretation of the question, then it writes the final answer after the application retrieves real weather data. The LLM is not the source of truth for weather values.

Configure the key locally:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Set `GEMINI_API_KEY` in `backend/.env` and optionally change `GEMINI_MODEL`. Never commit or share this file; `.env` is ignored by Git. Restart Uvicorn after changing it:

```powershell
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

If the key is missing, `/` and `/health` continue to work, while `/chat` returns a clean service-unavailable response. The rule-based parser remains available for comparison, but `/chat` now uses the LLM as its primary interpreter.

## Location and GPS support (Task 5)

`POST /chat` accepts optional `latitude` and `longitude` values supplied by a future phone or frontend. Named cities continue to use the built-in city directory. Phrases such as “near me”, “here”, and “where I am” use device coordinates; without coordinates, the API asks the user to allow location access rather than guessing.

Example GPS request:

```json
{"message": "What is the weather near me?", "latitude": 28.6139, "longitude": 77.2090}
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/chat" -ContentType "application/json" -Body '{"message":"What is the weather near me?","latitude":28.6139,"longitude":77.2090}'
```

GPS forecast requests work the same way:

```json
{"message": "Will it rain here tomorrow?", "latitude": 28.6139, "longitude": 77.2090}
```

For testing reverse geocoding, open:

```text
http://127.0.0.1:8000/location/reverse?latitude=28.6139&longitude=77.2090
```

Reverse geocoding uses the public OpenStreetMap Nominatim service and has a timeout. If it fails, weather lookup still proceeds with the label “Current location”. Precise coordinates are used for the request only and are not permanently stored. See the [Nominatim reverse-geocoding documentation](https://nominatim.org/release-docs/develop/api/Reverse/) for the provider format and usage considerations.

## Remaining platform modules

Tasks 6–13 add modular platform foundations without pretending unavailable integrations are live. Alerts remain explicit mock data, climate uses Open-Meteo Archive data, map weather returns GeoJSON, GFS/WRF report unavailable until configured, and `mobile/` contains a Flutter GPS/chat scaffold. Voice now uses the existing Gemini key for audio understanding and Gemini TTS where configured; English and Hindi are the only verified voice languages.

Install and run tests:

```powershell
python -m pip install -r backend\requirements.txt
python -m pytest backend\tests
```

Run with Docker after creating `backend/.env`:

```powershell
docker compose up --build
```

See [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), and [DEMO.md](DEMO.md) for the complete platform documentation.

## Optional PostgreSQL + PostGIS persistence (Task 15)

### One-click Windows start

For normal development without Docker or PostgreSQL, double-click `Start-WeatherGPT.cmd` in the project folder. It starts the backend and Flutter web frontend in separate windows and opens the homepage. Keep those two windows open while using the app. This uses the local JSON store; no database setup is required.

For a cleaner app-like launch, double-click `Open-WeatherGPT.vbs`. It starts both services hidden and opens the browser without showing terminal windows. Use `Start-WeatherGPT.cmd` instead when troubleshooting because it shows service logs.

The default storage is now a local JSON file at `backend/data/weathergpt.json` (created after the first chat). It stores local development conversations, messages, language preferences, explicitly used locations, saved routes, alert metadata, and data-source metadata. It is git-ignored. Profile preferences can be read or updated through `GET /profile` and `PUT /profile`. Do not use this file as a production multi-user database; add authentication before deployment.

The default `STORAGE_MODE=json` keeps the zero-database development experience while saving local data in `backend/data/weathergpt.json`. PostgreSQL is used only when `DATABASE_URL` is configured and `STORAGE_MODE=postgres`. It stores users, conversations, messages, preferences, geographic references, alert metadata, and data-source metadata; live weather remains sourced from Open-Meteo.

### Windows with Docker Desktop

From the project root:

```powershell
docker compose up --build
```

The compose file starts PostGIS, persists it in the `weathergpt_postgres_data` volume, runs `alembic upgrade head`, and starts FastAPI. Stop it with `docker compose down`; the volume is retained. To remove the database deliberately, use `docker compose down -v`.

### Windows with a local PostgreSQL installation

Create a database named `weathergpt`, enable the PostGIS extension, then set these values in `backend/.env`:

```text
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/weathergpt
STORAGE_MODE=postgres
```

After installing the requirements, run the migration and API separately:

```powershell
python -m pip install -r backend\requirements.txt
alembic upgrade head
python -m uvicorn backend.main:app --reload
```

Check `http://127.0.0.1:8000/health`. It reports `database: not_configured`, `connected`, or `unavailable` without exposing credentials. Conversation endpoints are available at `/conversations`; until authentication is implemented, possession of the opaque conversation ID is only a temporary development access mechanism.
## AI Weather Decision Intelligence

WeatherGPT now supports a deterministic decision-support layer: forecast data is converted into transparent 0–100 risk scores, time windows, impacts, recommended actions, decision confidence, evidence, and data provenance. Gemini may explain or translate these results, but it never invents quantitative risk values.

Try the API with `POST /decision/advice`:

```json
{"latitude":28.6139,"longitude":77.2090,"profile":"traveller","question":"Should I travel tomorrow?"}
```

Use `GET /decision/{decision_id}/explanation` for the WHY evidence. Available profiles include `general_public`, `traveller`, `farmer`, `student`, `outdoor_worker`, `commuter`, and related worker/event profiles. Current consensus reports one configured source (`Open-Meteo`); IMD/GFS/WRF/satellite data are not claimed until configured.

Additional decision endpoints include `GET /decision/risk`, `GET /decision/timeline`, and `POST /decision/changes`. Citizen-report foundations are available through `POST /reports` and `GET /reports/nearby`; reports are explicitly unverified and are not official warnings.

## First-launch location and language

On first launch, Flutter asks for location permission, then presents a searchable selector for English plus the 22 Scheduled Languages in the Eighth Schedule. Choosing “Not Now” keeps the app usable with manual locations. The chosen response-language code is stored locally in browser storage and sent to `POST /chat`; it is also saved through `PUT /profile` when the backend is reachable. GPS is never used to silently choose a language. The settings gear opens the same selector, and changing it affects only future answers—not existing messages. Unsupported language codes are rejected by chat, profile, and voice synthesis validation.

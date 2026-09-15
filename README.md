# WeatherGPT

WeatherGPT is a conversational weather and route-safety assistant for India. It combines live forecast data, route geometry, deterministic risk scoring, official disaster feeds, nearby-place search, multilingual chat, and voice interaction in one mobile-first interface.

> WeatherGPT is decision support, not an emergency service. Always follow instructions from local authorities and emergency services.

## Live project

- **Web app:** [weathergpt.sakshamgautam10230.workers.dev](https://weathergpt.sakshamgautam10230.workers.dev/)
- **API:** [weathergpt-bjhy.onrender.com](https://weathergpt-bjhy.onrender.com)
- **Interactive API docs:** [Swagger UI](https://weathergpt-bjhy.onrender.com/docs)
- **Repository:** [github.com/sk91-byte/weathergpt](https://github.com/sk91-byte/weathergpt)

## What it does

- **Live weather:** Current conditions, hourly forecasts, seven-day forecasts, rain probability, wind, humidity, visibility, and air-quality data.
- **AI weather chat:** Gemini/Groq can interpret questions and explain results, while the backend keeps provider data as the source of truth.
- **Route intelligence:** Origin-to-destination routing through OSRM, route geometry, weather sampling along the route, risk scoring, route alternatives, and departure-time suggestions.
- **Live map:** Route display, weather/risk overlays, saved places, reverse-trip support, and nearby places around the complete route.
- **Disaster News:** Official alert feed integration through NDMA SACHET RSS/CAP and optional IMD API adapters, with source links and location-aware filtering.
- **IMD briefing pipeline:** Optional official IMD YouTube discovery, transcript extraction, timestamp matching, and Gemini-generated location summaries through `POST /get-weather-briefing`.
- **Multilingual interaction:** Text responses support the app’s Indian-language catalogue. Gemini TTS is used where supported; installed device/browser voices provide the fallback for other languages.
- **Profiles and preferences:** Saved location, response language, role, travel preferences, saved routes, and alert context.
- **Nearby places:** Provider-backed restaurants, cafes, shops, petrol pumps, hospitals, and shelters when `GEOAPIFY_API_KEY` is configured.

## Architecture

```text
React + Vite + Tailwind + Leaflet
          │
          │ HTTPS JSON
          ▼
FastAPI backend
  ├── chat / decision intelligence ── Gemini or Groq (optional)
  ├── weather ────────────────────── Open-Meteo, optional IMD/WeatherAPI
  ├── routes ──────────────────────── OSRM or configured routing provider
  ├── alerts ──────────────────────── NDMA SACHET RSS/CAP + optional IMD API
  ├── locations ───────────────────── Nominatim geocoding
  ├── nearby places ───────────────── Geoapify (optional)
  ├── voice ───────────────────────── Gemini STT/TTS + browser fallback
  └── persistence ─────────────────── JSON for development or PostgreSQL/PostGIS
```

The production web frontend is hosted on Cloudflare Workers. The FastAPI API is hosted on Render. The frontend defaults to the deployed Render API and can be pointed at another API with `VITE_BACKEND_BASE_URL`.

## Data sources and credibility

| Capability | Source | Authentication | Behaviour when unavailable |
|---|---|---|---|
| Weather and forecast | [Open-Meteo](https://open-meteo.com/) | Public API | Returns a provider error; no fake values are generated |
| Route geometry | [OSRM](https://project-osrm.org/) | Public demo endpoint by default | Route is reported unavailable |
| Official disaster alerts | [NDMA SACHET](https://sachet.ndma.gov.in/) RSS/CAP | Public feed by default | The UI says the official feed is unavailable or no alert was found |
| IMD alerts/weather | [IMD](https://mausam.imd.gov.in/) adapters | IMD credentials/IP approval may be required | SACHET/Open-Meteo sources remain separate and labelled |
| AI explanation | Gemini and optional Groq | API key | Deterministic/local fallback is used where implemented |
| IMD video briefing | Official [IMD YouTube](https://www.youtube.com/@Indiametdept) channel | YouTube key is optional depending on discovery mode | Briefing is reported unavailable rather than presented as current |
| Nearby places | Geoapify | `GEOAPIFY_API_KEY` | Search remains unavailable and is labelled |

The application marks provider-backed responses with source and live metadata. A test alert endpoint exists for development and is explicitly marked as demo data; it must not be treated as an official warning.

## Repository layout

```text
backend/                  FastAPI application, providers, services, tests
frontend/                 React/Vite web application and Capacitor Android shell
alembic/                  PostgreSQL/PostGIS migrations
API.md                    Endpoint and data-contract notes
ARCHITECTURE.md           System design summary
render.yaml               Optional Render Blueprint for the API
Dockerfile                Container image for the FastAPI service
docker-compose.yml        Local API + PostGIS stack
```

## Run locally

### Backend

Python 3.10+ is required.

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
python -m uvicorn backend.main:app --reload
```

The API is available at `http://127.0.0.1:8000` and Swagger at `http://127.0.0.1:8000/docs`.

### Frontend

Node.js 18+ is recommended.

```powershell
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` when using a local API:

```text
VITE_BACKEND_BASE_URL=http://127.0.0.1:8000
```

### Tests and production build

```powershell
python -m pytest backend\tests
cd frontend
npm run lint
npm run build:web
```

## Configuration

Copy `backend/.env.example` to `backend/.env` locally. The most important production variables are:

```text
GEMINI_API_KEY=                 # optional AI, STT and Gemini TTS
GEMINI_MODEL=gemini-3.5-flash
GROQ_API_KEY=                   # optional alternative/fallback LLM
IMD_ENABLED=true
IMD_API_KEY=                    # only when IMD access is approved
SACHET_ALERTS_ENABLED=true
SACHET_ALERTS_URL=https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml
GEOAPIFY_API_KEY=               # optional nearby-place search
DATABASE_URL=                   # optional PostgreSQL/PostGIS
STORAGE_MODE=json               # json for local development, postgres in production
CORS_ALLOWED_ORIGINS=https://weathergpt.sakshamgautam10230.workers.dev
```

Never commit `.env`, API keys, database passwords, raw audio, or user location history. Configure secrets in Render/Cloudflare rather than placing them in frontend source code.

## Useful API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Service and provider health |
| `GET /weather/current` | Current weather at coordinates |
| `GET /weather/forecast` | Forecast at coordinates |
| `POST /chat` | Conversational weather answer |
| `POST /route` | Resolve and calculate a route |
| `POST /route/weather` | Weather and risk along a route |
| `POST /route/best-time` | Departure-time comparison |
| `GET /alerts` | Official alert feed items |
| `GET /alerts/nearby` | Alerts near coordinates |
| `GET /alerts/status` | Configured official providers |
| `GET /voice/health` | Voice provider and language status |
| `POST /voice/synthesize` | Generate speech audio |
| `POST /get-weather-briefing` | IMD video/transcript briefing |
| `GET /profile` / `PUT /profile` | User preferences |

See [API.md](API.md) for request and response details.

## Deployment

### Render API

The repository includes `render.yaml` for a Render Blueprint. The manual settings are:

```text
Build command: pip install -r backend/requirements.txt
Start command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
Health check: /health
```

Pushes to the connected branch redeploy the service when Render auto-deploy is enabled.

### Cloudflare frontend

From the repository root after configuring Wrangler authentication:

```powershell
cd frontend
npm run build:web
cd ..
npx wrangler deploy --config wrangler.jsonc
```

For a normal release, run tests and build first, then commit and push:

```powershell
git add .
git commit -m "Describe the change"
git push origin main
```

## Known limitations

- IMD API access is not automatically granted; it may require credentials and IP allowlisting.
- NDMA SACHET alerts are authoritative feed items, but geographic precision depends on the source alert’s affected-area metadata.
- Gemini does not guarantee native TTS for every language in the app catalogue; the UI uses installed browser/device voices as fallback.
- The default OSRM and Nominatim endpoints are public services and should be replaced or rate-limited for high-volume production traffic.
- User authentication, account isolation, and a production multi-user data-retention policy still need to be added before handling sensitive user data at scale.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Security reports should follow [SECURITY.md](SECURITY.md).

## License

This project is released under the [MIT License](LICENSE).

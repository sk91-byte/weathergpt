# 🌦️ WeatherGPT

### Conversational Weather Intelligence, Route Safety & Official Disaster Awareness for India

[![Live Web App](https://img.shields.io/badge/Live%20Web%20App-Open-2563eb?style=for-the-badge)](https://weathergpt.sakshamgautam10230.workers.dev/)
[![API Docs](https://img.shields.io/badge/FastAPI-Docs-059669?style=for-the-badge&logo=fastapi)](https://weathergpt-bjhy.onrender.com/docs)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776ab?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-Vite-61dafb?style=flat-square&logo=react&logoColor=111827)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

WeatherGPT is a mobile-first weather intelligence platform that converts live meteorological data into understandable, location-specific decisions. Users can ask questions by text or voice, inspect weather on an interactive map, plan a route, view risk along the complete route, discover nearby places, and check official disaster-alert sources.

> **Safety notice:** WeatherGPT is decision support, not an emergency service. In a dangerous situation, follow official government and emergency-service instructions first.

## 📌 Table of contents

- [Why WeatherGPT](#-why-weathergpt)
- [What is implemented](#-what-is-implemented)
- [Core features](#-core-features)
- [Data credibility and source policy](#-data-credibility-and-source-policy)
- [System architecture](#-system-architecture)
- [Project structure](#-project-structure)
- [Quick start](#-quick-start)
- [Environment configuration](#-environment-configuration)
- [API overview](#-api-overview)
- [Production deployment](#-production-deployment)
- [Testing](#-testing)
- [Security and privacy](#-security-and-privacy)
- [Known limitations](#-known-limitations)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Why WeatherGPT

Weather information is available through many separate services, but users still have to interpret technical forecasts, route conditions, local disaster warnings, regional-language information, and whether an AI answer is based on real data or a guess.

WeatherGPT brings these pieces into one workflow:

~~~text
User question or route
          ↓
Location and route context
          ↓
Live provider data
          ↓
Deterministic risk and alert checks
          ↓
AI explanation in the selected language
          ↓
Clear recommendation with source context
~~~

The central design rule is:

> **AI explains retrieved data; it does not invent weather values, coordinates, or official warnings.**

## ✅ What is implemented

This repository is a working full-stack application, not only a UI mockup.

| Area | Current implementation |
|---|---|
| Web interface | React, Vite, Tailwind CSS, Leaflet, PWA support |
| Backend | FastAPI with modular API routers and provider services |
| Live weather | Open-Meteo current, hourly, forecast, and historical data |
| AI | Gemini integration with optional Groq fallback/configuration |
| Routes | OSRM route geometry, alternatives, route weather sampling, risk scoring |
| Official alerts | NDMA SACHET RSS/CAP integration plus optional IMD adapters |
| Voice | Gemini audio services where supported, browser/device voice fallback |
| Persistence | JSON development storage or PostgreSQL/PostGIS configuration |
| Deployments | Cloudflare Workers frontend and Render backend |
| Testing | Pytest backend suite and TypeScript production build checks |

## 🚀 Core features

### 1. Live weather dashboard

The home dashboard provides:

- current temperature and feels-like temperature;
- humidity, wind, visibility, pressure, UV, rain probability, and AQI;
- hourly and seven-day forecast context;
- readable weather conditions;
- deterministic risk score and risk category;
- explainable recommendations with supporting factors.

Open-Meteo is used as the default live weather provider. The UI displays provider/source metadata and does not silently convert unavailable data into fake values.

### 2. WeatherGPT conversational assistant

Users can ask natural-language questions such as:

~~~text
Will it rain in Delhi today?
Should I travel from Rohini to Sushant University now?
What precautions should I take during a thunderstorm?
क्या आज बारिश होगी?
~~~

The backend parses the request, resolves location context, retrieves weather data, applies deterministic logic, and then asks the configured AI provider to explain the result. If an AI provider is unavailable, the application reports that limitation or uses available loaded data rather than pretending the answer is live.

### 3. Live route intelligence

The Live Map supports:

- current location and destination as separate fields;
- origin/destination reversal for a return trip;
- driving, walking, and cycling modes;
- route geometry and route alternatives;
- weather sampling at points along the complete route;
- rain, wind, thunderstorm, fog, and waterlogging risk;
- route safety score and route explanation;
- best-departure-time comparisons;
- route timeline and weather context;
- nearby places within the configured corridor around route points.

Transit requires a configured transit provider and is not represented as available when the provider is missing.

### 4. Official Disaster News

The Disaster News section is separate from ordinary rain-risk scoring. It is designed to show official alerts and their source links, including:

- earthquake;
- cyclone;
- flood;
- tsunami;
- heavy rain and thunderstorm;
- heatwave;
- dense fog and strong winds.

The backend normalizes official feeds and keeps source, source_url, issued_at, affected_area, and is_demo metadata. Location-aware filtering is applied when the source provides usable geographic information.

### 5. NDMA SACHET and IMD source handling

WeatherGPT can read the public NDMA SACHET RSS/CAP feed and can use optional IMD adapters when IMD credentials or approved access are available.

~~~text
Official provider configured + matching alert → show alert and source link
Official provider configured + no matching alert → show no alert found
Provider unavailable → show source unavailable, not “no disaster exists”
Development test alert → mark explicitly as demo
~~~

This prevents a failed feed request from being misrepresented as a clean safety result.

### 6. Multilingual text and voice

The application includes a 23-language response catalogue. Text answers are sent with the selected language code. Voice uses two layers:

1. Gemini audio/TTS for language codes supported by the configured Gemini TTS model.
2. Browser/device speech synthesis for languages whose voice pack is installed locally.

The voice selector marks Gemini-capable languages with ⭐ and device/browser fallback languages with ◯. A missing device voice is reported clearly so it is not mistaken for a working voice.

### 7. Nearby places around the route

Nearby search can return restaurants, cafes, stores, petrol pumps, hospitals, and sheltered waiting locations. Results are provider-backed and the UI keeps the source status visible. When Geoapify is not configured, the application explains that the live search is unavailable instead of showing fabricated places.

### 8. Profiles and preferences

The profile area stores user preferences such as:

- selected response language;
- preferred role, including traveller, farmer, commuter, or general public;
- saved location context;
- saved places and routes;
- notification and trip preferences.

The default JSON store is suitable for local development. PostgreSQL/PostGIS should be used for a real multi-user deployment with authentication and data-retention controls.

## 🏗️ System architecture

~~~mermaid
flowchart TB
    User[User: web or Android shell]
    UI[React + Vite + Tailwind + Leaflet]
    API[FastAPI API]
    Decision[Deterministic risk and decision engine]
    AI[Gemini / Groq explanation layer]
    Weather[Open-Meteo and optional IMD weather adapters]
    Route[OSRM or configured routing provider]
    Alerts[NDMA SACHET RSS/CAP and optional official alert adapters]
    Places[Nominatim / Geoapify places]
    Voice[Gemini voice + browser/device fallback]
    Store[JSON or PostgreSQL/PostGIS]

    User --> UI
    UI <--> API
    API --> Weather
    API --> Route
    API --> Alerts
    API --> Places
    API --> Voice
    API --> Decision
    Decision --> AI
    API --> Store
~~~

| Layer | Responsibility |
|---|---|
| Provider services | Retrieve and normalize external data |
| Decision engine | Calculate transparent risk and recommendation fields |
| AI layer | Explain retrieved context, translate, and summarize |
| UI | Show source, status, uncertainty, and practical actions |

## 📂 Project structure

~~~text
WeatherGPT/
├── README.md
├── API.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── render.yaml
├── wrangler.jsonc
├── worker.js
├── Dockerfile
├── docker-compose.yml
├── alembic/                    PostgreSQL/PostGIS migrations
├── backend/
│   ├── main.py                 FastAPI application entrypoint
│   ├── config.py               Environment-based configuration
│   ├── api/                    HTTP routers
│   ├── services/               Provider adapters and decision logic
│   ├── models/                 SQLAlchemy/Pydantic models
│   ├── repositories/           Persistence access
│   ├── database/               Database setup
│   ├── tests/                  Backend tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/                    React screens, services, map, and utilities
│   ├── public/                 PWA icons and static assets
│   ├── android/                Capacitor Android project
│   ├── package.json
│   └── .env.example
└── mobile/                     Flutter client scaffold and native project
~~~

## ⚡ Quick start

### Prerequisites

- Python 3.10 or newer;
- Node.js 18 or newer;
- Git;
- optional Docker Desktop for PostgreSQL/PostGIS;
- optional Flutter SDK for the mobile client.

### 1. Clone the repository

~~~powershell
git clone https://github.com/sk91-byte/weathergpt.git
cd weathergpt
~~~

### 2. Start the FastAPI backend

~~~powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
python -m uvicorn backend.main:app --reload
~~~

Backend URLs:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
- Health: http://127.0.0.1:8000/health

### 3. Start the React frontend

Open another terminal:

~~~powershell
cd frontend
npm install
~~~

Create frontend/.env.local for the local API:

~~~text
VITE_BACKEND_BASE_URL=http://127.0.0.1:8000
~~~

Run the development server:

~~~powershell
npm run dev
~~~

### 4. Run the full local stack with Docker

After creating backend/.env:

~~~powershell
docker compose up --build
~~~

This starts the API and PostgreSQL/PostGIS services. Use docker compose down to stop them. The database volume is retained unless deliberately removed.

## 🔧 Environment configuration

Copy backend/.env.example to backend/.env. Keep all secrets on the backend.

| Variable | Required | Purpose |
|---|---:|---|
| GEMINI_API_KEY | Optional | Gemini chat, transcription, and TTS |
| GEMINI_MODEL | Optional | Gemini text model selection |
| GROQ_API_KEY | Optional | Groq LLM fallback/alternative |
| GROQ_MODELS | Optional | Ordered Groq model fallback list |
| IMD_ENABLED | Optional | Enable IMD adapter attempts |
| IMD_API_KEY | Optional | IMD access where credentials are approved |
| SACHET_ALERTS_ENABLED | Optional | Enable NDMA SACHET RSS/CAP ingestion |
| SACHET_ALERTS_URL | Optional | SACHET feed URL |
| GEOAPIFY_API_KEY | Optional | Live nearby-place search |
| ROUTING_PROVIDER | No | Defaults to osrm |
| ROUTING_PROVIDER_URL | No | Routing service base URL |
| DATABASE_URL | Optional | PostgreSQL/PostGIS connection |
| STORAGE_MODE | No | json locally or postgres for database storage |
| CORS_ALLOWED_ORIGINS | Recommended | Allowed frontend origins |

Example frontend configuration:

~~~text
VITE_BACKEND_BASE_URL=https://weathergpt-bjhy.onrender.com
~~~

Never commit .env files, API keys, database passwords, raw audio, or private user data.

## 📡 API overview

### Weather and chat

~~~text
GET  /health
GET  /weather/current
GET  /weather/forecast
POST /chat
GET  /location/reverse
GET  /languages
~~~

### Route intelligence

~~~text
POST /route
POST /route/resolve
POST /route/weather
POST /route/best-time
GET  /route/{route_id}/explanation
~~~

### Alerts and Disaster News

~~~text
GET  /alerts
GET  /alerts/nearby
GET  /alerts/status
GET  /alerts/{alert_id}
POST /alerts/test                  development-only, explicitly demo
~~~

### Voice

~~~text
GET  /voice/health
POST /voice/transcribe
POST /voice/synthesize
POST /voice/chat
~~~

### Profile, climate, maps, and reports

~~~text
GET   /profile
PUT   /profile
PATCH /profile
GET   /climate/summary
GET   /climate/temperature-trend
GET   /climate/rainfall-trend
GET   /map/weather
POST  /reports
GET   /reports/nearby
~~~

Full request and response notes are available in [API.md](API.md), and interactive OpenAPI documentation is available at /docs when the API is running.

## 🌐 Data sources and credibility policy

| Capability | Source | Status and notes |
|---|---|---|
| Forecast weather | [Open-Meteo](https://open-meteo.com/) | Public provider used by default |
| Routing | [OSRM](https://project-osrm.org/) | Public endpoint by default; replace/rate-limit for scale |
| Geocoding | [Nominatim](https://nominatim.org/) | Public provider with rate limits |
| Official alerts | [NDMA SACHET](https://sachet.ndma.gov.in/) | RSS/CAP feed integration |
| Indian meteorology | [IMD](https://mausam.imd.gov.in/) | Optional adapters; credentials/IP approval may be required |
| AI explanation | Google Gemini / Groq | Optional API credentials |
| Nearby places | Geoapify | Optional API credential |

The backend preserves provider status. A timeout, missing key, or blocked provider is shown as unavailable. It is not converted into a false “all clear” result. Test alerts are marked with is_demo: true and are filtered from normal user-facing official-alert lists.

## 🚢 Production deployment

### Render backend

The repository includes [render.yaml](render.yaml). Manual Render settings are:

~~~text
Build command: pip install -r backend/requirements.txt
Start command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
Health check: /health
~~~

Set production secrets in Render Environment Variables. Do not put them in the frontend.

### Cloudflare frontend

~~~powershell
cd frontend
npm run build:web
cd ..
npx wrangler deploy --config wrangler.jsonc
~~~

### Release workflow

~~~powershell
python -m pytest backend\tests
cd frontend
npm run lint
npm run build:web
cd ..

git add README.md API.md ARCHITECTURE.md backend\README.md frontend\README.md .gitignore CONTRIBUTING.md LICENSE SECURITY.md render.yaml worker.js wrangler.jsonc
git commit -m "Describe the release"
git push origin main
npx wrangler deploy --config wrangler.jsonc
~~~

Render redeploys automatically after the push when the repository is connected with auto-deploy enabled. Cloudflare deployment remains an explicit Wrangler step.

## 🧪 Testing and quality checks

Backend tests:

~~~powershell
python -m pytest backend\tests
~~~

Frontend type checking and production build:

~~~powershell
cd frontend
npm run lint
npm run build:web
~~~

Important failure cases to verify before a release:

- provider timeout or rate limit;
- missing Gemini, Groq, IMD, or Geoapify key;
- location permission denial;
- invalid coordinates and route endpoints;
- no official alert versus unavailable alert feed;
- no installed browser voice for the selected language;
- mobile-width layout and long translated text;
- route with no transit provider;
- nearby search results outside the configured corridor.

## 🔐 Security and privacy

- API keys are read from backend environment variables.
- Frontend builds must not contain Gemini, Groq, IMD, or Geoapify secrets.
- Voice audio is processed in memory by the voice endpoints and is not intentionally persisted.
- Precise GPS data is used for the requested weather/route operation and should not be treated as a public identifier.
- The current public deployment does not yet provide full authentication and account isolation.
- Do not use the default JSON store for a sensitive multi-user production deployment.

Read [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## ⚠️ Known limitations

- IMD API access can require registration, credentials, or IP allowlisting.
- SACHET geographic precision depends on the affected-area metadata supplied by each official alert.
- Gemini TTS does not guarantee native audio for every language in the catalogue; device/browser voice packs are used as fallback.
- OSRM and Nominatim public endpoints are not intended for unrestricted high-volume traffic.
- Citizen reports are user-generated and unverified; they are not official warnings.
- AI explanations should not replace official emergency advisories or professional agricultural advice.

## 🗺️ Roadmap

- Add authenticated multi-user accounts and stronger data isolation.
- Add a managed production cache and background alert refresh jobs.
- Expand official IMD adapter coverage after access requirements are fulfilled.
- Add richer alert geography and state/district boundary matching.
- Improve route segmentation for long-distance journeys and corridor-based nearby search.
- Add native voice-provider coverage for languages without an installed browser voice.
- Add notification preferences and opt-in push alerts.
- Add deployment health dashboards and provider freshness monitoring.

## 🤝 Contributing

Contributions are welcome. Before opening a pull request:

1. Create a focused branch.
2. Run backend tests and frontend lint/build checks.
3. Update documentation for new providers, environment variables, or endpoints.
4. Include screenshots for UI changes.
5. Preserve source metadata and never fabricate provider data.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project workflow.

## 📄 License

Distributed under the [MIT License](LICENSE).

## 🌍 Project vision

> **Make weather intelligence understandable, accessible, source-aware, and actionable for everyone.**

WeatherGPT — ask the weather, understand the risk, and make better decisions.

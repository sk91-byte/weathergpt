# WeatherGPT architecture

```text
React/Vite web client + Capacitor Android shell
  ├── device GPS, map, chat, alerts, voice ──┐
  └── selected response language              │
                                             v
FastAPI API layer
  ├── /chat ─> LLM understanding ─> location ─> weather data ─> LLM wording
  ├── /weather ─> Open-Meteo forecast API
  ├── /location ─> Nominatim reverse geocoder
  ├── /alerts ─> NDMA SACHET RSS/CAP + optional IMD/official adapters
  ├── /climate ─> HistoricalWeatherProvider ─> Open-Meteo archive
  ├── /route ─> OSRM/configured routing + sampled route weather/risk
  ├── /places ─> Nominatim/Geoapify provider adapters
  ├── /voice ─> Gemini STT/TTS + browser/device fallback
  └── /nwp ─> GFS/WRF adapters (unavailable until configured)
```

The LLM explains provider data but never supplies weather values, coordinates, official warnings, or statistical calculations. Alert responses preserve their source and demo status. No precise location history is intentionally stored by the weather and route services.

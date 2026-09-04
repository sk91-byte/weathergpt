# WeatherGPT architecture

```text
Flutter/mobile client
  ├── device GPS ───────────────┐
  └── chat, maps, alerts, voice  │
                                 v
FastAPI API layer
  ├── /chat ─> LLM understanding ─> location ─> weather data ─> LLM wording
  ├── /weather ─> Open-Meteo forecast API
  ├── /location ─> Nominatim reverse geocoder
  ├── /alerts ─> AlertProvider (official adapter or clearly marked mock)
  ├── /climate ─> HistoricalWeatherProvider ─> Open-Meteo archive
  ├── /map ─> GeoJSON weather features
  ├── /voice ─> VoiceProvider (mock until configured)
  └── /nwp ─> GFS/WRF adapters (unavailable until configured)
```

The LLM explains data but never supplies weather values, coordinates, official warnings, or statistical calculations. No precise location history is stored.

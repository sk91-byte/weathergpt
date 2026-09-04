# WeatherGPT API

Core endpoints: `GET /`, `GET /health`, `GET /weather/current`, `GET /weather/forecast`, `POST /chat`, and `GET /location/reverse`.

Platform endpoints: `GET /alerts`, `GET /alerts/nearby`, `GET /alerts/{alert_id}`, `POST /alerts/test`, `GET /climate/history`, `GET /climate/summary`, `GET /climate/temperature-trend`, `GET /climate/rainfall-trend`, `GET /map/weather`, `POST /voice/transcribe`, `POST /voice/synthesize`, `POST /voice/chat`, `GET /voice/health`, and `GET /nwp/status`.

Decision Intelligence endpoints: `POST /decision/analyze`, `POST /decision/advice`, `GET /decision/risk`, `GET /decision/timeline`, `POST /decision/changes`, `GET /decision/{decision_id}`, and `GET /decision/{decision_id}/explanation`. Citizen-report foundation endpoints: `POST /reports`, `GET /reports/nearby`, and `GET /reports/nearby/summary`.

Language endpoints: `GET /languages`, `GET /profile`, `PUT /profile`, and `PATCH /profile`. WeatherGPT offers English plus the 22 Scheduled Languages in the Eighth Schedule. Language is a user choice separate from location; GPS may provide local weather but never silently selects a response language.

Decision scores are deterministic calculations from available weather inputs. `decision confidence` is an estimate of input completeness and forecast reliability, not a calibrated probability. Only configured providers are reported as data sources.

Use `/docs` for interactive OpenAPI documentation. Responses identify live data with `data_source`/`is_demo` where applicable. Alerts are not official until an authoritative provider is connected; voice reports provider availability through `/voice/health`.

## Real voice

Set `VOICE_PROVIDER=gemini` and use the existing `GEMINI_API_KEY` on the backend. Never place the key in Flutter. Native builds use Gemini audio understanding for transcription and Gemini 2.5 Flash Preview TTS for speech generation. The Flutter web preview uses Chrome speech recognition so the transcript is visible and is then sent through the normal `/chat` pipeline; it also uses the browser's selected-language speech synthesis for an immediate spoken reply. Voice currently verifies English (`en`) and Hindi (`hi`); other application languages are provider-dependent and not claimed as voice-supported. `POST /voice/transcribe` accepts WAV, MP3, M4A, WebM, or OGG up to 10 MB. `POST /voice/synthesize` returns base64 WAV audio because Gemini TTS returns PCM. `POST /voice/chat` transcribes audio, calls the existing chat/decision pipeline, and returns the text response plus WAV audio. `GET /voice/health` reports safe configuration status. Raw audio is held in memory and discarded; only normal text conversation messages may be stored.

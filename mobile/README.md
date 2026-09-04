# WeatherGPT mobile scaffold

This Flutter client provides the home/chat flow, device GPS, and voice questions. In the web preview, Chrome transcribes the microphone input into visible text, submits it to `POST /chat`, and reads the localized reply aloud with the browser speech engine. Native builds use the Gemini-backed `/voice/chat` flow. Set `backendBaseUrl` in `lib/config/api_config.dart` for your device or emulator; keep API keys on the backend only.

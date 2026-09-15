# Contributing to WeatherGPT

Thanks for helping improve WeatherGPT.

## Before you start

- Do not commit API keys, `.env` files, personal location data, generated bundles, or database dumps.
- Check whether the change affects both the React frontend and the FastAPI API.
- For provider changes, document the provider, authentication requirements, rate limits, and fallback behaviour.
- Official alerts and weather values must remain labelled by source; do not replace an unavailable provider with fabricated values.

## Development workflow

```powershell
python -m pytest backend\tests
cd frontend
npm run lint
npm run build:web
```

Use a focused branch and a descriptive commit message. Pull requests should explain:

1. What changed and why.
2. Which screens or endpoints were affected.
3. How the change was tested.
4. Any new environment variables or external services.

## Pull requests

Keep changes focused, update the relevant documentation, and include screenshots for visible UI changes. Do not claim a provider is live unless the response contains verifiable provider/source metadata.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# WeatherGPT web frontend

This is the polished React interface supplied by the team. It keeps the existing
FastAPI backend and uses `VITE_BACKEND_BASE_URL` for live weather, GPS, and chat.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/69783ca9-7334-4083-a193-43423d815a57

## Run locally

**Prerequisites:**  Node.js


1. Install dependencies: `npm install`
2. Run the frontend: `npm run dev`

For a static Cloudflare upload:

```text
npm run build:web
```

Upload the contents of `dist/` (or a ZIP whose root contains `index.html`) to
Cloudflare Pages. The live API defaults to:
`https://weathergpt-bjhy.onrender.com`.

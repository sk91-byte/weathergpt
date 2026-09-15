<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# WeatherGPT web frontend

This is the React/Vite/Tailwind web client for WeatherGPT. It connects to the
FastAPI backend for live weather, route intelligence, official alerts, nearby
places, profile preferences, chat, and voice.

This contains everything you need to run your app locally.

## Run locally

**Prerequisites:**  Node.js


1. Install dependencies: `npm install`
2. Run the frontend: `npm run dev`

For a static Cloudflare Workers upload:

```text
npm run build:web
```

Upload the contents of `dist/` (or a ZIP whose root contains `index.html`) to
Cloudflare Workers. The live API defaults to:
`https://weathergpt-bjhy.onrender.com`.

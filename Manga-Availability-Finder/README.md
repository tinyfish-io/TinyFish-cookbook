# Manga Availability Finder

A React app that checks whether a manga or webtoon title appears on several reading sites at once. It uses **TinyFish Agent** for browser automation (with a live stream preview per site) and optionally **Google Gemini** to suggest site URLs.

## How it works

1. You enter a title.
2. **Discovery** — `POST /api/discover-manga-sites` returns a list of site search URLs (Gemini if `GEMINI_API_KEY` is set, otherwise a fixed fallback list).
3. **Parallel checks** — For each URL, `POST /api/search-manga` runs TinyFish Agent and streams **SSE** events back to the UI (`stream` → live iframe URL, `complete` → found/not found).

Architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Prerequisites

- Node.js 18+

## Setup

```bash
cd Manga-Availability-Finder
npm install
cp .env.example .env.local
# Edit .env.local: set TINYFISH_API_KEY (required for searches). Optionally set GEMINI_API_KEY.
```

The local API (`server/index.mjs`) loads `.env.local` and `.env` via `dotenv` when present.

## Run (app + API)

```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173) (Vite; proxies `/api` to the API)
- **API:** [http://localhost:8787](http://localhost:8787) by default (`PORT` overrides)

Scripts:

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite + local API (concurrently) |
| `npm run dev:web` | Vite only |
| `npm run dev:api` | API only |
| `npm run build` | Production build (frontend) |
| `npm run preview` | Preview production build |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TINYFISH_API_KEY` | Yes for searches | From [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
| `GEMINI_API_KEY` | No | Improves site discovery; without it, built-in fallback URLs are used |
| `PORT` | No | API port (default `8787`) |

## Tech stack

- **UI:** React, TypeScript, Tailwind CSS, Vite
- **API:** Express, `@tiny-fish/sdk` (TinyFish Agent streaming)
- **Streaming:** Server-Sent Events (SSE) to the browser

## Demo

Optional live demo link (replace if you host elsewhere): [webtoonhunter.lovable.app](https://webtoonhunter.lovable.app)

## License

MIT

# ★ awesome.dev — Aggregator

> Aggregate GitHub Awesome-* lists in parallel using TinyFish AI agents

Live Link - https://awesomeaggregator.vercel.app/ 

## What it does

Enter a topic (e.g. `machine-learning`, `react`, `rust`) and TinyFish agents scrape 5–10 GitHub Awesome repos **simultaneously**, returning a unified, deduplicated, searchable resource directory.

### Features
- **Parallel TinyFish agents** — one per repo, running at the same time
- **Directory-style UI** — categories → subcategories → resources (not a grid)
- **Results stream in** as each agent completes
- **Quality scoring** (1–10) based on repo stars + description richness
- **Deduplication** across repos
- **Sort** by quality, stars, or A–Z
- **Filter** resources inline
- **Compare** up to 5 resources side-by-side
- **Export** to JSON or CSV

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/awesome-aggregator
cd awesome-aggregator
npm install
```

### 2. Add your TinyFish API key

```bash
cp .env.example .env.local
# Edit .env.local and add your key:
# TINYFISH_API_KEY=sk-mino-your-key-here
```

### 3. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel
# Add TINYFISH_API_KEY as environment variable in Vercel dashboard
```

## Architecture

```
User Input (topic)
  ↓
Next.js Frontend (React)
  ↓
/api/tinyfish (Next.js API Route — server-side proxy)
  ↓
TinyFish / Mino API (parallel agents, SSE streaming)
  ↓
GitHub Awesome-* READMEs
  ↓
Parsed JSON → Unified Directory UI
```

The API route at `src/app/api/tinyfish/route.ts` acts as a **server-side proxy** — this is what allows the browser to call TinyFish without CORS issues.

## Environment Variables

| Variable | Description |
|---|---|
| `TINYFISH_API_KEY` | Your TinyFish/Mino API key |

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **TinyFish** browser automation API
- **Vercel** for deployment
